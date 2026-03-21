/** Persisted across signup (no session) so we can resume after email confirmation + login. */
export const SOCIOLY_NEXT_KEY = "socioly_next";

export function persistAuthNext(nextPath: string): void {
  if (typeof window === "undefined") return;
  const n = nextPath.trim();
  if (n.startsWith("/") && !n.startsWith("//")) {
    localStorage.setItem(SOCIOLY_NEXT_KEY, n);
  }
}

/** Returns stored path and clears it. Falls back to `fallback` if unset or invalid. */
export function consumeAuthNext(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(SOCIOLY_NEXT_KEY)?.trim();
  localStorage.removeItem(SOCIOLY_NEXT_KEY);
  if (v && v.startsWith("/") && !v.startsWith("//")) return v;
  return fallback;
}

export function peekAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(SOCIOLY_NEXT_KEY)?.trim();
  if (v && v.startsWith("/") && !v.startsWith("//")) return v;
  return null;
}
