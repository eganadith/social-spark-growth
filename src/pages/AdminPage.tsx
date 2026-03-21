import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { DbProfile, DbReward, OrderStatus } from "@/types/database";
import { getAdminOrderTimeRemaining } from "@/lib/adminOrderTime";
import { BarChart3, DollarSign, Package, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminOrder = {
  id: string;
  tracking_id: string;
  status: OrderStatus;
  progress: number;
  amount: number;
  created_at: string;
  profile_link: string;
  email: string | null;
  user_id: string;
  package: { name: string | null; platform: string; followers: number | null } | null;
};

function progressForStatus(s: OrderStatus): number {
  if (s === "pending") return 5;
  if (s === "paid") return 25;
  if (s === "processing") return 55;
  return 100;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === "admin";

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [rewards, setRewards] = useState<DbReward[]>([]);
  const [referrals, setReferrals] = useState<
    { id: string; referrer_id: string; referred_user_id: string; order_id: string | null; reward_unlocked: boolean }[]
  >([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reduceMotionRef = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduceMotionRef.current) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user || !isAdmin) return;
    setDataLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const [oRes, pRes, rRes, refRes] = await Promise.all([
        sb
          .from("orders")
          .select(
            "id, tracking_id, status, progress, amount, created_at, profile_link, email, user_id, package:packages(name, platform, followers)",
          )
          .order("created_at", { ascending: false }),
        sb.from("profiles").select("id, email, referral_code, referred_by, created_at").order("created_at", { ascending: false }),
        sb.from("rewards").select("*").order("created_at", { ascending: false }),
        sb.from("referrals").select("id, referrer_id, referred_user_id, order_id, reward_unlocked").order("id", { ascending: false }),
      ]);
      if (oRes.error) throw oRes.error;
      if (pRes.error) throw pRes.error;
      if (rRes.error) throw rRes.error;
      if (refRes.error) throw refRes.error;
      setOrders((oRes.data as AdminOrder[]) ?? []);
      setProfiles((pRes.data as DbProfile[]) ?? []);
      setRewards((rRes.data as DbReward[]) ?? []);
      setReferrals(refRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setDataLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOrderStatus(id: string, status: OrderStatus) {
    try {
      const sb = getSupabase();
      const progress = progressForStatus(status);
      const { error: err } = await sb.from("orders").update({ status, progress }).eq("id", id);
      if (err) throw err;
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, progress } : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function toggleRewardUsed(r: DbReward) {
    try {
      const sb = getSupabase();
      const next = !r.is_used;
      const { error: err } = await sb.from("rewards").update({ is_used: next }).eq("id", r.id);
      if (err) throw err;
      setRewards((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_used: next } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center text-muted-foreground">
        Configure Supabase for admin tools.
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/auth?next=/admin" replace />;
  }

  if (!loading && user && !isAdmin) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Admin only</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Set <code className="text-xs">app_metadata.role</code> to <code className="text-xs">admin</code> for your user in the
            Supabase Dashboard (Authentication → Users → user → edit raw app metadata).
          </p>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.amount), 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const stats = [
    { icon: Package, label: "Total orders", value: orders.length.toString() },
    { icon: DollarSign, label: "Revenue (AED)", value: totalRevenue.toFixed(2) },
    { icon: BarChart3, label: "Pending", value: pendingCount.toString() },
    { icon: Users, label: "Users", value: profiles.length.toString() },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold opacity-0 animate-fade-in-up">Admin</h1>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={dataLoading}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="rounded-xl bg-card border border-border p-5 shadow-card opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-bold">{s.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-xl bg-card border border-border shadow-card overflow-hidden mb-8 opacity-0 animate-fade-in-up">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Orders</h2>
          </div>
          {dataLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No orders</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {[
                      "Tracking",
                      "Profile link",
                      "Ordered at",
                      "Time remaining",
                      "User",
                      "Platform",
                      "Package",
                      "AED",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{o.tracking_id}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {o.profile_link?.trim() ? (
                          <a
                            href={o.profile_link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate block max-w-[200px]"
                            title={o.profile_link}
                          >
                            {o.profile_link}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap tabular-nums">
                        {getAdminOrderTimeRemaining(o.created_at, o.status, now)}
                      </td>
                      <td className="px-4 py-3 truncate max-w-[140px]">{o.email ?? o.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 capitalize">{o.package?.platform}</td>
                      <td className="px-4 py-3">{o.package?.name}</td>
                      <td className="px-4 py-3 font-medium">{o.amount}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => void handleOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-card border border-border shadow-card overflow-hidden mb-8 opacity-0 animate-fade-in-up">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Referrals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {["Referrer", "Referred", "Order", "Unlocked"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{r.referrer_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.referred_user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.order_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-4 py-3">{r.reward_unlocked ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-card border border-border shadow-card overflow-hidden mb-8 opacity-0 animate-fade-in-up">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {["Email", "Referral code", "Referred by", "Joined"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 truncate max-w-[200px]">{p.email || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.referral_code}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.referred_by?.slice(0, 8) ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-card border border-border shadow-card overflow-hidden opacity-0 animate-fade-in-up">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Rewards</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {["User", "Code", "Amount", "Used"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rewards.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono">{r.code}</td>
                    <td className="px-4 py-3">{r.amount ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => void toggleRewardUsed(r)}>
                        {r.is_used ? "Mark unused" : "Mark used"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
