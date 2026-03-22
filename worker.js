export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Try the actual static asset first
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // SPA fallback: route to correct app index
    let fallback = '/index.html';
    if (url.pathname.startsWith('/move'))    fallback = '/move/index.html';
    if (url.pathname.startsWith('/finance')) fallback = '/finance/index.html';

    return env.ASSETS.fetch(new URL(fallback, url));
  },
};
