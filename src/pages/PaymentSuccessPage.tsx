import { useEffect, useState, useCallback } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { persistAuthNext } from "@/lib/authRedirect";
import { invokeAuthedFunction } from "@/lib/supabaseFunctions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type SyncResponse = {
  tracking_id: string;
  status: string;
  ziina_status: string | null;
  synced: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const orderId = params.get("order_id")?.trim() ?? "";

  const [phase, setPhase] = useState<"syncing" | "done" | "error" | "pending">("syncing");
  const [message, setMessage] = useState("");
  const [trackingId, setTrackingId] = useState<string | null>(null);

  const runSync = useCallback(async () => {
    if (!orderId || !isUuid(orderId)) {
      setPhase("error");
      setMessage("Invalid order reference.");
      return;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const res = await invokeAuthedFunction<SyncResponse>("sync-ziina-payment", { order_id: orderId });
        if (res.tracking_id) setTrackingId(res.tracking_id);
        if (res.synced || res.status === "paid" || res.status === "processing" || res.status === "completed") {
          setPhase("done");
          navigate(`/track?id=${encodeURIComponent(res.tracking_id)}`, { replace: true });
          return;
        }
        if (res.ziina_status === "failed" || res.ziina_status === "canceled") {
          setPhase("error");
          setMessage("This payment did not complete. You can try again from your dashboard.");
          return;
        }
      } catch (e) {
        setPhase("error");
        setMessage(e instanceof Error ? e.message : "Could not confirm payment.");
        return;
      }
      await sleep(1000);
    }
    setPhase("pending");
    setMessage("Your payment is still processing. Check your order status in a moment.");
  }, [orderId, navigate]);

  useEffect(() => {
    if (loading || !isSupabaseConfigured) return;
    if (!user) return;
    void runSync();
  }, [loading, user, runSync]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto text-center text-muted-foreground text-sm">Supabase is not configured.</div>
      </div>
    );
  }

  if (!orderId || !isUuid(orderId)) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid link</h1>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    const next = `/payment/success?order_id=${encodeURIComponent(orderId)}`;
    persistAuthNext(next);
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center space-y-6">
        {phase === "syncing" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">Confirming payment</h1>
              <p className="text-sm text-muted-foreground">This only takes a moment…</p>
            </div>
          </>
        )}
        {phase === "pending" && (
          <>
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">Almost there</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            {trackingId ? (
              <Button asChild variant="hero" className="w-full">
                <Link to={`/track?id=${encodeURIComponent(trackingId)}`}>View order status</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </>
        )}
        {phase === "error" && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">Could not confirm</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <div className="flex flex-col gap-2">
              {trackingId ? (
                <Button asChild variant="hero" className="w-full">
                  <Link to={`/track?id=${encodeURIComponent(trackingId)}`}>Track order</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </>
        )}
        {phase === "done" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground">Redirecting to your order…</p>
          </>
        )}
      </div>
    </div>
  );
}
