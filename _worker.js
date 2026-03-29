export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // OG proxy — fetches & caches Open Graph metadata for a given URL
    if (url.pathname === '/api/og') {
      return handleOGProxy(request);
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
