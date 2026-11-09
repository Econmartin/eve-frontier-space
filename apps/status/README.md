# EVE Frontier Status (`/status`)

A status page for EVE Frontier's worlds (Stillness, then Utopia) and the Sui testnet they run on: is each part of the stack
up, live chain details per world, 90 days of history, and a public read-only JSON API.

It is served at **evefrontier.space/status** by the site's single Cloudflare Worker (`_worker.js` at the repo root):

```
apps/status/
  src/        the page (Vite + React), built to dist/status
  worker/     checks, cron job, API (imported by _worker.js, bundled by wrangler)
  shared/     status levels and API types used by both
  test/       unit tests with recorded responses (test/fixtures)
  schema.sql  D1 schema (database eve-frontier-status, binding STATUS_DB)
  openapi.yaml
```

## How it works

A Cron Trigger runs every minute (`[triggers]` in `wrangler.toml`). Each run:

1. Re-resolves package addresses from the upstream `Published.toml` if the stored ones are over six hours old (or missing,
   or a pin changed). If a world's package moved, it records a **World redeployed** (or upgraded) event and switches the
   checks to the new package.
2. Runs every check. Each is wrapped so one failing never stops the others; an unexpected error gives **Unknown**.
3. Stores one sample per component, adds one minute to today's and this hour's rollups, and opens or closes incidents.
4. Once a day: recomputes yesterday's rollups from the raw samples, deletes samples older than 14 days and rollups older
   than 400 days.
5. Sends up to 10 pending webhook deliveries.

Every outbound call sends `User-Agent: evefrontier.space-status/1.0 (+https://evefrontier.space/status)`. A 429 makes the
monitor back off that host (for `Retry-After`, or two minutes) and report the affected components as **Unknown**.

### Status levels

| Level | Meaning | Shape |
|---|---|---|
| Operational | Working within thresholds | check in a circle |
| Degraded | Working but slow, late or low | triangle with "!" |
| Offline | Not working | octagon with an X |
| Maintenance | Inside a scheduled downtime window | wrench |
| Unknown | **Our** probe could not measure it. Never used to mean "down" | question mark in a circle |

Status is never shown by colour alone. Every level has a word and its own icon (lucide, as on the rest of the site), and in the uptime bars the
segment height carries it too: full height is Operational, two-thirds is Degraded (orange) or Maintenance (blue),
one-third is Offline (pink), top and bottom bars only is Unknown, and a bare baseline is no data. The worse the
problem, the lower the bar. Normal is drawn in the site's own ink (EVE cream on dark, slate on light) so trouble stands
out in colour.

If every outside host fails at the network level in the same run, the monitor assumes its own connection is the problem
and marks everything Unknown.

## Components and thresholds

All thresholds live in [`worker/config.ts`](worker/config.ts).

| Group | Component | Check | Operational | Degraded | Offline |
|---|---|---|---|---|---|
| Sui testnet | Checkpoints | Timestamp of the latest checkpoint (Sui GraphQL) | newer than 60 s | 60 s to 5 min | older than 5 min |
| Sui testnet | GraphQL endpoint | The checkpoint query: HTTP status and latency | 200 in under 2 s | 200 in 2 s or more | error or timeout on all 3 tries (10 s each) |
| World | Game server | Age of the newest world transaction whose gas was paid by a sponsor in the world's AdminACL | Stillness: under 10 min; Utopia: under 35 min | Stillness: 10 to 20 min; Utopia: 35 to 45 min | Stillness: over 20 min; Utopia: over 45 min |
| World | World API | `GET /health` answers `{"ok":true}` | in under 2 s | in 2 s or more | error, timeout or `ok` not true on all 3 tries |
| World | World contracts | The package the monitor checks equals `published-at` under `[published.testnet_<world>]` in the upstream `contracts/world/Published.toml` | match | mismatch: the world was redeployed (or the monitor is pinned) | — |
| World | Sponsor gas | SUI balance of each sponsor that paid for a world transaction in the last 24 h (all listed sponsors if none did) | lowest at or above the low mark | below the low mark (Stillness 100 SUI, Utopia 5 SUI) | below 0.1 SUI, or the AdminACL lists no sponsors |

Why these numbers:

