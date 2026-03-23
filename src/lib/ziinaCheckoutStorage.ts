const URL_KEY = "socioly_ziina_checkout_url";
const CTX_KEY = "socioly_checkout_ctx";

export type CheckoutContext = {
  trackingId?: string;
  amountLabel?: string;
  packageName?: string;
};

export function isAllowedZiinaCheckoutUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    return h === "ziina.com" || h.endsWith(".ziina.com");
  } catch {
    return false;
  }
}

/** Persist Ziina hosted checkout URL for /checkout (must be ziina.com). Opened in full window — Ziina disallows iframe embed. */
export function setZiinaCheckoutUrl(url: string): void {
  if (!isAllowedZiinaCheckoutUrl(url)) {
    throw new Error("Invalid checkout URL");
  }
  sessionStorage.setItem(URL_KEY, url);
}

export function peekZiinaCheckoutUrl(): string | null {
  const v = sessionStorage.getItem(URL_KEY);
  if (v && isAllowedZiinaCheckoutUrl(v)) return v;
  return null;
}

export function clearZiinaCheckoutUrl(): void {
  sessionStorage.removeItem(URL_KEY);
}

export function setCheckoutContext(ctx: CheckoutContext): void {
  sessionStorage.setItem(CTX_KEY, JSON.stringify(ctx));
}

export function peekCheckoutContext(): CheckoutContext | null {
  const raw = sessionStorage.getItem(CTX_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CheckoutContext;
  } catch {
    return null;
  }
}

export function clearCheckoutContext(): void {
  sessionStorage.removeItem(CTX_KEY);
}
