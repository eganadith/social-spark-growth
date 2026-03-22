import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const ZIINA_BASE = "https://api-v2.ziina.com/api";

function aedToFils(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/** Hostnames allowed for success/cancel URLs (pro-run-store pattern + optional env). */
function allowedRedirectHostnames(): string[] {
  const hostnames = new Set<string>(["localhost", "127.0.0.1"]);
  const extra = Deno.env.get("ZIINA_ALLOWED_DOMAINS");
  if (extra) {
    for (const part of extra.split(",")) {
      const h = part.trim().toLowerCase();
      if (h) hostnames.add(h);
    }
  }
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").trim();
  if (siteUrl) {
    try {
      hostnames.add(new URL(siteUrl).hostname.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  return [...hostnames];
}

function validateRedirectUrl(
  urlStr: string,
  field: string,
  allowed: string[],
): { ok: true } | { ok: false; error: string } {
  if (!urlStr || typeof urlStr !== "string") {
    return { ok: false, error: `${field} is required` };
  }
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { ok: false, error: `${field} is not a valid URL` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `${field} must be http or https` };
  }
  const host = parsed.hostname.toLowerCase();
  const ok = allowed.some((d) => host === d || host.endsWith(`.${d}`));
  if (!ok) {
    return { ok: false, error: `${field} must use an allowed domain (set ZIINA_ALLOWED_DOMAINS or SITE_URL)` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: {
    order_id?: string;
    success_url?: string;
    cancel_url?: string;
    failure_url?: string;
    test?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  if (!orderId) {
    return jsonResponse({ error: "order_id required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ziinaKey = Deno.env.get("ZIINA_API_KEY");
  const siteUrlRaw = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  if (!ziinaKey) {
    return jsonResponse({ error: "Payment provider not configured" }, 500);
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, user_id, status, amount, payment_id, checkout_redirect_url")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return jsonResponse({ error: "Order not found" }, 404);
  }
  if (order.user_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  if (order.status !== "pending") {
    return jsonResponse({ error: "Order is not awaiting payment" }, 400);
  }

  const fils = aedToFils(Number(order.amount));
  if (!Number.isFinite(fils) || fils < 200) {
    return jsonResponse({ error: "Order amount must be at least 2 AED" }, 400);
  }

  const allowedHosts = allowedRedirectHostnames();
  let successUrl: string;
  let cancelUrl: string;
  let failureUrl: string;

  const su = typeof body.success_url === "string" ? body.success_url.trim() : "";
  const cu = typeof body.cancel_url === "string" ? body.cancel_url.trim() : "";
  if (su && cu) {
    const v1 = validateRedirectUrl(su, "success_url", allowedHosts);
    if (!v1.ok) return jsonResponse({ error: v1.error }, 400);
    const v2 = validateRedirectUrl(cu, "cancel_url", allowedHosts);
    if (!v2.ok) return jsonResponse({ error: v2.error }, 400);
    successUrl = su;
    cancelUrl = cu;
    const fu = typeof body.failure_url === "string" ? body.failure_url.trim() : "";
    if (fu) {
      const v3 = validateRedirectUrl(fu, "failure_url", allowedHosts);
      if (!v3.ok) return jsonResponse({ error: v3.error }, 400);
      failureUrl = fu;
    } else {
      failureUrl = cancelUrl;
    }
  } else if (siteUrlRaw) {
    successUrl = `${siteUrlRaw}/payment/success?order_id=${encodeURIComponent(order.id)}`;
    cancelUrl = `${siteUrlRaw}/payment/cancel?order_id=${encodeURIComponent(order.id)}`;
    failureUrl = cancelUrl;
  } else {
    return jsonResponse(
      {
        error:
          "Set SITE_URL secret or pass success_url and cancel_url from the app origin (allowed via ZIINA_ALLOWED_DOMAINS)",
      },
      400,
    );
  }

  const testMode = body.test === true || Deno.env.get("ZIINA_TEST_MODE") === "true";

  const ziinaBody: Record<string, unknown> = {
    amount: fils,
    currency_code: "AED",
    success_url: successUrl,
    cancel_url: cancelUrl,
    failure_url: failureUrl,
    message: "Socioly order",
    ...(testMode ? { test: true } : {}),
  };

  const zRes = await fetch(`${ZIINA_BASE}/payment_intent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ziinaKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ziinaBody),
  });

  const zText = await zRes.text();
  let zJson: Record<string, unknown>;
  try {
    zJson = zText ? JSON.parse(zText) : {};
  } catch {
    return jsonResponse(
      { error: "Ziina returned invalid JSON", detail: zText.slice(0, 200) },
      502,
    );
  }

  if (!zRes.ok) {
    const msg =
      typeof zJson.message === "string"
        ? zJson.message
        : `Ziina error (${zRes.status})`;
    return jsonResponse({ error: msg, detail: zJson }, 502);
  }

  const paymentIntentId = typeof zJson.id === "string" ? zJson.id : "";
  const redirectUrl = typeof zJson.redirect_url === "string" ? zJson.redirect_url : "";
  if (!paymentIntentId || !redirectUrl) {
    return jsonResponse({ error: "Invalid Ziina response" }, 502);
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({
      payment_id: paymentIntentId,
      checkout_redirect_url: redirectUrl,
    })
    .eq("id", order.id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (updErr) {
    return jsonResponse({ error: updErr.message }, 500);
  }

  return jsonResponse({
    redirect_url: redirectUrl,
    payment_intent_id: paymentIntentId,
  });
});