* **Checkpoints / GraphQL**: Sui testnet produces about four checkpoints a second, so a minute without one is already
  unusual.
* **Stillness game server**: one 4.5-hour sample on 8 Nov 2026 had a median gap of 5 s between sponsored transactions,
  a 99th percentile of 2 min and a longest gap of 7 min.
* **Utopia game server**: its sponsored transactions come from a job that runs every 15 minutes rather than from
  players. The brief started it at Degraded after 20 minutes, but the chain history (29 Sep to 8 Nov 2026) shows the job
  skips one run about once a day, which made a 12-minute incident each time. Degraded now starts at 35 minutes: one
  skipped run is tolerated, two in a row are flagged.
* **Sponsor gas**: a world transaction costs about 0.001 SUI net. Stillness runs a few hundred to ~700 an hour, so
  100 SUI is roughly a week of gas. 0.1 SUI cannot cover the gross storage cost of a typical transaction (~0.03 SUI) for long.

**What the game server check proves**: the game server is writing to the chain. It does not prove players can log in.

**Chain stalls**: when Checkpoints is not Operational, the game server and sponsor gas components (which read the chain)
report Unknown instead of Offline: the chain stalled, not the game.

**Scheduled downtime**: a 72-hour scan of Stillness transactions (5–8 Nov 2026, 5-minute windows) found no daily
downtime: only two empty windows, at different times on one day. `maintenance` in each world's config is therefore empty.
If a window appears, add it there (`{ start: '11:00', minutes: 30, days?: [0..6] }`, UTC) and the game server shows
Maintenance during it instead of Offline.

**Uptime**: per day, Offline minutes count as down and Degraded minutes as up; Unknown and Maintenance minutes are left
out. A day with no measured minutes shows "no data".

### Re-tuning the game server thresholds

Every gap between consecutive sponsored transactions is stored in a per-world, per-day histogram (`gap_hist`).
After two weeks of data:

```bash
curl -s https://evefrontier.space/status/api/v1/worlds/stillness/gaps?days=14 | jq
```

returns p50, p99, p99.9, the longest gap, and (with 14 days or more) suggested thresholds: Degraded at twice the p99.9 gap
(at least 5 min), Offline at twice the longest gap (at least 10 min). Update `heartbeat` in `worker/config.ts` and deploy.

## Short ranges on the component page

The overview bars are one segment per UTC day. Each component's page (`/status/history/<id>`) has range tabs for a closer
look: **1 h** (one segment per minute, i.e. every check), **6 h** (per 5 minutes), **24 h** (per 15 minutes, the default),
**7 d** (per hour) and **90 d** (per day). Each range has a table underneath that can be filtered to problems only, with
the check's message and, for the GraphQL endpoint and World API, mean latency. The range is in the URL (`?range=1h`) so it
can be linked. 1 h, 6 h and 24 h come from the raw samples; 7 d and the overview's "24 hours" view come from the hourly
rollups (`hourly`, kept 8 days), so a poll reads a couple of hundred rows instead of tens of thousands. The first cron
run after deploying creates and fills `hourly` from the raw samples; until then those views read raw samples.

## Incidents

* An incident opens after **3** consecutive bad samples (Degraded or Offline) and closes after **5** consecutive
  Operational ones. Unknown and Maintenance samples are skipped, so a probe failure in the middle of an outage does not
  split it in two.
* If an open incident gets worse (Degraded to Offline), its impact is raised and an update is added.
* An admin can add written updates, open incidents by hand (never closed automatically) and resolve them:

```bash
# once: wrangler secret put STATUS_ADMIN_TOKEN
curl -X POST https://evefrontier.space/status/api/admin/incidents/12/updates \
  -H "authorization: Bearer $STATUS_ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"body":"CCP confirmed a login server problem; the chain is fine."}'

curl -X POST https://evefrontier.space/status/api/admin/incidents \
  -H "authorization: Bearer $STATUS_ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"component":"stillness-game-server","impact":"degraded","title":"Login queue","body":"Players report long login queues."}'

curl -X POST https://evefrontier.space/status/api/admin/incidents/12/resolve \
  -H "authorization: Bearer $STATUS_ADMIN_TOKEN" -H 'content-type: application/json' -d '{"body":"Fixed."}'
```

