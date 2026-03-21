/**
 * Canonical public origin for auth email links (`emailRedirectTo`).
 * Set `VITE_SITE_URL` on Netlify to your live HTTPS URL so confirmation links never use localhost.
 * If unset, uses the current browser origin (fine for local dev).
 */
export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/** Where Supabase should send users after they click the email confirmation link. */
export function getAuthEmailRedirectTo(): string {
  const base = getSiteOrigin();
  if (!base) return "";
  return `${base}/auth`;
}
