import { verifyZiinaWebhook } from "../_shared/ziina.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { REWARD_THRESHOLDS } from "../_shared/rewards.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hmac-signature, X-Hmac-Signature",
};

/** Map Ziina PaymentIntent.status → orders.status */
function mapZiinaIntentStatus(
  ziina: string | undefined,
): "pending" | "paid" | "processing" | "completed" {
  const s = (ziina ?? "").toLowerCase();
  if (s === "completed") return "paid";
  if (s === "pending" || s === "requires_payment_instrument" || s === "requires_user_action") {
    return "processing";
  }
  if (s === "failed" || s === "canceled" || s === "cancelled") return "pending";
  return "pending";
}

function progressForStatus(st: "pending" | "paid" | "processing" | "completed"): number {
  if (st === "pending") return 5;
  if (st === "paid") return 25;
  if (st === "processing") return 55;
  return 100;
}

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  processing: 1,
  paid: 2,
  completed: 3,
};

function wouldDowngrade(current: string, next: string): boolean {
  const a = STATUS_RANK[current] ?? 0;
  const b = STATUS_RANK[next] ?? 0;
  return b < a;
}

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
  const mapped = mapZiinaIntentStatus(ziinaStatus);
  const progress = progressForStatus(mapped);

  const { data: existing } = await admin
    .from("orders")
    .select("id, payment_id, status")
    .eq("payment_id", piId)
    .maybeSingle();

  if (!existing) {
    console.warn("No order for payment_intent id", piId);
    return new Response(JSON.stringify({ ok: true, no_order: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existing.payment_id === piId && existing.status === mapped) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (wouldDowngrade(existing.status, mapped)) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_downgrade" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({
      payment_id: piId,
      status: mapped,
      progress,
    })
    .eq("id", existing.id);

  if (updErr) {
    console.error(updErr);
    return new Response("Update failed", { status: 500, headers: corsHeaders });
  }

  const orderId = existing.id;

  if (mapped === "paid" || mapped === "processing" || mapped === "completed") {
    const { data: ord } = await admin.from("orders").select("user_id").eq("id", orderId).single();
    if (ord?.user_id) {
      const { data: profile } = await admin
        .from("profiles")
        .select("referred_by")
        .eq("id", ord.user_id)
        .single();

      const refBy = profile?.referred_by as string | null | undefined;
      if (refBy && mapped === "paid") {
        const { data: existingRef } = await admin.from("referrals").select("id").eq("order_id", orderId).maybeSingle();
        if (!existingRef) {
          await admin.from("referrals").insert({
            referrer_id: refBy,
            referred_user_id: ord.user_id,
            order_id: orderId,
            reward_unlocked: true,
          });

          const { count, error: cntErr } = await admin
            .from("referrals")
            .select("*", { count: "exact", head: true })
            .eq("referrer_id", refBy);

          if (!cntErr && count != null) {
            for (const t of REWARD_THRESHOLDS) {
              if (count >= t.referrals) {
                await admin.from("rewards").upsert(
                  {
                    user_id: refBy,
                    code: t.code,
                    amount: t.amount,
                    type: "likes",
                    is_used: false,
                  },
                  { onConflict: "user_id,code" },
                );
              }
            }
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
