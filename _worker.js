export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // OG proxy — fetches & caches Open Graph metadata for a given URL
    if (url.pathname === '/api/og') {
      return handleOGProxy(request);
    }

    // Community mining sessions (industry tool): submit labelled rocks, read per-rock summary
    if (url.pathname === '/api/mining-sessions' && request.method === 'POST') {
      return handleMiningSubmit(request, env);
    }
    if (url.pathname === '/api/mining-sessions/summary') {
      return handleMiningSummary(request, env);
    }

    // Try the actual static asset first
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // SPA fallback: route to correct app index
    let fallback = '/index.html';
    if (url.pathname.startsWith('/move'))       fallback = '/move/index.html';
    if (url.pathname.startsWith('/finance'))    fallback = '/finance/index.html';
    if (url.pathname.startsWith('/directory'))  fallback = '/directory/index.html';

    return env.ASSETS.fetch(new URL(fallback, url));
  },
};

async function handleOGProxy(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) return jsonResponse({ error: 'missing url param' }, 400);

  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') throw new Error();
  } catch {
    return jsonResponse({ error: 'invalid url' }, 400);
  }

  let html = '';
  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (res.ok) {
      const full = await res.text();
      html = full.slice(0, 100_000);
    }
  } catch {
    // network error or timeout — return empty rather than error
  }

  const og = parseOG(html, targetUrl);
  // Cache at CF edge for 24h; serve stale for up to 7 days while revalidating
  return jsonResponse(og, 200, { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' });
}

function parseOG(html, baseUrl) {
  // Matches both attribute orderings: property="og:x" content="y" and content="y" property="og:x"
  function getMeta(pattern) {
    const m = html.match(pattern);
    return m ? decodeEntities(m[1].trim()) : undefined;
  }

  const ogProp = (prop) =>
    getMeta(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    getMeta(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'));

  const metaName = (name) =>
    getMeta(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    getMeta(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));

  const title =
    ogProp('og:title') ||
    getMeta(/<title[^>]*>([^<]{1,200})<\/title>/i);

  const description =
    ogProp('og:description') ||
    metaName('description');

  let image = ogProp('og:image');
  if (image && !image.startsWith('http')) {
    try { image = new URL(image, baseUrl).toString(); } catch { image = undefined; }
  }

  return { title, description, image };
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}


// ---------------------------------------------------------------------------
// Mining sessions API — backed by D1 (binding DB, see schema.sql)
// ---------------------------------------------------------------------------
const ROCK_NAME = /^[A-Za-z][A-Za-z ' -]{0,30}$/;
const MAX_SESSIONS_PER_POST = 25;

async function ipHash(request) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('efs-mining:' + ip));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const MAX_TICKS_PER_SESSION = 20000;
const MAX_TICK_UNITS = 10000;
/** Ticks far above their neighbours (same rule as apps/home/src/lib/gamelogCheck.ts; keep in sync). */
function outlierTicks(ns, factor = 5, floor = 40, window = 4) {
  const out = [];
  for (let i = 0; i < ns.length; i++) {
    if (ns[i] <= floor) continue;
    const around = [];
    for (let j = Math.max(0, i - window); j <= Math.min(ns.length - 1, i + window); j++) if (j !== i) around.push(ns[j]);
    if (around.length < 2) continue;
    around.sort((a, b) => a - b);
    if (ns[i] > factor * Math.max(1, around[Math.floor(around.length / 2)])) out.push(i);
  }
  return out;
}
/**
 * Validate the per-tick list of a submitted session against its totals. Returns an error string or null.
 * ticks: [[unixSeconds, units, regolithTypeID], …] in log order.
 */
function checkTicks(ticks, startSec, endSec, mats) {
  if (!Array.isArray(ticks) || !ticks.length || ticks.length > MAX_TICKS_PER_SESSION) return 'ticks missing';
  const sums = {}; let last = 0; let same = 0;
  for (const tk of ticks) {
    if (!Array.isArray(tk) || tk.length !== 3) return 'bad tick';
    const [t, n, id] = tk;
    if (!Number.isInteger(t) || !Number.isInteger(n) || !Number.isInteger(id) || n < 1 || n > MAX_TICK_UNITS || id < 1) return 'bad tick';
    if (t < startSec || t > endSec) return 'tick outside session';
    if (t < last) return 'ticks out of order';
    same = t === last ? same + 1 : 0; if (same >= 8) return 'too many ticks in one second';
    last = t;
    sums[id] = (sums[id] || 0) + n;
  }
  for (const [id, v] of mats) if (sums[id] !== v) return 'ticks do not add up to materials';
  if (Object.keys(sums).length !== mats.length) return 'ticks do not add up to materials';
  if (outlierTicks(ticks.map((tk) => tk[1])).length) return 'a tick is far above its neighbours';
  return null;
}

async function handleMiningSubmit(request, env) {
  if (!env.DB) return jsonResponse({ error: 'storage not configured' }, 503);
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'invalid json' }, 400); }
  const { cycle, rock, prefix, sessions } = body || {};
  if (typeof cycle !== 'string' || cycle.length > 32 || typeof rock !== 'string' || !ROCK_NAME.test(rock)) return jsonResponse({ error: 'bad rock or cycle' }, 400);
  if (prefix != null && (typeof prefix !== 'string' || prefix.length > 16)) return jsonResponse({ error: 'bad prefix' }, 400);
  if (!Array.isArray(sessions) || !sessions.length || sessions.length > MAX_SESSIONS_PER_POST) return jsonResponse({ error: 'bad sessions' }, 400);
  const who = await ipHash(request);
  // light rate limit: 200 rows per submitter per day
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM mining_sessions WHERE submitter = ? AND created_at > datetime('now', '-1 day')").bind(who).first();
  if (recent && recent.n >= 200) return jsonResponse({ error: 'daily limit reached' }, 429);
  const stmt = env.DB.prepare('INSERT INTO mining_sessions (cycle, rock, prefix, start_ts, end_ts, ticks, total, materials, ticks_json, submitter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const batch = [];
  for (const s of sessions) {
    const mats = s && s.materials && typeof s.materials === 'object' ? Object.entries(s.materials).filter(([k, v]) => /^\d{1,8}$/.test(k) && Number.isInteger(v) && v > 0 && v < 1e8) : [];
    const ticks = Number(s && s.ticks), start = Date.parse(s && s.start), end = Date.parse(s && s.end);
    if (!mats.length || !Number.isInteger(ticks) || ticks < 1 || ticks > 100000 || !start || !end || end < start) return jsonResponse({ error: 'bad session' }, 400);
    const total = mats.reduce((a, [, v]) => a + v, 0);
    const matsById = mats.map(([k, v]) => [Number(k), v]);
    const why = checkTicks(s.ticksList, Math.floor(start / 1000), Math.ceil(end / 1000), matsById);
    if (why) return jsonResponse({ error: 'log failed checks: ' + why }, 400);
    if (s.ticksList.length !== ticks) return jsonResponse({ error: 'log failed checks: tick count' }, 400);
    batch.push(stmt.bind(cycle, rock, prefix || null, new Date(start).toISOString(), new Date(end).toISOString(), ticks, total, JSON.stringify(Object.fromEntries(mats)), JSON.stringify(s.ticksList), who));
  }
  await env.DB.batch(batch);
  return jsonResponse({ ok: true, saved: batch.length }, 201);
}

async function handleMiningSummary(request, env) {
  if (!env.DB) return jsonResponse({ error: 'storage not configured' }, 503);
  const cycle = new URL(request.url).searchParams.get('cycle');
  const q = cycle
    ? env.DB.prepare('SELECT rock, prefix, total, materials FROM mining_sessions WHERE cycle = ?').bind(cycle)
    : env.DB.prepare('SELECT rock, prefix, total, materials FROM mining_sessions');
  const { results } = await q.all();
  // per rock: sample count, total units, mean share per regolith, min/max share
  const rocks = {};
  for (const row of results) {
    const r = rocks[row.rock] || (rocks[row.rock] = { samples: 0, units: 0, prefixes: {}, regoliths: {} });
    r.samples += 1; r.units += row.total;
    if (row.prefix) r.prefixes[row.prefix] = (r.prefixes[row.prefix] || 0) + 1;
    let mats = {}; try { mats = JSON.parse(row.materials); } catch { /* skip */ }
    for (const [id, n] of Object.entries(mats)) {
      const share = row.total ? n / row.total : 0;
      const g = r.regoliths[id] || (r.regoliths[id] = { seen: 0, units: 0, shareSum: 0, min: 1, max: 0 });
      g.seen += 1; g.units += n; g.shareSum += share; g.min = Math.min(g.min, share); g.max = Math.max(g.max, share);
    }
  }
  for (const r of Object.values(rocks)) for (const g of Object.values(r.regoliths)) { g.share = g.shareSum / r.samples; g.presence = g.seen / r.samples; delete g.shareSum; }
  return jsonResponse({ rocks, total: results.length }, 200, { 'Cache-Control': 'public, max-age=60' });
}