## Data sources

| Source | Used for |
|---|---|
| Sui GraphQL, `https://graphql.testnet.sui.io/graphql` | checkpoints and epoch, world transactions and their gas sponsors, AdminACL and its sponsor table, sponsor balances, the package's publish transaction, a Character object's tenant |
| `Published.toml` in [evefrontier/world-contracts](https://github.com/evefrontier/world-contracts) (`contracts/world`, `contracts/assets`) | the world and EVE token packages per world. This is the source of truth; the official docs page lagged a redeploy by weeks |
| World API, `https://world-api-stillness.live.pub.evefrontier.com/health` | Stillness World API health. Utopia's old host no longer resolves and no new one is published, so Utopia has no World API component |

Chain details per world:

| Field | Source |
|---|---|
| Tenant | `key.tenant` of any `<pkg>::character::Character` (the previous Stillness deployment also says "stillness", so the tenant alone cannot tell deployments apart) |
| World package | `published-at` under `[published.testnet_<world>]` |
| EVE token package | the same, in `contracts/assets/Published.toml` |
| World start checkpoint | the checkpoint before the world package's publish transaction |
| Published | timestamp of that transaction |
| Current checkpoint and epoch | the latest checkpoint |
| World transactions, last hour | transactions calling the world package, counted incrementally each minute (`afterCheckpoint`) and summed over the last 60 samples |
| Last game server transaction | the heartbeat above |
| Authorised sponsors | dynamic fields of the AdminACL's `authorized_sponsors` table, read every minute so a key rotation does not break the heartbeat |

Packages that have been upgraded have a `published-at` different from their `original-id`: transactions are filtered by
`published-at`, types (AdminACL, Character) by `original-id`.

## Public API

Documented on the page's API tab and in [`openapi.yaml`](openapi.yaml) (served at `/status/openapi.yaml`). JSON, CORS `*`,
cached at the edge for 30 s, 60 requests a minute per IP (Workers rate-limit binding `STATUS_RATE_LIMITER`). Every response
has `generated_at` and `stale` (true when the newest sample is more than 3 minutes old).

`/summary`, `/components/{id}`, `/components/{id}/samples?range=1h|6h|24h|7d`, `/worlds/{tenant}`, `/worlds/{tenant}/gaps`, `/incidents?status=open|resolved`,
`/history?component={id}&days=90`, `/events`, and `/status/feeds/incidents.rss`. Webhooks: `POST /subscriptions`.

### Webhooks

1. **Subscribe:** `POST /status/api/v1/subscriptions` with `{"url": "https://…"}` (as `application/json`). We
   immediately POST `{"type": "subscription.verify", "challenge": "…"}` to that URL; your endpoint must answer 2xx with
   the challenge value in its body (plain, or `{"challenge": "…"}`). Only then is the subscription stored, and the reply
   gives you an `id` and a `secret` (shown once). If the challenge fails, nothing is stored and the reply is the same
   whether or not the URL was already subscribed. Subscribing a URL again (and passing the challenge) rotates its secret.
2. **Deliveries:** POSTs of `{type, created_at, data, source}` with `X-Status-Timestamp` (Unix seconds),
   `X-Status-Delivery` (unique per event and subscriber) and `X-Status-Signature: sha256=<hex HMAC-SHA256(secret,
   "<timestamp>.<raw body>")>`. Check the signature, reject timestamps more than 5 minutes old, and ignore a delivery ID
   you have seen before. Types: incident.opened, incident.updated, incident.resolved, world.redeployed, world.upgraded.
3. **Unsubscribe:** `DELETE /status/api/v1/subscriptions/{id}` with `Authorization: Bearer <secret>`. Without the
   secret nobody can unsubscribe you; a wrong ID or secret gets the same 404.

Security choices: only public `https` URLs (no IP addresses, localhost or internal names, no redirects followed); the
challenge means nobody can point deliveries at someone else's endpoint; write endpoints are not offered cross-origin (CORS
is open for reads only, writes must be JSON, and browsers from other sites are refused), so another site cannot sign
people up through its visitors; 10 sign-up attempts per IP a day; at most 150 subscribers.

