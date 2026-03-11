/**
 * In production, home is at / on the same origin. In local dev, home runs on a
 * different port; set VITE_HOME_APP_URL (e.g. http://localhost:5173) so the
 * "Community" logo link goes to the home app.
 */
export const HOME_APP_HREF =
  typeof import.meta.env.VITE_HOME_APP_URL === 'string' && import.meta.env.VITE_HOME_APP_URL
    ? import.meta.env.VITE_HOME_APP_URL
    : '/';
