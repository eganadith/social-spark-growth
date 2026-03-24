/**
 * Pure payment rules shared by Edge Functions.
 * Vitest asserts these invariants (never trust the success URL — only Ziina GET + these checks).
 */

/** Minimum charge: 2.00 AED (Ziina uses fils = AED × 100). */
export const MIN_CHECKOUT_FILS = 200;

export function aedToFils(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/** True if DB order.amount is valid for creating a checkout (not 0/negative/NaN, meets minimum). */
export function isOrderAmountValidForCheckout(orderAmountAed: number): boolean {
  const fils = aedToFils(orderAmountAed);
  return Number.isFinite(fils) && fils >= MIN_CHECKOUT_FILS;
}

export type ZiinaVerifyResult =
  | { ok: true }
  | { ok: false; error: string; ziina_status?: string };

/**
 * Gate for marking an order paid: ONLY after Ziina reports completed + amount/currency match order row.
 */
export function verifyZiinaIntentAgainstOrder(opts: {
  ziinaStatus: string;
  ziinaAmountUnknown: unknown;
  ziinaCurrencyUnknown: unknown;
  orderAmountAed: number;
}): ZiinaVerifyResult {
  if (opts.ziinaStatus !== "completed") {
    return {
      ok: false,
      error: "Payment not completed",
      ziina_status: opts.ziinaStatus,
    };
  }

  const currency = typeof opts.ziinaCurrencyUnknown === "string" ? opts.ziinaCurrencyUnknown.trim() : "";
  if (currency && currency !== "AED") {
    return { ok: false, error: "Currency mismatch" };
  }

  const ziinaAmount = Number(opts.ziinaAmountUnknown);
  const expectedFils = aedToFils(Number(opts.orderAmountAed));
  if (!Number.isFinite(ziinaAmount) || ziinaAmount !== expectedFils) {
    return { ok: false, error: "Amount mismatch" };
  }

  return { ok: true };
}
