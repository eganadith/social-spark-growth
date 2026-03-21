/** Persisted referral code from ?ref= until signup applies it (localStorage + legacy session fallback). */

export const REFERRAL_LOCAL_KEY = "socioly_pending_ref";
/** @deprecated use REFERRAL_LOCAL_KEY */
export const REFERRAL_LEGACY_SESSION_KEY = "sociallanka_pending_ref";

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const fromLocal = localStorage.getItem(REFERRAL_LOCAL_KEY)?.trim();
  if (fromLocal) return fromLocal.toUpperCase();
  const legacy = sessionStorage.getItem(REFERRAL_LEGACY_SESSION_KEY)?.trim();
  return legacy ? legacy.toUpperCase() : null;
}

export function setPendingReferralCode(code: string): void {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  localStorage.setItem(REFERRAL_LOCAL_KEY, normalized);
  sessionStorage.removeItem(REFERRAL_LEGACY_SESSION_KEY);
}

export function clearPendingReferralCode(): void {
  localStorage.removeItem(REFERRAL_LOCAL_KEY);
  sessionStorage.removeItem(REFERRAL_LEGACY_SESSION_KEY);
}
