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
 * The industry tool ships in stages. Only "My rocks" (/industry/rocks) is public for now; the rest of the
 * section lives outside the repo (components/pages/industry/full) and is only wired up when that folder is
 * present, in dev or in a production build made with VITE_INDUSTRY_FULL=1.
 */
const HAS_FULL_INDUSTRY = Object.keys(import.meta.glob('./components/pages/industry/full/routes.tsx')).length > 0;
export const INDUSTRY_FULL = HAS_FULL_INDUSTRY && (import.meta.env.DEV || import.meta.env.VITE_INDUSTRY_FULL === '1');
export const INDUSTRY_HOME = INDUSTRY_FULL ? '/industry' : '/industry/rocks';
