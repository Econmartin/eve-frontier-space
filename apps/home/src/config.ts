/**
 * In production (or when served behind a reverse proxy), home and move share the
 * same origin: / is home, /move is the move app. In local dev they run on different
 * ports, so we need the move app's full URL for "Learn Move" links.
 *
 * Set VITE_MOVE_APP_URL in .env.development (e.g. http://localhost:5174) when
 * running home and move separately. Leave unset in production.
 */
export const MOVE_APP_HREF =
  typeof import.meta.env.VITE_MOVE_APP_URL === 'string' && import.meta.env.VITE_MOVE_APP_URL
    ? import.meta.env.VITE_MOVE_APP_URL
    : '/move';

/**
 * All the industry pages are public. Their game data is not in the repo: production fetches it from the worker,
 * and dev reads the local files from the extractor. Set VITE_INDUSTRY_FULL=0 to fall back to My rocks only.
 */
export const INDUSTRY_FULL = import.meta.env.VITE_INDUSTRY_FULL !== '0';
export const INDUSTRY_HOME = INDUSTRY_FULL ? '/industry' : '/industry/rocks';
