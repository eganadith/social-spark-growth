import { getZiinaPaymentIntentStatusWithRetry } from "../_shared/ziina.ts";
import { syncOrderFromZiinaStatus } from "../_shared/orderPaidSync.ts";
import { supabaseAdmin, supabaseUser } from "../_shared/supabase.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.match(/^Bearer\s+(\S+)/i)?.[1]?.trim();
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = supabaseUser(req);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(bearer);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: userErr?.message ?? "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { order_id?: string };
    const orderId = body.order_id?.trim();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = supabaseAdmin();
    const { data: order, error: ordErr } = await admin
      .from("orders")
      .select("id, user_id, payment_id, status, paid_at, fulfillment_deadline_at")
      .eq("id", orderId)
      .maybeSingle();

    if (ordErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = order.payment_id as string | null;
    if (!paymentId) {
      return new Response(
        JSON.stringify({
          order_status: order.status,
          sync: "no_payment_intent",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ziinaStatus = await getZiinaPaymentIntentStatusWithRetry(paymentId, 3);
    const sync = await syncOrderFromZiinaStatus(admin, paymentId, ziinaStatus);

    const { data: fresh } = await admin
      .from("orders")
      .select("status, paid_at, fulfillment_deadline_at")
      .eq("id", orderId)
      .single();

    const { data: payRow } = await admin
      .from("payments")
      .select("status, paid_at")
      .eq("payment_id", paymentId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        sync: sync.outcome,
        order_status: fresh?.status ?? order.status,
        paid_at: fresh?.paid_at ?? null,
        fulfillment_deadline_at: fresh?.fulfillment_deadline_at ?? null,
        payment_status: payRow?.status ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
