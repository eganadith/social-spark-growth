import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Navigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRole } from "@/hooks/useStaffRole";
import type { DbProfile, DbReward, OrderStatus, ProfileStaffRole } from "@/types/database";
import { getAdminOrderTimeRemaining } from "@/lib/adminOrderTime";
import { BarChart3, DollarSign, Package, ShieldAlert, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureSession } from "@/lib/authSession";
import { invokeAuthedFunction } from "@/lib/supabaseFunctions";
import { useToast } from "@/hooks/use-toast";

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
  payment_id: string | null;
  payment_verified_at: string | null;
  package: { name: string | null; platform: string; followers: number | null } | null;
};

function progressForStatus(s: OrderStatus): number {
  if (s === "pending" || s === "failed") return 5;
  if (s === "paid") return 25;
  if (s === "processing") return 55;
  return 100;
}

/** PostgREST caps each response (often 1000 rows); paginate when using direct .from("orders"). */
const ORDERS_FETCH_PAGE = 1000;

/** Prefer DB RPC — bypasses broken/missing RLS staff policies so admins see every order. */
async function fetchAllOrdersViaRpc(sb: SupabaseClient): Promise<AdminOrder[] | null> {
  const { data, error } = await sb.rpc("admin_list_orders_for_dashboard");
  if (error) return null;
  if (data == null) return [];
  return Array.isArray(data) ? (data as AdminOrder[]) : [];
}

/** Fallback when RPC is not deployed yet; may only return own rows if RLS staff policy is missing. */
async function fetchAllOrdersViaPostgrestSelect(sb: SupabaseClient): Promise<AdminOrder[]> {
  const select =
    "id, tracking_id, status, progress, amount, created_at, profile_link, email, user_id, payment_id, payment_verified_at, package:packages(name, platform, followers)";
  const rows: AdminOrder[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("orders")
      .select(select)
      .order("created_at", { ascending: false })
      .range(from, from + ORDERS_FETCH_PAGE - 1);
    if (error) throw error;
    const batch = (data as AdminOrder[]) ?? [];
    rows.push(...batch);
    if (batch.length < ORDERS_FETCH_PAGE) break;
    from += ORDERS_FETCH_PAGE;
  }
  return rows;
}

async function fetchAllOrdersForAdmin(sb: SupabaseClient): Promise<AdminOrder[]> {
  const viaRpc = await fetchAllOrdersViaRpc(sb);
  if (viaRpc !== null) return viaRpc;
  return fetchAllOrdersViaPostgrestSelect(sb);
}

const ORDER_TABLE_COLUMNS: { label: string; className: string }[] = [
  { label: "Tracking", className: "min-w-[7.5rem]" },
  { label: "Profile link", className: "min-w-[14rem] max-w-[20rem]" },
  { label: "Ordered at", className: "min-w-[11rem]" },
  { label: "Time remaining", className: "min-w-[7rem]" },
  { label: "Progress", className: "min-w-[4.5rem]" },
  { label: "User", className: "min-w-[12rem] max-w-[16rem]" },
  { label: "Platform", className: "min-w-[5.5rem]" },
  { label: "Package", className: "min-w-[7rem]" },
  { label: "AED", className: "min-w-[4rem]" },
  { label: "Payment ID", className: "min-w-[18rem] max-w-[22rem]" },
  { label: "Verified at", className: "min-w-[11rem]" },
  { label: "Status", className: "min-w-[11rem]" },
  { label: "Quick actions", className: "min-w-[12rem]" },
];

