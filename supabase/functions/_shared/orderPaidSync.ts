import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { REWARD_THRESHOLDS } from "./rewards.ts";

const SLA_MS = 72 * 60 * 60 * 1000;

const ORDER_RANK: Record<string, number> = {
  pending: 0,
  paid: 1,
  processing: 2,
  completed: 3,
};

function wouldDowngrade(current: string, next: string): boolean {
  return (ORDER_RANK[next] ?? 0) < (ORDER_RANK[current] ?? 0);
}

function normalizeZiina(s: string | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/** Ziina payment_intent.status → how we treat the order (polling-first; no webhook required). */
export function ziinaStatusBucket(ziina: string | undefined): "completed" | "failed" | "pending" {
  const s = normalizeZiina(ziina);
  if (s === "completed") return "completed";
  if (s === "failed" || s === "canceled" || s === "cancelled") return "failed";
  return "pending";
}

async function notifyBoostingProvider(admin: SupabaseClient, orderId: string): Promise<void> {
  const url = Deno.env.get("BOOSTING_WEBHOOK_URL")?.trim();
  if (!url) {
    console.info("BOOSTING_WEBHOOK_URL not set; skipping boosting notify");
    return;
  }
  const { data: ord, error } = await admin
    .from("orders")
    .select("id, user_id, tracking_id, profile_link, service_type, amount, package:packages(name, platform, followers)")
    .eq("id", orderId)
    .single();
  if (error || !ord) {
    console.error("notifyBoostingProvider: order load failed", error);
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: ord.id,
        tracking_id: ord.tracking_id,
        profile_link: ord.profile_link,
        service_type: ord.service_type,
        amount: ord.amount,
        package: ord.package,
      }),
    });
    const t = await res.text();
    if (!res.ok) console.error("Boosting webhook non-OK", res.status, t.slice(0, 300));
  } catch (e) {
    console.error("Boosting webhook error", e);
  }
}

async function applyReferralRewards(admin: SupabaseClient, orderId: string, userId: string): Promise<void> {
  const { data: profile } = await admin.from("profiles").select("referred_by").eq("id", userId).single();
  const refBy = profile?.referred_by as string | null | undefined;
  if (!refBy) return;

  const { data: existingRef } = await admin.from("referrals").select("id").eq("order_id", orderId).maybeSingle();
  if (existingRef) return;

  await admin.from("referrals").insert({
    referrer_id: refBy,
    referred_user_id: userId,
    order_id: orderId,
    reward_unlocked: true,
  });

  const { count, error: cntErr } = await admin
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", refBy);

  if (cntErr || count == null) return;
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

export type SyncOrderResult = {
  ok: boolean;
  outcome:
    | "no_order"
    | "duplicate"
    | "skipped_downgrade"
    | "updated_pending"
    | "updated_failed"
    | "updated_completed"
    | "error";
  detail?: string;
};

/**
 * Reconcile `orders` + `payments` from Ziina payment_intent status (idempotent).
 * Call from poll, check-once, or optional webhook.
 */
export async function syncOrderFromZiinaStatus(
  admin: SupabaseClient,
  paymentIntentId: string,
  ziinaStatus: string | undefined,
): Promise<SyncOrderResult> {
  const bucket = ziinaStatusBucket(ziinaStatus);

  const { data: existing, error: loadErr } = await admin
    .from("orders")
    .select("id, payment_id, status, user_id, paid_at")
    .eq("payment_id", paymentIntentId)
    .maybeSingle();

  if (loadErr) {
    console.error(loadErr);
    return { ok: false, outcome: "error", detail: loadErr.message };
  }
  if (!existing) {
    return { ok: true, outcome: "no_order" };
  }

  const nowIso = new Date().toISOString();
  const paidAt = existing.paid_at as string | null | undefined;

  if (bucket === "completed") {
    if (paidAt) {
      return { ok: true, outcome: "duplicate" };
    }

    const deadline = new Date(Date.now() + SLA_MS).toISOString();

    const { data: payExisting } = await admin
      .from("payments")
      .select("id, status")
      .eq("payment_id", paymentIntentId)
      .maybeSingle();

    if (!payExisting) {
      const { error: insErr } = await admin.from("payments").insert({
        order_id: existing.id,
        payment_id: paymentIntentId,
        status: "completed",
        paid_at: nowIso,
      });
      if (insErr) console.error("payments insert (completed)", insErr);
    } else if (payExisting.status === "pending") {
      const { error: payErr } = await admin
        .from("payments")
        .update({ status: "completed", paid_at: nowIso })
        .eq("payment_id", paymentIntentId)
        .eq("status", "pending");
      if (payErr) console.error("payments update (completed)", payErr);
    }

    const { error: ordErr } = await admin
      .from("orders")
      .update({
        status: "processing",
        progress: 55,
        paid_at: nowIso,
        fulfillment_deadline_at: deadline,
        start_time: nowIso,
        end_time: deadline,
      })
      .eq("id", existing.id);

    if (ordErr) {
      console.error(ordErr);
      return { ok: false, outcome: "error", detail: ordErr.message };
    }

    const uid = existing.user_id as string;
    await applyReferralRewards(admin, existing.id, uid);
    await notifyBoostingProvider(admin, existing.id);

    return { ok: true, outcome: "updated_completed" };
  }

  if (bucket === "failed") {
    const { data: payRow } = await admin.from("payments").select("id, status").eq("payment_id", paymentIntentId).maybeSingle();
    if (payRow?.status === "pending") {
      const { error: payErr } = await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("payment_id", paymentIntentId)
        .eq("status", "pending");
      if (payErr) console.error("payments update (failed)", payErr);
    }

    if (paidAt) {
      return { ok: true, outcome: "duplicate" };
    }

    const nextStatus = "pending";
    const nextProgress = 5;
    if (wouldDowngrade(existing.status, nextStatus)) {
      return { ok: true, outcome: "skipped_downgrade" };
    }
    if (existing.status === nextStatus && existing.payment_id === paymentIntentId) {
      const { data: row } = await admin.from("orders").select("progress").eq("id", existing.id).single();
      if (row && Number(row.progress) === nextProgress) {
        return { ok: true, outcome: "duplicate" };
      }
    }

    const { error: ordErr } = await admin
      .from("orders")
      .update({ status: nextStatus, progress: nextProgress })
      .eq("id", existing.id);
    if (ordErr) {
      console.error(ordErr);
      return { ok: false, outcome: "error", detail: ordErr.message };
    }
    return { ok: true, outcome: "updated_failed" };
  }

  // In-flight Ziina states → keep order unpaid unless already past payment.
  if (paidAt) {
    return { ok: true, outcome: "duplicate" };
  }

  const nextStatus = "pending";
  const nextProgress = 5;
  if (wouldDowngrade(existing.status, nextStatus)) {
    return { ok: true, outcome: "skipped_downgrade" };
  }

  if (existing.status === nextStatus) {
    const { data: row } = await admin.from("orders").select("progress").eq("id", existing.id).single();
    if (row && Number(row.progress) === nextProgress) {
      return { ok: true, outcome: "duplicate" };
    }
  }

  const { error: ordErr } = await admin
    .from("orders")
    .update({ status: nextStatus, progress: nextProgress })
    .eq("id", existing.id);
  if (ordErr) {
    console.error(ordErr);
    return { ok: false, outcome: "error", detail: ordErr.message };
  }
  return { ok: true, outcome: "updated_pending" };
}
