import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
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
  pending: { label: "Pending payment", color: "text-amber-400", icon: Clock, progress: 5 },
  paid: { label: "Paid", color: "text-sky-400", icon: CreditCard, progress: 25 },
  processing: { label: "Processing", color: "text-violet-400", icon: Package, progress: 55 },
  completed: { label: "Completed", color: "text-emerald-400", icon: CheckCircle2, progress: 100 },
};

export default function TrackPage() {
  const [params] = useSearchParams();
  const [trackingId, setTrackingId] = useState(params.get("id") || "");
  const [order, setOrder] = useState<TrackOrderPayload | null>(null);
  const [searched, setSearched] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const mock = params.get("mock") === "1";

  useEffect(() => {
    if (params.get("id")) void runSearch(params.get("id")!.trim());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!order || order.status === "pending") return;
    if (!shouldShowReferralPrompt(order.tracking_id)) return;
    setReferralOpen(true);
  }, [order]);

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
      {/* Full-viewport background */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <img
          src={TRACK_PAGE_BG}
          alt=""
          className="h-full w-full object-cover object-center"
          width={1920}
          height={1080}
          decoding="async"
        />
        {/* Readability: vignette + slight blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/65 to-background/90 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-20 pt-24 md:pb-16 md:pt-28">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
          {/* Glass card */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl ring-1 ring-white/10 md:p-8 supports-[backdrop-filter]:bg-white/[0.06]">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Track your order</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Enter your tracking ID — delivery updates appear here in real time.
              </p>
              {mock && (
                <p className="mt-3 text-xs text-amber-400/90">
                  Demo mode: complete a test order to see status here when Ziina is not configured.
                </p>
              )}
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-muted-foreground">
                Connect Supabase to load orders from your database.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex min-h-12 flex-1 items-center rounded-xl border border-white/12 bg-white/[0.06] px-3 backdrop-blur-sm">
                <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. SL-ABC123"
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
              <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] py-8 text-center">
                <AlertCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground px-2">
                  No order found for this ID. Check the code in your email and try again.
                </p>
              </div>
            )}

            {order && config && (
              <div className="mt-8 space-y-5 border-t border-white/10 pt-6">
                <div className="text-center py-1">
                  <config.icon className={`mx-auto mb-3 h-12 w-12 ${config.color}`} />
                  <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{order.tracking_id}</div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                  {[
                    { label: "Platform", value: order.platform },
                    { label: "Package", value: order.package_name ?? "—" },
                    { label: "Price", value: `${order.amount} AED` },
                    { label: "Profile", value: order.profile_link },
                    { label: "Ordered", value: new Date(order.created_at).toLocaleDateString() },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 text-sm">
                      <span className="shrink-0 text-muted-foreground">{row.label}</span>
                      <span className="min-w-0 truncate text-right font-medium capitalize text-foreground">
                        {row.value}
                      </span>
                    </div>
                  ))}
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
