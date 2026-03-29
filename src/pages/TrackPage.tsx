import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { invokeAuthedFunction } from "@/lib/supabaseFunctions";
import type { OrderStatus, TrackOrderPayload } from "@/types/database";
import { Search, Package, Clock, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import ReferralCelebrationDialog, {
  markReferralPromptShown,
  shouldShowReferralPrompt,
} from "@/components/ReferralCelebrationDialog";

/** Swap this path when you add a new full-bleed asset to `public/Images`. */
const TRACK_PAGE_BG = "/Images/Young_entrepreneur_checking_202603202226.jpeg";

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; icon: typeof Clock; progress: number }
> = {
  pending: { label: "Order received", color: "text-amber-400", icon: Clock, progress: 5 },
  paid: { label: "Paid", color: "text-sky-400", icon: CreditCard, progress: 25 },
  failed: { label: "Payment issue", color: "text-red-400", icon: AlertCircle, progress: 5 },
  processing: { label: "Processing", color: "text-violet-400", icon: Package, progress: 55 },
  completed: { label: "Completed", color: "text-emerald-400", icon: CheckCircle2, progress: 100 },
};

export default function TrackPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [trackingId, setTrackingId] = useState(params.get("id") || "");
  const [order, setOrder] = useState<TrackOrderPayload | null>(null);
  const [searched, setSearched] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  useEffect(() => {
    if (params.get("id")) void runSearch(params.get("id")!.trim());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!order || order.status === "pending") return;
    if (!shouldShowReferralPrompt(order.tracking_id)) return;
    setReferralOpen(true);
  }, [order]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !order || order.status !== "pending") return;
    const tid = order.tracking_id;
    let cancelled = false;
    (async () => {
      const sb = getSupabase();
      const { data: row } = await sb
        .from("orders")
        .select("id, payment_id, status")
        .eq("tracking_id", tid)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !row?.payment_id || row.status !== "pending") return;
      try {
        await invokeAuthedFunction<{ verified?: boolean }>("verify-payment", {
          order_id: row.id,
          payment_intent_id: row.payment_id,
        });
      } catch {
        /* Ziina may still be pending; user can refresh */
      }
      if (!cancelled) {
        const { data, error } = await getSupabase().rpc("get_order_by_tracking", { p_tracking_id: tid });
        if (!cancelled) {
          if (error) setOrder(null);
          else setOrder(data as TrackOrderPayload | null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order?.tracking_id, order?.status, user?.id]);

  async function runSearch(id: string) {
    if (!isSupabaseConfigured) {
      setOrder(null);
      setSearched(true);
      return;
    }
    const sb = getSupabase();
    const { data, error } = await sb.rpc("get_order_by_tracking", { p_tracking_id: id });
    if (error) {
      console.error(error);
      setOrder(null);
    } else {
      setOrder(data as TrackOrderPayload | null);
    }
    setSearched(true);
  }

  function handleSearch() {
    void runSearch(trackingId.trim());
  }

  const status = order?.status && order.status in statusConfig ? order.status : "pending";
  const config = order ? statusConfig[status as keyof typeof statusConfig] : null;
  const progress = order ? Math.max(order.progress ?? 0, config?.progress ?? 0) : 0;

  return (
    <div className="relative min-h-[100dvh]">
      <div className="fixed inset-0 z-0" aria-hidden>
        <img
          src={TRACK_PAGE_BG}
          alt=""
          className="h-full w-full object-cover object-center"
          width={1920}
          height={1080}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/55 to-white/85 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-20 pt-24 md:pb-16 md:pt-28">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
          <div className="rounded-2xl border border-white/90 bg-white/60 p-6 shadow-[0_24px_80px_-20px_hsla(220,30%,30%,0.18)] backdrop-blur-2xl ring-1 ring-white/80 md:p-8 supports-[backdrop-filter]:bg-white/55">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Track your order</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Enter your tracking ID from your confirmation email or receipt.
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-6 rounded-xl border border-border/60 bg-white/50 px-4 py-3 text-center text-sm text-muted-foreground backdrop-blur-sm">
                Connect Supabase to load orders from your database.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex min-h-12 flex-1 items-center rounded-xl border border-border/60 bg-white/55 px-3 backdrop-blur-md">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Paste tracking ID"
                  className="min-h-11 w-full bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                />
              </div>
              <Button
                variant="hero"
                className="min-h-12 shrink-0 rounded-xl px-8 font-semibold"
                onClick={handleSearch}
                disabled={!isSupabaseConfigured}
              >
                Track
              </Button>
            </div>

            {searched && !order && (
              <div className="mt-8 rounded-xl border border-border/60 bg-white/50 py-8 text-center backdrop-blur-sm">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground px-2">
                  No order found for this ID. Check the code in your email and try again.
                </p>
              </div>
            )}

            {order && config && (
              <div className="mt-8 space-y-5 border-t border-border/50 pt-6">
                <div className="text-center py-1">
                  <config.icon className={`mx-auto mb-3 h-12 w-12 ${config.color}`} />
                  <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground break-all px-2">{order.tracking_id}</div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-white/50 p-4 backdrop-blur-md text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Last update</span>
                    <span className="text-right font-medium text-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                    Package and profile details are available in your account dashboard after you sign in.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
            Secure tracking · No password required · Gradual, quality delivery
          </p>
        </div>
      </div>

      <ReferralCelebrationDialog
        open={referralOpen}
        onOpenChange={(open) => {
          setReferralOpen(open);
          if (!open && order && order.status !== "pending") {
            markReferralPromptShown(order.tracking_id);
          }
        }}
      />
    </div>
  );
}