Admin: `GET /status/api/admin/subscriptions` lists them and `DELETE /status/api/admin/subscriptions/{id}` removes one
(both with `Authorization: Bearer $STATUS_ADMIN_TOKEN`).

Deliveries go out from the cron through an outbox: up to 25 a run (so a run stays under the free plan's 50 outbound
requests and D1 queries). A failed delivery is retried after 2, 4, 8 and 16 minutes; five deliveries in a row that fail
switch the subscription off, and switched-off subscriptions are deleted after 30 days. Cost is negligible: about 5 D1
row writes per delivery.

## Adding a world

1. Check it has a `[published.testnet_<name>]` section in both `Published.toml` files.
2. Add an entry to `WORLDS` in [`worker/config.ts`](worker/config.ts): `tenant`, `name`, `publishedKey`, `worldApi` (or
   `null`), `heartbeat` and `sponsorGas` thresholds, `maintenance` windows. Start with generous heartbeat thresholds,
   then re-tune from `/worlds/<tenant>/gaps` after two weeks.
3. Deploy. Components, chain panel, history and API routes follow from the config; the first run resolves its packages.

To pin a world to a specific package (for testing), set `STATUS_PIN_<TENANT>` to the package address, e.g.
`npx wrangler dev --var STATUS_PIN_STILLNESS:0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1`.
With the old Stillness package the game server goes Offline (its last transaction is from 29 Sep 2026) and World contracts
shows the mismatch.

## History before live monitoring (backfill)

Live monitoring began 8 Nov 2026 10:21 UTC. Before that, `sui-checkpoints` and both game servers were reconstructed
back to 29 Sep 2026 by [`scripts/backfill.ts`](scripts/backfill.ts), from Sui testnet history, using the same thresholds and
incident rules as the live checks:

* Checkpoints: timestamps sampled about every 10 minutes, with a closer look (every 50 checkpoints) wherever a stretch
  ran slow. No stall of a minute or more was found.
* Game servers: every world transaction in 5-minute windows, keeping those paid by an AdminACL sponsor.
* Incidents found are stored like live ones, with updates that say "Reconstructed from chain history".
* Gap histograms are filled for those days too, so `/worlds/{tenant}/gaps` already has 40 days of data.

The other components were not being probed then and show no data. The API marks this with a `reconstructed` field on
`/history` and `/components/{id}`, and the page says so under the bars. The script writes SQL to review before applying;
it adds to rollups, so run it only once per period:

```bash
node apps/status/scripts/backfill.ts --from 2026-09-29T00:00:00Z --to <first live sample> --out backfill.sql
npx wrangler d1 execute eve-frontier-status --remote --file=backfill.sql
```

## Running it

```bash
npm install
npx wrangler d1 execute eve-frontier-status --local --file=apps/status/schema.sql   # once
npm run build                      # builds every app and dist/ (the Worker serves dist/status)
npx wrangler dev --test-scheduled  # Worker + API on :8787
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"   # run the checks once (local dev has no automatic cron)
npm run dev:status                 # optional: the page with hot reload on :5177, proxying the API to :8787
npm run test:status                # unit tests
```

Deploying: `npx wrangler d1 execute eve-frontier-status --remote --file=apps/status/schema.sql` once, then deploy the
Worker as usual. Cron Triggers need a Worker deploy (`wrangler deploy`); Cloudflare Pages cannot run them.

Limits on the Workers free plan: each run makes about 8 to 12 outbound requests and about 10 D1 statements; samples cost
roughly 13,000 row writes a day, plus the same again for each of the daily and hourly rollups (about 45,000 in all), and
meta rows are only rewritten when their value changes.

D1's free limits (5 million rows read and 100,000 rows written a day) are shared by every database on the account, so
going over also breaks the site's other D1 pages until 00:00 UTC. D1 bills every row a query *scans*, not just the ones it
returns, so every query on `samples` must name the component(s): its key is `(component, ts)`, and a filter on `ts` alone
scans all 14 days (about 180,000 rows). Run once a minute, that alone was ~260 million rows read a day. Likewise, views
that span many hours read the hourly rollups rather than aggregating raw samples on every poll.

When the limit is hit, every D1 query fails, so every status API call answers `500 {"error":"internal error"}` and the
cron stops storing samples until the reset.
