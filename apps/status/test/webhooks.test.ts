import { describe, expect, it } from 'vitest';
import { writeAllowed } from '../worker/guard.ts';
import { challengeEndpoint, echoesChallenge, sign, signedHeaders, validWebhookUrl } from '../worker/webhooks.ts';
import { fakeDeps, jsonRes } from './helpers.ts';

describe('webhook URLs', () => {
  it('accepts public https URLs only', () => {
    expect(validWebhookUrl('https://example.com/hook')).toBeTruthy();
    for (const bad of [
      'http://example.com/hook',
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://[::1]/x',
      'https://printer.local/x',
      'https://db.internal/x',
      'https://intranet/x',
      'https://user:pass@example.com/x',
      'ftp://example.com',
      'not a url',
      42,
    ]) {
      expect(validWebhookUrl(bad), String(bad)).toBeNull();
    }
  });
});

describe('subscription challenge', () => {
  it('passes only when a 2xx response echoes the challenge', () => {
    expect(echoesChallenge(200, '{"challenge":"abc123"}', 'abc123')).toBe(true);
    expect(echoesChallenge(204, 'abc123', 'abc123')).toBe(true);
    expect(echoesChallenge(200, 'ok', 'abc123')).toBe(false);
    expect(echoesChallenge(500, 'abc123', 'abc123')).toBe(false);
    expect(echoesChallenge(302, 'abc123', 'abc123')).toBe(false);
  });

  it('an endpoint that echoes the challenge is accepted', async () => {
    const { deps, calls } = fakeDeps((_url, body) => jsonRes({ challenge: JSON.parse(body).challenge }));
    expect(await challengeEndpoint(deps, 'https://example.com/hook')).toBe(true);
    expect(JSON.parse(calls[0].body).type).toBe('subscription.verify');
  });

  it("someone else's endpoint that just says 200 OK is rejected", async () => {
    const { deps } = fakeDeps(() => new Response('OK', { status: 200 }));
    expect(await challengeEndpoint(deps, 'https://victim.example/api')).toBe(false);
  });

  it('unreachable endpoints are rejected', async () => {
    const { deps } = fakeDeps(() => 'network');
    expect(await challengeEndpoint(deps, 'https://example.com/hook')).toBe(false);
  });
});

describe('delivery signatures', () => {
  it('sign timestamp.body so an old delivery cannot be replayed as new', async () => {
    const body = '{"type":"incident.opened"}';
    const at = Date.parse('2026-11-08T12:00:00Z');
    const h = await signedHeaders('s3cret', body, at, 'abc-1');
    expect(h['x-status-timestamp']).toBe(String(at / 1000));
    expect(h['x-status-delivery']).toBe('abc-1');
    // What a receiver does: recompute over "<timestamp>.<raw body>" with the secret
    expect(h['x-status-signature']).toBe(await sign('s3cret', `${h['x-status-timestamp']}.${body}`));
    // Same body, different time: different signature
    const later = await signedHeaders('s3cret', body, at + 3600_000, 'abc-1');
    expect(later['x-status-signature']).not.toBe(h['x-status-signature']);
  });

  it('matches a known HMAC-SHA256 value', async () => {
    // RFC 4231 test case 2
    expect(await sign('Jefe', 'what do ya want for nothing?')).toBe('sha256=5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
});

describe('write requests', () => {
  const req = (headers: Record<string, string>) => new Request('https://evefrontier.space/status/api/v1/subscriptions', { method: 'POST', headers, body: '{}' });
  it('allows JSON from this site, or from scripts that send no Origin', () => {
    expect(writeAllowed(req({ 'content-type': 'application/json' }))).toBeNull();
    expect(writeAllowed(req({ 'content-type': 'application/json; charset=utf-8', origin: 'https://evefrontier.space' }))).toBeNull();
  });
  it('refuses other sites, and bodies a form could send without a preflight', () => {
    expect(writeAllowed(req({ 'content-type': 'application/json', origin: 'https://evil.example' }))).toMatch(/cross-site/);
    expect(writeAllowed(req({ 'content-type': 'text/plain' }))).toMatch(/application\/json/);
    expect(writeAllowed(req({ 'content-type': 'application/x-www-form-urlencoded' }))).toMatch(/application\/json/);
  });
});
