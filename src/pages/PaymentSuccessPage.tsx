import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { invokeEdgeFunction } from "@/lib/supabaseInvoke";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

const POLL_MS = 20_000;

type CheckPayload = {
  sync?: string;
  order_status?: string;
  error?: string;
};

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get("order_id")?.trim() ?? "";
  const tracking = params.get("tracking")?.trim() ?? "";
  const { user, loading: authLoading } = useAuth();
  const [detail, setDetail] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/dashboard", { replace: true }), 1600);
    return () => clearTimeout(t);
  }, [done, navigate]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !orderId) return;

    let cancelled = false;

    async function tick() {
      try {
        const { data, error, response } = await invokeEdgeFunction<CheckPayload>("check-payment-once", {
          order_id: orderId,
        });
        if (cancelled) return;
        if (error) {
          let msg = error.message;
          if (response) {
            try {
              const j = (await response.json()) as { error?: string };
              if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
            } catch {
              /* ignore */
            }
          }
          setDetail(msg || "Could not verify payment");
          return;
        }
        if (data?.error) {
          setDetail(data.error);
          return;
        }
        const st = data?.order_status ?? "pending";
        if (st !== "pending") {
          setDone(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (e) {
        if (!cancelled) setDetail(e instanceof Error ? e.message : "Verification failed");
      }
    }

    void tick();
    timerRef.current = setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, orderId]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center text-muted-foreground">
        <p>Supabase is not configured.</p>
      </div>
    );
  }

  if (!authLoading && !user) {
    const next = `/payment-success?order_id=${encodeURIComponent(orderId)}${tracking ? `&tracking=${encodeURIComponent(tracking)}` : ""}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!orderId) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center gap-4">
        <p className="text-muted-foreground">Missing order reference.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 pt-24 pb-16">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-card/80 backdrop-blur-xl p-8 text-center shadow-[0_8px_40px_-12px_hsla(280,70%,20%,0.45)]">
        {done ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">Payment received</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your order is processing. You&apos;ll see delivery progress on your dashboard.
            </p>
            <Button asChild variant="hero" className="rounded-xl w-full">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
            {tracking ? (
              <Button asChild variant="ghost" className="rounded-xl w-full mt-2 text-muted-foreground">
                <Link to={`/track?id=${encodeURIComponent(tracking)}`}>Track with link</Link>
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-2">Processing your order</h1>
            <p className="text-sm text-muted-foreground mb-2">
              Confirming payment with Ziina. This usually takes a few seconds; we recheck every {POLL_MS / 1000}{" "}
              seconds.
            </p>
            {detail ? <p className="text-xs text-destructive mt-3">{detail}</p> : null}
            <Button asChild variant="outline" className="rounded-xl w-full mt-6">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
