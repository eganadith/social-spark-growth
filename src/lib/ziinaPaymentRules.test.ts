import { describe, expect, it } from "vitest";
import {
  aedToFils,
  isOrderAmountValidForCheckout,
  MIN_CHECKOUT_FILS,
  verifyZiinaIntentAgainstOrder,
} from "../../supabase/functions/_shared/ziinaPaymentRules.ts";

describe("ziinaPaymentRules — intent creation (amount)", () => {
  it("10 AED → 1000 fils", () => {
    expect(aedToFils(10)).toBe(1000);
  });

  it("rejects 0 AED for checkout", () => {
    expect(isOrderAmountValidForCheckout(0)).toBe(false);
    expect(aedToFils(0)).toBe(0);
    expect(aedToFils(0)).toBeLessThan(MIN_CHECKOUT_FILS);
  });

  it("rejects negative AED", () => {
    expect(isOrderAmountValidForCheckout(-5)).toBe(false);
  });

  it("rejects below minimum (1 AED = 100 fils)", () => {
    expect(isOrderAmountValidForCheckout(1)).toBe(false);
    expect(isOrderAmountValidForCheckout(1.99)).toBe(false);
  });

  it("accepts exactly minimum 2 AED", () => {
    expect(isOrderAmountValidForCheckout(2)).toBe(true);
    expect(aedToFils(2)).toBe(MIN_CHECKOUT_FILS);
  });
});

describe("ziinaPaymentRules — verify before mark paid (NEVER trust redirect alone)", () => {
  const orderAed = 10;

  it("allows ONLY status completed + amount match + AED", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "completed",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "AED",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects pending (fake success / user abandoned)", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "pending",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "AED",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.ziina_status).toBe("pending");
  });

  it("rejects requires_payment_instrument", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "requires_payment_instrument",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "AED",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects failed", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "failed",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "AED",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects canceled", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "canceled",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "AED",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects amount mismatch (tampered / wrong intent)", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "completed",
      ziinaAmountUnknown: 999,
      ziinaCurrencyUnknown: "AED",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Amount mismatch");
  });

  it("rejects wrong currency", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "completed",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "USD",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Currency mismatch");
  });

  it("allows empty currency when Ziina omits it (treat as AED-only flow)", () => {
    const r = verifyZiinaIntentAgainstOrder({
      ziinaStatus: "completed",
      ziinaAmountUnknown: 1000,
      ziinaCurrencyUnknown: "",
      orderAmountAed: orderAed,
    });
    expect(r.ok).toBe(true);
  });
});
