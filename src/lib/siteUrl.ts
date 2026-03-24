/** Customer support inbox (shown in footer, terms, etc.). */
export const SUPPORT_EMAIL = "support@socioly.live";

/** WhatsApp `wa.me` uses digits only (no + or spaces). +94 78 916 5043 */
export const WHATSAPP_PHONE_DIGITS = "94789165043";

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

/** Password reset emails must redirect here; add this URL in Supabase → Auth → URL Configuration → Redirect URLs. */
export function getPasswordResetRedirectTo(): string {
  const base = getSiteOrigin();
  if (!base) return "";
  return `${base}/auth/reset-password`;
}
