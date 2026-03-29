/**
 * GitHub-hosted JSON list of curated EVE Frontier apps.
 * Format: Array<{ url: string; tags: string[] }>
 */
export const APPS_JSON_URL =
  'https://raw.githubusercontent.com/Econmartin/eve-frontier-apps/refs/heads/main/urls.json';

/**
 * Set VITE_FAVORITES_PACKAGE_ID in .env after deploying contracts/favorites
 * to Stillness. Leave empty during local development — favourites UI will be
 * hidden until a package ID is configured.
 */
export const FAVORITES_PACKAGE_ID =
  (import.meta.env.VITE_FAVORITES_PACKAGE_ID as string | undefined) ?? '';

console.log('[directory] FAVORITES_PACKAGE_ID:', FAVORITES_PACKAGE_ID || '(not set)');
