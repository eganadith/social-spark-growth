/** Ziina / gateways may append different query keys for the payment intent id. */
export function readPaymentIntentFromUrl(searchParams: URLSearchParams): string | null {
  const keys = ["pi", "payment_intent_id", "payment_intent", "paymentIntentId", "id"];
  for (const k of keys) {
    const v = searchParams.get(k)?.trim();
    if (v) return v;
  }
  return null;
}
