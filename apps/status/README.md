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
3. Stores one sample per component, adds one minute to today's rollup, and opens or closes incidents.
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
| World | Game server | Age of the newest world transaction whose gas was paid by a sponsor in the world's AdminACL | Stillness: under 10 min; Utopia: under 20 min | Stillness: 10 to 20 min; Utopia: 20 to 45 min | Stillness: over 20 min; Utopia: over 45 min |
| World | World API | `GET /health` answers `{"ok":true}` | in under 2 s | in 2 s or more | error, timeout or `ok` not true on all 3 tries |
| World | World contracts | The package the monitor checks equals `published-at` under `[published.testnet_<world>]` in the upstream `contracts/world/Published.toml` | match | mismatch: the world was redeployed (or the monitor is pinned) | — |
| World | Sponsor gas | SUI balance of each sponsor that paid for a world transaction in the last 24 h (all listed sponsors if none did) | lowest at or above the low mark | below the low mark (Stillness 100 SUI, Utopia 5 SUI) | below 0.1 SUI, or the AdminACL lists no sponsors |

Why these numbers:

* **Checkpoints / GraphQL**: Sui testnet produces about four checkpoints a second, so a minute without one is already
  unusual.
* **Stillness game server**: one 4.5-hour sample on 8 Nov 2026 had a median gap of 5 s between sponsored transactions,
  a 99th percentile of 2 min and a longest gap of 7 min.
* **Utopia game server**: sponsored transactions arrived exactly every 15 minutes on 8 Nov 2026, which looks like a
  scheduled job rather than players.
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
can be linked. These views come from the raw samples, so they reach back 14 days.

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

Webhooks go out from the cron through an outbox: up to 25 deliveries a run (so a run stays under the free plan's 50
outbound requests and D1 queries), at most 150 subscribers, 5 sign-ups per IP a day. A failed delivery is retried after
2, 4, 8 and 16 minutes; five deliveries in a row that fail disable the subscription. Cost is negligible: about 5 D1 row
writes per delivery.

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
roughly 13,000 row writes a day plus the same again for rollups.
