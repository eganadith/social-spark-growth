import { getZiinaPaymentIntentStatusWithRetry } from "../_shared/ziina.ts";
import { syncOrderFromZiinaStatus } from "../_shared/orderPaidSync.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-socioly-poll",
};

function pollSecret(): string | undefined {
  return Deno.env.get("PAYMENTS_POLL_SECRET")?.trim();
}

function ttlMs(): number {
  const h = Number(Deno.env.get("PAYMENT_PENDING_TTL_HOURS") ?? 24);
  return (Number.isFinite(h) && h > 0 ? h : 24) * 3600_000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = pollSecret();
  if (!secret) {
    console.error("PAYMENTS_POLL_SECRET is not set");
    return new Response(JSON.stringify({ error: "Poll secret not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const header =
    req.headers.get("x-socioly-poll")?.trim() ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (header !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = supabaseAdmin();
  const now = Date.now();
  const expiredBefore = new Date(now - ttlMs()).toISOString();

  const { data: stale, error: staleErr } = await admin
    .from("payments")
    .update({ status: "failed" })
    .eq("status", "pending")
    .lt("created_at", expiredBefore)
    .select("id");

  if (staleErr) console.error("expire stale payments", staleErr);

  const { data: pending, error: pendErr } = await admin
    .from("payments")
    .select("id, payment_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (pendErr) {
    console.error(pendErr);
    return new Response(JSON.stringify({ error: "Could not load pending payments" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { payment_id: string; outcome: string; error?: string }[] = [];

  for (const row of pending ?? []) {
    const pid = row.payment_id as string;
    try {
      const ziinaStatus = await getZiinaPaymentIntentStatusWithRetry(pid, 3);
      const sync = await syncOrderFromZiinaStatus(admin, pid, ziinaStatus);
      results.push({ payment_id: pid, outcome: sync.outcome });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("poll payment", pid, msg);
      results.push({ payment_id: pid, outcome: "ziina_error", error: msg.slice(0, 200) });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      expired_marked_failed: stale?.length ?? 0,
      checked: results.length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
