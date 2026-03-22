import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const ZIINA_BASE = "https://api-v2.ziina.com/api";

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

  let body: { order_id?: string };
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
    .select("id, user_id, status, payment_id, tracking_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return jsonResponse({ error: "Order not found" }, 404);
  }
  if (order.user_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const paymentId = typeof order.payment_id === "string" ? order.payment_id : "";
  if (!paymentId) {
    return jsonResponse({ error: "No payment started for this order" }, 400);
  }

  if (order.status === "paid" || order.status === "processing" || order.status === "completed") {
    return jsonResponse({
      tracking_id: order.tracking_id,
      status: order.status,
      ziina_status: null,
      synced: false,
    });
  }

  const zRes = await fetch(`${ZIINA_BASE}/payment_intent/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ziinaKey}`,
    },
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

  const ziinaStatus = typeof zJson.status === "string" ? zJson.status : "";

  if (ziinaStatus === "completed") {
    const paidAt = new Date().toISOString();
    const { error: updErr } = await admin
      .from("orders")
      .update({
        status: "paid",
        progress: 25,
        paid_at: paidAt,
      })
      .eq("id", order.id)
      .eq("user_id", user.id);

    if (updErr) {
      return jsonResponse({ error: updErr.message }, 500);
    }

    return jsonResponse({
      tracking_id: order.tracking_id,
      status: "paid",
      ziina_status: ziinaStatus,
      synced: true,
    });
  }

  return jsonResponse({
    tracking_id: order.tracking_id,
    status: order.status,
    ziina_status: ziinaStatus,
    synced: false,
  });
});
