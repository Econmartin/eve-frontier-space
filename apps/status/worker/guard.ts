// Request checks for the API's write endpoints.

/**
 * Writes must be JSON (which a browser cannot send cross-site without a CORS preflight, and we offer none for writes)
 * and, when a browser says where it came from, from this site. Scripts and servers send no Origin and are unaffected.
 */
export function writeAllowed(request: Request): string | null {
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) return 'send the body as application/json';
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return 'cross-site requests cannot subscribe or change anything';
  return null;
}
