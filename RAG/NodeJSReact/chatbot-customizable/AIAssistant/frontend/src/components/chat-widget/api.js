/**
 * Absolute POST URL for `/api/chat`. Empty `apiBase` uses the page origin so requests work
 * reliably from shadow DOM and embedded bundles (not only relative `/api/chat`).
 */
export function resolveChatEndpoint(apiBase) {
  const suffix = '/api/chat';
  const b = (apiBase || '').trim().replace(/\/+$/, '');
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  if (!b) {
    return origin ? `${origin}${suffix}` : suffix;
  }

  if (/^https?:\/\//i.test(b)) {
    return `${b}${suffix}`;
  }

  if (b.startsWith('/')) {
    if (!origin) return `${b}${suffix}`;
    return `${origin}${b}${suffix}`;
  }

  return `http://${b}${suffix}`;
}

/**
 * Absolute POST URL for `/api/tts` (speech audio). Mirrors {@link resolveChatEndpoint} path rules.
 * @param {string} apiBase
 */
export function resolveTtsEndpoint(apiBase) {
  const suffix = '/api/tts';
  const b = (apiBase || '').trim().replace(/\/+$/, '');
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  if (!b) {
    return origin ? `${origin}${suffix}` : suffix;
  }

  if (/^https?:\/\//i.test(b)) {
    return `${b}${suffix}`;
  }

  if (b.startsWith('/')) {
    if (!origin) return `${b}${suffix}`;
    return `${origin}${b}${suffix}`;
  }

  return `http://${b}${suffix}`;
}
