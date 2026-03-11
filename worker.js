export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Try the actual static asset first
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    // SPA fallback: /move/* → move app, everything else → home app
    const fallback = url.pathname.startsWith('/move')
      ? '/move/index.html'
      : '/index.html';

    return env.ASSETS.fetch(new URL(fallback, url));
  },
};
