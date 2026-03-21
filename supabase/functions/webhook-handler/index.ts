import { verifyZiinaWebhook } from "../_shared/ziina.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { syncOrderFromZiinaStatus } from "../_shared/orderPaidSync.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hmac-signature, X-Hmac-Signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!Deno.env.get("ZIINA_WEBHOOK_SECRET")?.trim()) {
    console.error("ZIINA_WEBHOOK_SECRET is not configured; refusing webhook requests");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();

  if (!(await verifyZiinaWebhook(req, rawBody))) {
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let payload: { event?: string; data?: { id?: string; status?: string } };
  try {
    payload = JSON.parse(rawBody) as { event?: string; data?: { id?: string; status?: string } };
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  if (payload.event !== "payment_intent.status.updated") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const piId = payload.data?.id;
  const ziinaStatus = payload.data?.status;
  if (!piId) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = supabaseAdmin();
  const result = await syncOrderFromZiinaStatus(admin, piId, ziinaStatus);

  if (!result.ok && result.outcome === "error") {
    return new Response(JSON.stringify({ error: result.detail ?? "sync failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, sync: result.outcome }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
