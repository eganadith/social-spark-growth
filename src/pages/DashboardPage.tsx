import { useEffect, useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { DbReward } from "@/types/database";
import { Copy, Check, Gift } from "lucide-react";
import RewardModal from "@/components/RewardModal";
import { useToast } from "@/hooks/use-toast";
import { REWARD_MILESTONES } from "@/lib/rewardMilestones";

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

  useEffect(() => {
    if (!user || !isConfigured) {
      setLoadingData(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
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
    <div className="min-h-screen pt-24 pb-24 md:pb-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Orders, referrals, and rewards</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/order">New order</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>

        {loadingData ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 shadow-card mb-8">
              <h2 className="font-semibold mb-2">Your referral link</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Total referrals (paid orders):{" "}
                <span className="font-semibold text-foreground">{referralCount}</span>
                <span className="block mt-2 text-xs">
                  Milestones: 1 → FREE100 · 3 → FREE500 · 5 → FREE1000 · 10 → FREE2500 (free likes)
                </span>
              </p>
              {referralCode ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono break-all">{shareUrl}</div>
                  <Button type="button" variant="secondary" className="gap-2 shrink-0" onClick={copyShare}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No referral code yet — complete your profile setup.</p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 shadow-card mb-8">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-400" />
                Rewards unlocked
              </h2>
              <ul className="text-xs text-muted-foreground mb-4 space-y-1 list-disc list-inside">
                {REWARD_MILESTONES.map((m) => (
                  <li key={m.code}>
                    {m.referrals} referral{m.referrals > 1 ? "s" : ""} → {m.likes.toLocaleString()} likes ·{" "}
                    <span className="font-mono text-foreground">{m.code}</span>
                  </li>
                ))}
              </ul>
              {rewards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rewards yet — refer friends to unlock codes.</p>
              ) : (
                <ul className="space-y-3">
                  {rewards.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border p-4"
                    >
                      <div>
                        <div className="font-mono font-semibold">{r.code}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.amount != null ? `${r.amount} ${r.type}` : r.type}
                          {r.is_used ? " · Used" : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRewardFocus(r);
                            setModalOpen(true);
                          }}
                        >
                          View
                        </Button>
                        {!r.is_used && (
                          <Button type="button" variant="secondary" size="sm" onClick={() => void markRewardUsed(r.id)}>
                            Mark used
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-semibold mb-4">Your orders</h2>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No orders yet.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-lg border border-border p-4 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-mono text-xs">{o.tracking_id}</span>
                        <span className="capitalize font-medium">{o.status}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {o.package?.name ?? "Package"} · {o.amount} AED · {o.package?.platform}
                      </div>
                      <Link to={`/track?id=${encodeURIComponent(o.tracking_id)}`} className="text-primary text-xs mt-2 inline-block hover:underline">
                        Track this order
                      </Link>
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
