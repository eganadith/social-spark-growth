import { isPaymentTestMode } from "@/lib/paymentTestMode";

/** Pro-run-store style: redirect URLs from the live origin; amount still comes from the order server-side. */
export function buildZiinaPaymentBody(orderId: string): Record<string, unknown> {
  const origin = window.location.origin;
  const q = encodeURIComponent(orderId);
  const base: Record<string, unknown> = {
    order_id: orderId,
    success_url: `${origin}/payment/success?order_id=${q}`,
    cancel_url: `${origin}/payment/cancel?order_id=${q}`,
    failure_url: `${origin}/payment/cancel?order_id=${q}`,
  };
  if (isPaymentTestMode()) base.test = true;
  return base;
}
