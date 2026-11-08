// Outbound requests: one User-Agent, a timeout per try, retries, and backing off when a host answers 429.
import { PROBE, USER_AGENT } from './config.ts';

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface Deps {
  fetch: FetchFn;
  now: () => number;
  /** Sleep between retries; tests pass a no-op. */
  sleep: (ms: number) => Promise<void>;
  /** Hosts we must not call until the given epoch ms (filled from 429 responses, persisted by the runner). */
  backoff: Map<string, number>;
}

export const liveDeps = (backoff = new Map<string, number>()): Deps => ({
  fetch: (i, init) => fetch(i, init),
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  backoff,
});

export type FailKind = 'network' | 'timeout' | 'http' | 'body' | 'ratelimited' | 'backoff';

export class ProbeError extends Error {
  kind: FailKind;
  httpStatus?: number;
  attempts: number;
  constructor(kind: FailKind, message: string, httpStatus?: number, attempts = 1) {
    super(message);
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.attempts = attempts;
  }
  /** Failures that say nothing about the remote service: we were throttled or chose not to call. */
  get isOurs() {
    return this.kind === 'ratelimited' || this.kind === 'backoff';
  }
}

export interface Timed<T> {
  value: T;
  ms: number;
  attempts: number;
}

/** One try: fetch, time it, read the body. Throws ProbeError. */
async function once(deps: Deps, url: string, init: RequestInit, timeoutMs: number): Promise<{ res: Response; text: string; ms: number }> {
  const host = new URL(url).host;
  const until = deps.backoff.get(host);
  if (until && until > deps.now()) throw new ProbeError('backoff', `backing off ${host} until ${new Date(until).toISOString()}`);
  const t0 = deps.now();
  let res: Response;
  try {
    res = await deps.fetch(url, {
      ...init,
      headers: { 'user-agent': USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === 'TimeoutError' || name === 'AbortError') throw new ProbeError('timeout', `no answer within ${timeoutMs / 1000} s`);
    throw new ProbeError('network', `request failed: ${(e as Error)?.message ?? e}`);
  }
  const text = await res.text().catch(() => '');
  const ms = deps.now() - t0;
  if (res.status === 429) {
    const ra = Number(res.headers.get('retry-after'));
    deps.backoff.set(host, deps.now() + (Number.isFinite(ra) && ra > 0 ? ra * 1000 : 120_000));
    throw new ProbeError('ratelimited', `${host} answered 429 Too Many Requests`, 429);
  }
  if (!res.ok) throw new ProbeError('http', `HTTP ${res.status}`, res.status);
  return { res, text, ms };
}

/**
 * Up to `tries` attempts. `parse` validates the body and throws (any error) when the answer is unusable, which
 * counts as a failed try. Rate limiting and backoff are not retried.
 */
export async function probe<T>(
  deps: Deps,
  url: string,
  init: RequestInit,
  parse: (text: string, res: Response) => T,
  opts: { tries?: number; timeoutMs?: number } = {},
): Promise<Timed<T>> {
  const tries = opts.tries ?? PROBE.tries;
  let last: ProbeError | undefined;
  for (let i = 1; i <= tries; i++) {
    try {
      const { res, text, ms } = await once(deps, url, init, opts.timeoutMs ?? PROBE.timeoutMs);
      try {
        return { value: parse(text, res), ms, attempts: i };
      } catch (e) {
        throw e instanceof ProbeError ? e : new ProbeError('body', `unexpected answer: ${(e as Error)?.message ?? e}`, res.status);
      }
    } catch (e) {
      last = e instanceof ProbeError ? e : new ProbeError('network', String(e));
      last.attempts = i;
      if (last.isOurs) throw last;
      if (i < tries) await deps.sleep(500 * i);
    }
  }
  throw last!;
}