function AdminOrdersTable(props: {
  rows: AdminOrder[];
  emptyMessage: string;
  isSuperAdmin: boolean;
  now: number;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const { rows, emptyMessage, isSuperAdmin, now, onStatusChange } = props;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-max min-w-full text-sm border-collapse">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {ORDER_TABLE_COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`text-left px-3 py-3 font-medium whitespace-nowrap align-bottom ${col.className}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-border hover:bg-muted/50 transition-colors align-top">
              <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" title={o.tracking_id}>
                {o.tracking_id}
              </td>
              <td className="px-3 py-3 min-w-[14rem] max-w-[20rem]">
                {o.profile_link?.trim() ? (
                  <a
                    href={o.profile_link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all leading-snug inline-block"
                    title={o.profile_link}
                  >
                    {o.profile_link}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-3 font-mono text-xs whitespace-nowrap tabular-nums">
                {getAdminOrderTimeRemaining(o.created_at, o.status, now)}
              </td>
              <td className="px-3 py-3 tabular-nums text-xs whitespace-nowrap">{o.progress}%</td>
              <td className="px-3 py-3 min-w-[12rem] max-w-[16rem] break-all text-xs">{o.email ?? o.user_id}</td>
              <td className="px-3 py-3 capitalize whitespace-nowrap">{o.package?.platform}</td>
              <td className="px-3 py-3 whitespace-nowrap">{o.package?.name}</td>
              <td className="px-3 py-3 font-medium tabular-nums whitespace-nowrap">{o.amount}</td>
              <td className="px-3 py-3 font-mono text-xs min-w-[18rem] max-w-[22rem] break-all">{o.payment_id ?? "—"}</td>
              <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {o.payment_verified_at ? new Date(o.payment_verified_at).toLocaleString() : "—"}
              </td>
              <td className="px-3 py-3">
                {isSuperAdmin ? (
                  <select
                    value={o.status}
                    onChange={(e) => onStatusChange(o.id, e.target.value as OrderStatus)}
                    className="w-full min-w-[10rem] rounded-md border border-input bg-background px-2 py-2 text-xs capitalize focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label={`Change status for ${o.tracking_id}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                  </select>
                ) : (
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${
                      o.status === "paid"
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                        : o.status === "pending"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : o.status === "failed"
                            ? "border-red-500/40 bg-red-500/10 text-red-400"
                            : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {o.status}
                  </span>
                )}
              </td>
              <td className="px-3 py-3">
                {isSuperAdmin ? (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-[11px] px-2 shrink-0"
                      onClick={() => onStatusChange(o.id, "processing")}
                    >
                      Processing
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-[11px] px-2 shrink-0"
                      onClick={() => onStatusChange(o.id, "completed")}
                    >
                      Completed
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isStaff, isSuperAdmin, loading: roleLoading } = useStaffRole();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [rewards, setRewards] = useState<DbReward[]>([]);
  const [referrals, setReferrals] = useState<
    { id: string; referrer_id: string; referred_user_id: string; order_id: string | null; reward_unlocked: boolean }[]
  >([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDatePreset, setOrderDatePreset] = useState<"all" | "today" | "7d">("all");
  const reduceMotionRef = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduceMotionRef.current) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !user || !isStaff) return;
    setDataLoading(true);
    setError(null);
    try {
      await ensureSession();
      const sb = getSupabase();
      const [ordersData, pRes, rRes, refRes] = await Promise.all([
        fetchAllOrdersForAdmin(sb),
        sb.from("profiles").select("id, email, referral_code, referred_by, created_at, role").order("created_at", { ascending: false }),
        sb.from("rewards").select("*").order("created_at", { ascending: false }),
        sb.from("referrals").select("id, referrer_id, referred_user_id, order_id, reward_unlocked").order("id", { ascending: false }),
      ]);
      if (pRes.error) throw pRes.error;
      if (rRes.error) throw rRes.error;
      if (refRes.error) throw refRes.error;
      setOrders(ordersData);
      setProfiles((pRes.data as DbProfile[]) ?? []);
      setRewards((rRes.data as DbReward[]) ?? []);
      setReferrals(refRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setDataLoading(false);
    }
  }, [user, isStaff]);

  /** Search + date filters apply to all orders; split into open vs completed below. */
  const orderSearchFiltered = useMemo(() => {
    let list = orders;
    const q = orderSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.tracking_id.toLowerCase().includes(q) ||
          (o.email?.toLowerCase().includes(q) ?? false) ||
          o.profile_link.toLowerCase().includes(q) ||
          o.user_id.toLowerCase().includes(q),
      );
    }
    if (orderDatePreset !== "all") {
      const nowMs = Date.now();
      const start =
        orderDatePreset === "today"
          ? new Date(new Date().toDateString()).getTime()
          : nowMs - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((o) => new Date(o.created_at).getTime() >= start);
    }
    return list;
  }, [orders, orderSearch, orderDatePreset]);

  const openOrders = useMemo(
    () => orderSearchFiltered.filter((o) => o.status !== "completed"),
    [orderSearchFiltered],
  );

  const completedOrders = useMemo(
    () => orderSearchFiltered.filter((o) => o.status === "completed"),
    [orderSearchFiltered],
  );

  const orderFiltersActive = Boolean(orderSearch.trim()) || orderDatePreset !== "all";

  useEffect(() => {
    void load();
  }, [load]);

  async function handleOrderStatus(id: string, status: OrderStatus) {
    if (!isSuperAdmin) return;
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

  async function handleProfileRole(profileId: string, next: ProfileStaffRole) {
    if (!isSuperAdmin) return;
    try {
      const sb = getSupabase();
      const { error: err } = await sb.from("profiles").update({ role: next }).eq("id", profileId);
      if (err) throw err;
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: next } : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Role update failed");
    }
  }

  async function handleDeleteUser(profileId: string, emailLabel: string) {
    if (!isSuperAdmin || !user) return;
    if (profileId === user.id) {
      toast({ title: "Cannot delete your own account", variant: "destructive" });
      return;
    }
    if (
      !window.confirm(
        `Permanently delete user ${emailLabel || profileId}? Orders and related data for this account will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await invokeAuthedFunction<{ ok?: boolean }>("delete-user", { user_id: profileId });
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      void load();
      toast({ title: "User deleted" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      setError(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
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

  if (!authLoading && !user) {
    return <Navigate to="/auth?next=/admin" replace />;
  }

  if (user && roleLoading) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center text-muted-foreground text-sm">Loading access…</div>
    );
  }

  if (!authLoading && user && !isStaff) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Staff only</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This area requires <code className="text-xs">admin</code> or <code className="text-xs">super_admin</code> on your row in{" "}
            <code className="text-xs">public.profiles</code>. Ask a super admin to update your role, or run the SQL migration that
            promotes legacy JWT admins.
          </p>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.amount), 0);
  const openOrdersCount = orders.filter((o) => o.status !== "completed").length;

  const stats = [
    { icon: Package, label: "Total orders", value: orders.length.toString() },
    { icon: DollarSign, label: "Revenue (AED)", value: totalRevenue.toFixed(2) },
    { icon: BarChart3, label: "Open (not completed)", value: openOrdersCount.toString() },
    { icon: Users, label: "Users", value: profiles.length.toString() },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="opacity-0 animate-fade-in-up">
            <h1 className="text-3xl font-bold">Admin</h1>
            {isSuperAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Super admin — you can assign staff roles and change order status / quick actions. Everything else matches admin access.
              </p>
            )}
            {isStaff && !isSuperAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Admin — you see every customer order (open and completed), referrals, rewards, and user details. Order status and quick
                actions are super-admin only; staff roles are not shown below.
              </p>
            )}
          </div>
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
          <div className="p-4 border-b border-border space-y-3">
            <div>
              <h2 className="font-semibold">Orders</h2>
              <p className="text-xs text-muted-foreground mt-1">
                All customer orders load from the database (every user). Open = not completed; Completed = finished. Stats use the full
                list; search and date only narrow the two tables below.
                {!dataLoading && orders.length > 0 && (
                  <span className="text-foreground/90"> Loaded {orders.length} order{orders.length === 1 ? "" : "s"}.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Search email, tracking ID, profile URL…"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="max-w-xs h-9 text-sm"
              />
              <select
                value={orderDatePreset}
                onChange={(e) => setOrderDatePreset(e.target.value as "all" | "today" | "7d")}
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="all">Any date</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
              </select>
              {orderFiltersActive && (
                <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={() => {
                  setOrderSearch("");
                  setOrderDatePreset("all");
                }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          {dataLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No orders yet</div>
          ) : orderSearchFiltered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm space-y-3">
              <p>No orders match your search or date filters ({orders.length} loaded in total).</p>
              {orderFiltersActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOrderSearch("");
                    setOrderDatePreset("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-10 p-4 pb-8">
              <div>
                <div className="mb-3 space-y-1">
                  <h3 className="text-sm font-semibold">
                    Pending & in progress{" "}
                    <span className="font-normal text-muted-foreground">({openOrders.length})</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Not completed yet — includes pending, paid, processing, and failed.
                  </p>
                </div>
                <AdminOrdersTable
                  rows={openOrders}
                  emptyMessage="No open orders in this view."
                  isSuperAdmin={isSuperAdmin}
                  now={now}
                  onStatusChange={(id, status) => void handleOrderStatus(id, status)}
                />
              </div>
              <div>
                <div className="mb-3 space-y-1">
                  <h3 className="text-sm font-semibold">
                    Completed <span className="font-normal text-muted-foreground">({completedOrders.length})</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Orders marked as completed.</p>
                </div>
                <AdminOrdersTable
                  rows={completedOrders}
                  emptyMessage="No completed orders in this view."
                  isSuperAdmin={isSuperAdmin}
                  now={now}
                  onStatusChange={(id, status) => void handleOrderStatus(id, status)}
                />
              </div>
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
          <div className="p-4 border-b border-border space-y-1">
            <h2 className="font-semibold">Users</h2>
            {isSuperAdmin ? (
              <p className="text-xs text-muted-foreground">
                Manage staff roles; delete accounts (removes their auth user and related data). Only super admins can delete users.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Referral and account info for support — staff role management is super-admin only.</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  {(isSuperAdmin
                    ? ["Email", "Role", "Referral code", "Referred by", "Joined", "Actions"]
                    : ["Email", "Referral code", "Referred by", "Joined"]
                  ).map((h) => (
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
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <select
                          value={p.role}
                          onChange={(e) => void handleProfileRole(p.id, e.target.value as ProfileStaffRole)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs max-w-[140px]"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs">{p.referral_code}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.referred_by?.slice(0, 8) ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
                          disabled={user?.id === p.id}
                          title={user?.id === p.id ? "Cannot delete yourself" : "Delete user"}
                          onClick={() => void handleDeleteUser(p.id, p.email || p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="text-xs">Delete</span>
                        </Button>
                      </td>
                    )}
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
