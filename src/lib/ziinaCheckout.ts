import { isPaymentTestMode } from "@/lib/paymentTestMode";

/** Pro-run-store style: redirect URLs from the live origin; amount still comes from the order server-side. */
export function buildZiinaPaymentBody(orderId: string): Record<string, unknown> {
  const origin = window.location.origin;
  const q = encodeURIComponent(orderId);
  const base: Record<string, unknown> = {
    order_id: orderId,
    success_url: `${origin}/success?order_id=${q}`,
    cancel_url: `${origin}/cancel`,
    failure_url: `${origin}/cancel`,
  };
  if (isPaymentTestMode()) base.test = true;
  return base;
}
