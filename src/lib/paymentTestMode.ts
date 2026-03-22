/** Match pro-run-store: dev or explicit VITE flag enables Ziina test intents. */
export function isPaymentTestMode(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_PAYMENT_TEST_MODE === "true";
}
