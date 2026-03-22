import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const ZIINA_BASE = "https://api-v2.ziina.com/api";

function aedToFils(amount: number): number {
  return Math.round(Number(amount) * 100);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildConfirmationEmailHtml(opts: {
  orderId: string;
  paymentId: string;
  amountAed: string;
  packageName: string;
  dateStr: string;
  trackUrl: string;
}): string {
  const { orderId, paymentId, amountAed, packageName, dateStr, trackUrl } = opts;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin:0 0 16px">Payment confirmed</h1>
  <p style="margin:0 0 16px">Thank you — your Socioly order is paid and confirmed.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Order ID</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-family:monospace">${orderId}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Payment ID</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-family:monospace;word-break:break-all">${paymentId}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Amount</td><td style="padding:8px 0;border-bottom:1px solid #eee">${amountAed} AED</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Package</td><td style="padding:8px 0;border-bottom:1px solid #eee">${packageName}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0">${dateStr}</td></tr>
  </table>
  <p style="margin:24px 0 0">
    <a href="${trackUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Track your order</a>
  </p>
  <p style="margin:24px 0 0;font-size:12px;color:#888">If you did not place this order, contact support immediately.</p>
</body></html>`;
}

async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
  from: string;
}): Promise<{ ok: boolean; status: number; bodySnippet: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    bodySnippet: text.slice(0, 200),
  };
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

  let body: { payment_intent_id?: string; order_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  let paymentIntentId = typeof body.payment_intent_id === "string" ? body.payment_intent_id.trim() : "";
  if (!orderId) {
    return jsonResponse({ error: "order_id required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ziinaKey = Deno.env.get("ZIINA_API_KEY");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

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
    .select(
      "id, user_id, status, amount, payment_id, tracking_id, email, package:packages(name)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return jsonResponse({ error: "Order not found" }, 404);
  }
  if (order.user_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (order.status === "paid") {
    return jsonResponse({
      verified: true,
      already_verified: true,
      tracking_id: order.tracking_id,
      status: "paid",
    });
  }

  if (order.status !== "pending") {
    return jsonResponse(
      { error: "Order is not awaiting payment verification", status: order.status },
      400,
    );
  }

  const storedPid = typeof order.payment_id === "string" ? order.payment_id.trim() : "";
  if (!paymentIntentId && storedPid) {
    paymentIntentId = storedPid;
  }
  if (!paymentIntentId) {
    return jsonResponse({ error: "payment_intent_id required (or start checkout first)" }, 400);
  }
  if (storedPid && paymentIntentId !== storedPid) {
    return jsonResponse({ error: "payment_intent_id does not match this order" }, 400);
  }

  const zRes = await fetch(`${ZIINA_BASE}/payment_intent/${encodeURIComponent(paymentIntentId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${ziinaKey}` },
  });

  const zText = await zRes.text();
  let zJson: Record<string, unknown>;
  try {
    zJson = zText ? JSON.parse(zText) : {};
  } catch {
    return jsonResponse({ error: "Ziina returned invalid JSON" }, 502);
  }

  if (!zRes.ok) {
    const msg = typeof zJson.message === "string" ? zJson.message : `Ziina error (${zRes.status})`;
    return jsonResponse({ error: msg, detail: zJson }, 502);
  }

  const ziinaStatus = typeof zJson.status === "string" ? zJson.status : "";
  if (ziinaStatus !== "completed") {
    return jsonResponse(
      {
        error: "Payment not completed",
        ziina_status: ziinaStatus,
      },
      400,
    );
  }

  const currency = typeof zJson.currency_code === "string" ? zJson.currency_code : "";
  if (currency && currency !== "AED") {
    return jsonResponse({ error: "Currency mismatch" }, 400);
  }

  const ziinaAmount = Number(zJson.amount);
  const expectedFils = aedToFils(Number(order.amount));
  if (!Number.isFinite(ziinaAmount) || ziinaAmount !== expectedFils) {
    return jsonResponse(
      {
        error: "Amount mismatch",
        expected_fils: expectedFils,
        ziina_amount: ziinaAmount,
      },
      400,
    );
  }

  const verifiedAt = new Date().toISOString();
  const { data: updated, error: updErr } = await admin
    .from("orders")
    .update({
      status: "paid",
      progress: 25,
      payment_id: paymentIntentId,
      payment_verified_at: verifiedAt,
      paid_at: verifiedAt,
    })
    .eq("id", order.id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id, tracking_id, email")
    .maybeSingle();

  if (updErr) {
    return jsonResponse({ error: updErr.message }, 500);
  }

  if (!updated) {
    const { data: again } = await admin
      .from("orders")
      .select("tracking_id, status")
      .eq("id", order.id)
      .maybeSingle();
    return jsonResponse({
      verified: true,
      already_verified: true,
      tracking_id: again?.tracking_id ?? order.tracking_id,
      status: again?.status ?? "paid",
    });
  }

  let emailSent = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM") ?? "Socioly <onboarding@resend.dev>";
  const toEmail =
    (typeof updated.email === "string" && updated.email.trim()) ||
    (typeof user.email === "string" && user.email.trim()) ||
    "";

  if (resendKey && toEmail) {
    const rawPkg = order.package as { name: string | null } | { name: string | null }[] | null;
    const pkg = Array.isArray(rawPkg) ? rawPkg[0] : rawPkg;
    const pkgName = escapeHtml(pkg?.name?.trim() || "Growth package");
    const trackBase = siteUrl || "https://socioly.app";
    const trackUrl = `${trackBase}/track?id=${encodeURIComponent(updated.tracking_id ?? order.tracking_id)}`;
    const html = buildConfirmationEmailHtml({
      orderId: escapeHtml(order.id),
      paymentId: escapeHtml(paymentIntentId),
      amountAed: Number(order.amount).toFixed(2),
      packageName: pkgName,
      dateStr: new Date(verifiedAt).toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" }),
      trackUrl,
    });

    const send = await sendResendEmail({
      to: toEmail,
      subject: "Payment Confirmation – Socioly Order",
      html,
      apiKey: resendKey,
      from: resendFrom,
    });
    emailSent = send.ok;
    if (!send.ok) {
      console.error("Resend failed", send.status, send.bodySnippet);
    }
  } else if (!resendKey) {
    console.warn("RESEND_API_KEY not set; skipping confirmation email");
  }

  return jsonResponse({
    verified: true,
    already_verified: false,
    tracking_id: updated.tracking_id ?? order.tracking_id,
    status: "paid",
    email_sent: emailSent,
  });
});
