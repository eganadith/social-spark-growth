import { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { ensureSession } from "@/lib/authSession";
import type { DbReward } from "@/types/database";
import {
  Copy,
  Check,
  Gift,
  Package,
  Share2,
  Sparkles,
  Users,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Lock,
} from "lucide-react";
import RewardModal from "@/components/RewardModal";
import { useToast } from "@/hooks/use-toast";
import { REWARD_MILESTONES } from "@/lib/rewardMilestones";
import { cn } from "@/lib/utils";

type OrderRow = {
  id: string;
  tracking_id: string;
  status: string;
  progress: number;
  amount: number;
  created_at: string;
  profile_link: string;
  package: { name: string | null; platform: string; followers: number | null } | null;
};

function referralProgressToNext(referralCount: number): { pct: number; next: (typeof REWARD_MILESTONES)[number] | null } {
  const milestones = [...REWARD_MILESTONES];
  let prev = 0;
  for (const m of milestones) {
    if (referralCount >= m.referrals) prev = m.referrals;
  }
  const next = milestones.find((m) => referralCount < m.referrals) ?? null;
  if (!next) return { pct: 100, next: null };
  const denom = next.referrals - prev;
  const pct = denom <= 0 ? 100 : Math.min(100, Math.round(((referralCount - prev) / denom) * 100));
  return { pct, next };
}

function statusStyles(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  if (s === "processing" || s === "paid") return "bg-sky-500/15 text-sky-400 border-sky-500/25";
  if (s === "pending") return "bg-amber-500/15 text-amber-400 border-amber-500/25";
  return "bg-muted text-muted-foreground border-border";
}

function platformLabel(p: string | undefined): string {
  if (!p) return "Social";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export default function DashboardPage() {
  const { user, loading, signOut, isConfigured } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [rewards, setRewards] = useState<DbReward[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rewardFocus, setRewardFocus] = useState<DbReward | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (!referralCode || typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${referralCode}`;
  }, [referralCode]);

  const greeting = useMemo(() => {
    const email = user?.email;
    if (!email) return "Welcome back";
    const name = email.split("@")[0]?.replace(/[._]/g, " ");
    return `Hey, ${name}`;
  }, [user?.email]);

  const { pct: nextTierPct, next: nextTier } = useMemo(
    () => referralProgressToNext(referralCount),
    [referralCount],
  );

  useEffect(() => {
    if (!user || !isConfigured) {
      setLoadingData(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await ensureSession();
        const sb = getSupabase();
        const [oRes, rRes, pRes, cRes] = await Promise.all([
          sb
            .from("orders")
            .select("id, tracking_id, status, progress, amount, created_at, profile_link, package:packages(name, platform, followers)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          sb.from("rewards").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
          sb.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
          sb.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id),
        ]);
        if (cancelled) return;
        setOrders((oRes.data as OrderRow[]) ?? []);
        setRewards((rRes.data as DbReward[]) ?? []);
        setReferralCode(pRes.data?.referral_code ?? null);
        setReferralCount(cRes.count ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isConfigured]);

  async function copyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied" });
  }

  async function markRewardUsed(id: string) {
    try {
      const sb = getSupabase();
      const { error } = await sb.from("rewards").update({ is_used: true }).eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
      setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, is_used: true } : r)));
      toast({ title: "Marked as used" });
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center text-muted-foreground">
        Configure Supabase to use the dashboard.
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/auth?next=/dashboard" replace />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] px-3 sm:px-4 pt-[max(6rem,calc(env(safe-area-inset-top,0px)+4.5rem))] pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] md:pt-24 md:pb-20">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card via-card to-primary/[0.07] p-5 sm:p-8 mb-6 sm:mb-8 shadow-[0_8px_40px_-12px_hsla(280,70%,20%,0.45)]">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-accent/15 blur-2xl pointer-events-none" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground opacity-0 animate-fade-in-up">Your workspace</p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight opacity-0 animate-fade-in-up [animation-delay:0.05s]">
                <span className="ig-gradient-text">Dashboard</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-md opacity-0 animate-fade-in-up [animation-delay:0.1s]">
                {greeting} — track orders, share your link, and collect referral rewards.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto opacity-0 animate-fade-in-up [animation-delay:0.12s]">
              <Button asChild variant="hero" size="sm" className="rounded-xl shadow-lg flex-1 min-h-12 sm:flex-initial sm:min-h-9">
                <Link to="/order">New order</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-white/15 bg-background/40 backdrop-blur-sm min-h-12 sm:min-h-9 px-5"
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl bg-muted/60" />
              ))}
            </div>
            <Skeleton className="h-56 rounded-2xl bg-muted/60" />
            <Skeleton className="h-48 rounded-2xl bg-muted/60" />
            <Skeleton className="h-40 rounded-2xl bg-muted/60" />
          </div>
        ) : (
          <>
            {/* Stat pills */}
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-3 mb-6 sm:mb-8">
              {[
                {
                  icon: Package,
                  label: "Orders",
                  value: orders.length.toString(),
                  sub: orders.length === 1 ? "active package" : "all time",
                  delay: "0s",
                },
                {
                  icon: Users,
                  label: "Referrals",
                  value: referralCount.toString(),
                  sub: "paid conversions",
                  delay: "0.06s",
                },
                {
                  icon: Gift,
                  label: "Rewards",
                  value: rewards.length.toString(),
                  sub: "codes unlocked",
                  delay: "0.12s",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/80 p-5 shadow-card opacity-0 animate-fade-in-up backdrop-blur-sm transition-shadow hover:shadow-[0_12px_40px_-12px_hsla(280,60%,30%,0.35)]"
                  style={{ animationDelay: s.delay }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className="mt-2 text-3xl font-black tabular-nums ig-gradient-text">{s.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
                      <s.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Referral */}
            <section
              className="rounded-2xl sm:rounded-3xl border border-white/[0.1] bg-card/70 p-4 sm:p-8 shadow-card mb-6 sm:mb-8 opacity-0 animate-fade-in-up backdrop-blur-xl"
              style={{ animationDelay: "0.14s" }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl gradient-bg text-white shadow-lg">
                    <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold leading-snug">Your referral link</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                      Friends who purchase count toward your milestones.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 rounded-xl bg-muted/40 px-3 py-2 self-start sm:self-center">
                  <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <span className="font-semibold text-foreground">{referralCount}</span> paid referral
                    {referralCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Milestone stepper — 2×2 on narrow phones for readability */}
              <div className="mb-5 sm:mb-6 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 sm:mb-4">
                  Milestone path
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3">
                  {REWARD_MILESTONES.map((m) => {
                    const unlocked = referralCount >= m.referrals;
                    return (
                      <div
                        key={m.code}
                        className="flex flex-col items-center text-center rounded-xl border border-white/[0.06] bg-background/30 py-3 px-2 sm:border-0 sm:bg-transparent sm:py-0"
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 transition-all",
                            unlocked
                              ? "border-transparent gradient-bg text-white shadow-md"
                              : "border-border bg-background/80 text-muted-foreground",
                          )}
                        >
                          {unlocked ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                        </div>
                        <span className="mt-2 text-[11px] sm:text-xs font-bold text-foreground leading-tight">
                          {m.referrals} paid referral{m.referrals === 1 ? "" : "s"}
                        </span>
                        <span className="mt-0.5 text-lg sm:text-base font-black tabular-nums ig-gradient-text leading-none">{m.likes}</span>
                        <span className="text-[10px] text-muted-foreground">free likes</span>
                        <span className="mt-1 text-[10px] sm:text-[10px] text-foreground font-mono font-bold leading-tight">{m.code}</span>
                      </div>
                    );
                  })}
                </div>
                {nextTier && (
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress to {nextTier.code}</span>
                      <span className="font-mono text-foreground">{nextTierPct}%</span>
                    </div>
                    <Progress
                      value={nextTierPct}
                      className="h-2.5 bg-muted/50 [&>div]:!bg-gradient-to-r [&>div]:from-fuchsia-500 [&>div]:to-violet-600"
                    />
                    <p className="text-xs text-muted-foreground">
                      {nextTier.referrals - referralCount > 0
                        ? `${nextTier.referrals - referralCount} more paid referral${nextTier.referrals - referralCount === 1 ? "" : "s"} for ${nextTier.likes.toLocaleString()} bonus likes.`
                        : "You’ve reached the next tier — rewards sync after their payment clears."}
                    </p>
                  </div>
                )}
                {!nextTier && referralCount >= REWARD_MILESTONES[REWARD_MILESTONES.length - 1].referrals && (
                  <p className="mt-4 text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    All milestone tiers unlocked — keep sharing for ongoing growth.
                  </p>
                )}
              </div>

              {referralCode ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="relative flex-1 min-w-0 rounded-xl border border-white/10 bg-background/50 ring-offset-background focus-within:ring-2 focus-within:ring-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-background transition-shadow">
                    <div className="flex items-start gap-2.5 px-3.5 py-3.5 sm:px-4 sm:py-3">
                      <Gift className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your link</p>
                        <p className="text-xs sm:text-sm font-mono break-all text-foreground/90 leading-relaxed">{shareUrl}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2 shrink-0 rounded-xl min-h-12 w-full sm:w-auto sm:min-h-[2.75rem] sm:px-6"
                    onClick={copyShare}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  No referral code on your profile yet. If this persists, contact support.
                </div>
              )}
            </section>

            {/* Rewards */}
            <section
              className="rounded-2xl sm:rounded-3xl border border-white/[0.1] bg-card/70 p-4 sm:p-8 shadow-card mb-6 sm:mb-8 opacity-0 animate-fade-in-up backdrop-blur-xl"
              style={{ animationDelay: "0.18s" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/25">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Rewards</h2>
                  <p className="text-sm text-muted-foreground">Codes appear here when milestones unlock.</p>
                </div>
              </div>

              {rewards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/20 to-transparent px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                    <Gift className="h-8 w-8 opacity-60" />
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">No reward codes yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    Share your link above. When friends complete a paid order, you unlock free like bonuses (FREE100, FREE500, and more).
                  </p>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/">See packages to share</Link>
                  </Button>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {rewards.map((r) => (
                    <li
                      key={r.id}
                      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-background/80 to-primary/[0.04] p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Code</span>
                          <div className="font-mono text-xl font-black tracking-wide ig-gradient-text">{r.code}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.amount != null ? `${r.amount} ${r.type}` : r.type}
                            {r.is_used ? (
                              <span className="ml-2 text-emerald-400 font-medium">· Redeemed</span>
                            ) : (
                              <span className="ml-2 text-amber-400/90 font-medium">· Ready</span>
                            )}
                          </div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-auto">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg flex-1 sm:flex-none"
                          onClick={() => {
                            setRewardFocus(r);
                            setModalOpen(true);
                          }}
                        >
                          Details
                        </Button>
                        {!r.is_used && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="rounded-lg flex-1 sm:flex-none"
                            onClick={() => void markRewardUsed(r.id)}
                          >
                            Mark used
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Orders */}
            <section
              className="rounded-2xl sm:rounded-3xl border border-white/[0.1] bg-card/70 p-4 sm:p-8 shadow-card opacity-0 animate-fade-in-up backdrop-blur-xl"
              style={{ animationDelay: "0.22s" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/25">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Your orders</h2>
                  <p className="text-sm text-muted-foreground">Live status for every package you&apos;ve purchased.</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-muted/20 to-transparent px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-60" />
                  </div>
                  <p className="text-base font-semibold text-foreground mb-1">No orders yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    Pick a growth package and checkout — you&apos;ll track delivery progress here.
                  </p>
                  <Button asChild variant="hero" className="rounded-xl">
                    <Link to="/order">Browse packages</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-white/[0.08] bg-background/40 p-5 transition-all hover:border-primary/20 hover:bg-background/60"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold tracking-wide text-foreground/90">{o.tracking_id}</span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                statusStyles(o.status),
                              )}
                            >
                              {o.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{o.package?.name ?? "Growth package"}</span>
                            {" · "}
                            <span className="tabular-nums">{o.amount} AED</span>
                            {" · "}
                            <span className="capitalize">{platformLabel(o.package?.platform)}</span>
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-primary shrink-0" asChild>
                          <Link to={`/track?id=${encodeURIComponent(o.tracking_id)}`}>
                            Track
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          <span>Delivery progress</span>
                          <span>{Math.round(Number(o.progress) || 0)}%</span>
                        </div>
                        <Progress
                          value={Math.min(100, Math.max(0, Number(o.progress) || 0))}
                          className="h-2.5 bg-muted/50 [&>div]:!bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-pink-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <RewardModal reward={rewardFocus} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
