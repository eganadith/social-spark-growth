/**
 * Ziina Payment Intent API (UAE / AED).
 * @see https://docs.ziina.com/api-reference/payment-intent/create
 * @see https://docs.ziina.com/api-reference/webhook/index
 *
 * Secrets (Edge Functions): ZIINA_API_KEY, ZIINA_WEBHOOK_SECRET (must match webhook `secret` in Ziina),
 * optional ZIINA_API_BASE (default https://api-v2.ziina.com/api), ZIINA_TEST=true for test intents.
 */

const DEFAULT_API_BASE = "https://api-v2.ziina.com/api";

export type CreatePaymentInput = {
  orderId: string;
  userId: string;
  packageId: string;
  /** Major units, e.g. 99 for 99 AED (converted to fils ×100). */
  amount: number;
  /** ISO 4217, e.g. AED */
  currency: string;
  trackingId: string;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
};

export type CreatePaymentResult = {
  redirectUrl: string;
  paymentIntentId: string;
};

/** AED (and similar) amounts: Ziina expects fils / minor units (99 AED → 9900). */
export function toMinorUnits(major: number): number {
  return Math.round(Number(major) * 100);
}

export async function createZiinaPaymentIntent(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const apiKey = Deno.env.get("ZIINA_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error(
      "ZIINA_API_KEY is not set. Add it under Supabase → Edge Functions → Secrets for create-payment.",
    );
  }

  const apiBase = (Deno.env.get("ZIINA_API_BASE") ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const test = Deno.env.get("ZIINA_TEST") === "true";
  const amountMinor = toMinorUnits(input.amount);

  if (input.currency.toUpperCase() === "AED" && amountMinor < 200) {
    throw new Error("Ziina requires at least 2 AED for a payment intent.");
  }

  const res = await fetch(`${apiBase}/payment_intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: amountMinor,
      currency_code: input.currency.toUpperCase().slice(0, 3),
      message: `Socioly · ${input.trackingId}`,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      failure_url: input.failureUrl,
      test,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ziina payment_intent failed (${res.status}): ${text.slice(0, 500)}`);
  }

  let data: { id?: string; redirect_url?: string };
  try {
    data = JSON.parse(text) as { id?: string; redirect_url?: string };
  } catch {
    throw new Error("Ziina returned non-JSON body");
  }

  const paymentIntentId = data.id;
  const redirectUrl = data.redirect_url;
  if (!paymentIntentId || !redirectUrl) {
    throw new Error(`Ziina response missing id or redirect_url: ${text.slice(0, 300)}`);
  }

  return { redirectUrl, paymentIntentId };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET payment_intent by id (Ziina API v2).
 * @see https://docs.ziina.com/api-reference/payment-intent/retrieve
 */
export async function getZiinaPaymentIntentStatus(paymentIntentId: string): Promise<string | undefined> {
  const apiKey = Deno.env.get("ZIINA_API_KEY")?.trim();
  if (!apiKey) {
    throw new Error("ZIINA_API_KEY is not set.");
  }
  const apiBase = (Deno.env.get("ZIINA_API_BASE") ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const res = await fetch(`${apiBase}/payment_intent/${encodeURIComponent(paymentIntentId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ziina GET payment_intent failed (${res.status}): ${text.slice(0, 500)}`);
  }
  let data: { status?: string };
  try {
    data = JSON.parse(text) as { status?: string };
  } catch {
    throw new Error("Ziina GET returned non-JSON body");
  }
  return data.status;
}

export async function getZiinaPaymentIntentStatusWithRetry(
  paymentIntentId: string,
  maxAttempts = 3,
): Promise<string | undefined> {
  let last: Error | undefined;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await getZiinaPaymentIntentStatus(paymentIntentId);
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      if (i < maxAttempts - 1) await sleep(350 * (i + 1));
    }
  }
  throw last ?? new Error("Ziina GET failed");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify `X-Hmac-Signature` (hex SHA-256 HMAC of raw body). Requires `ZIINA_WEBHOOK_SECRET`. */
export async function verifyZiinaWebhook(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("ZIINA_WEBHOOK_SECRET")?.trim();
  if (!secret) {
    return false;
  }
  const sig =
    req.headers.get("x-hmac-signature") ??
    req.headers.get("X-Hmac-Signature") ??
    req.headers.get("X-HMAC-Signature");
  if (!sig) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected.toLowerCase(), sig.trim().toLowerCase());
}
