// Webhook subscriptions. Anyone can register an https URL, but only an endpoint that echoes a one-time challenge is
// stored, so nobody can sign up someone else's URL. Incident and redeploy events are then POSTed to it, signed with the
// subscriber's secret over a timestamp and the body (replay-safe). Deliveries go through an outbox so a slow receiver
// never delays the checks.
import { USER_AGENT } from './config.ts';
import type { Deps } from './http.ts';

export const MAX_SUBSCRIBERS = 150;
/** Sign-up attempts per IP address per day. Each attempt makes us send a challenge, so failed ones count too. */
export const MAX_ATTEMPTS_PER_IP_PER_DAY = 10;
const CHALLENGE_TIMEOUT_MS = 5000;
// 25 a run keeps a run under the free plan's 50 outbound requests (the checks use about 10-15): 150 subscribers in 6 minutes.
const DELIVER_PER_RUN = 25;
const MAX_ATTEMPTS = 5;
const DISABLE_AFTER_FAILURES = 5;

export function enqueueWebhook(db: D1Database, type: string, data: Record<string, unknown>, ts: number): D1PreparedStatement {
  const payload = JSON.stringify({ type, created_at: new Date(ts).toISOString(), data, source: 'https://evefrontier.space/status' });
  return db
    .prepare('INSERT INTO deliveries (subscriber, payload, created_at, attempts, next_at) SELECT id, ?, ?, 0, ? FROM subscribers WHERE active = 1')
    .bind(payload, ts, ts);
}

/**
 * Headers for one delivery: X-Status-Signature is sha256=HMAC(secret, "<timestamp>.<body>"), so a captured delivery
 * cannot be replayed later without the receiver noticing the old timestamp. X-Status-Delivery identifies the event.
 */
export async function signedHeaders(secret: string, body: string, nowMs: number, deliveryId: string): Promise<Record<string, string>> {
  const ts = String(Math.floor(nowMs / 1000));
  return {
    'content-type': 'application/json',
    'user-agent': USER_AGENT,
    'x-status-timestamp': ts,
    'x-status-delivery': deliveryId,
    'x-status-signature': await sign(secret, `${ts}.${body}`),
  };
}

/** True when the endpoint answered 2xx and its body contains the challenge (plain text or {"challenge": "..."}). */
export function echoesChallenge(status: number, text: string, challenge: string): boolean {
  return status >= 200 && status < 300 && text.slice(0, 4096).includes(challenge);
}

/** Sends the one-time challenge to a would-be subscriber and reports whether it was echoed back. */
export async function challengeEndpoint(deps: Deps, url: string): Promise<boolean> {
  const challenge = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const body = JSON.stringify({ type: 'subscription.verify', challenge, created_at: new Date(deps.now()).toISOString(), source: 'https://evefrontier.space/status' });
  try {
    const res = await deps.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT },
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(CHALLENGE_TIMEOUT_MS),
    });
    return echoesChallenge(res.status, await res.text().catch(() => ''), challenge);
  } catch {
    return false;
  }
}

export async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return 'sha256=' + [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function deliverWebhooks(db: D1Database, deps: Deps) {
  const now = deps.now();
  const { results } = await db
    .prepare(
      'SELECT d.id, d.payload, d.attempts, s.id AS sid, s.url, s.secret FROM deliveries d JOIN subscribers s ON s.id = d.subscriber WHERE d.next_at <= ? AND s.active = 1 ORDER BY d.next_at LIMIT ?',
    )
    .bind(now, DELIVER_PER_RUN)
    .all<{ id: number; payload: string; attempts: number; sid: string; url: string; secret: string }>();
  if (!results.length) return;
  const delivered: { id: number; sid: string }[] = [];
  const gaveUp: { id: number; sid: string }[] = [];
  const retry = new Map<number, number[]>(); // attempts so far -> delivery ids
  await Promise.all(
    results.map(async (d) => {
      let ok = false;
      try {
        const res = await deps.fetch(d.url, {
          method: 'POST',
          headers: await signedHeaders(d.secret, d.payload, now, `${d.sid}-${d.id}`),
          body: d.payload,
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        ok = res.status >= 200 && res.status < 300;
      } catch {
        ok = false;
      }
      if (ok) delivered.push({ id: d.id, sid: d.sid });
      else if (d.attempts + 1 >= MAX_ATTEMPTS) gaveUp.push({ id: d.id, sid: d.sid });
      else retry.set(d.attempts, [...(retry.get(d.attempts) ?? []), d.id]);
    }),
  );
  // A few grouped statements rather than one or two per delivery: D1 caps the queries a single run may make.
  const inList = (n: number) => Array(n).fill('?').join(',');
  const stmts: D1PreparedStatement[] = [];
  if (delivered.length) {
    stmts.push(
      db.prepare(`DELETE FROM deliveries WHERE id IN (${inList(delivered.length)})`).bind(...delivered.map((x) => x.id)),
      db.prepare(`UPDATE subscribers SET failures = 0 WHERE id IN (${inList(delivered.length)})`).bind(...delivered.map((x) => x.sid)),
    );
  }
  if (gaveUp.length) {
    stmts.push(
      db.prepare(`DELETE FROM deliveries WHERE id IN (${inList(gaveUp.length)})`).bind(...gaveUp.map((x) => x.id)),
      db
        .prepare(`UPDATE subscribers SET failures = failures + 1, active = CASE WHEN failures + 1 >= ? THEN 0 ELSE active END WHERE id IN (${inList(gaveUp.length)})`)
        .bind(DISABLE_AFTER_FAILURES, ...gaveUp.map((x) => x.sid)),
    );
  }
  for (const [attempts, ids] of retry) {
    stmts.push(db.prepare(`UPDATE deliveries SET attempts = attempts + 1, next_at = ? WHERE id IN (${inList(ids.length)})`).bind(now + 2 ** (attempts + 1) * 60_000, ...ids));
  }
  if (stmts.length) await db.batch(stmts);
}

/** Only public https URLs: no IP literals, no localhost, no internal names. */
export function validWebhookUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string' || raw.length > 500) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost') || h === 'localhost') return null;
  if (/^[\d.]+$/.test(h) || h.startsWith('[')) return null;
  return u;
}
