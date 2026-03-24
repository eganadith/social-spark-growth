import { useEffect, useState, useCallback } from "react";
import { Link, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { persistAuthNext } from "@/lib/authRedirect";
import { invokeAuthedFunction } from "@/lib/supabaseFunctions";
import { readPaymentIntentFromUrl } from "@/lib/paymentVerification";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type VerifyResponse = {
  verified?: boolean;
  already_verified?: boolean;
  tracking_id?: string;
  status?: string;
  email_sent?: boolean;
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default function SuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const orderId = params.get("order_id")?.trim() ?? "";

  const [phase, setPhase] = useState<"verifying" | "ok" | "err">("verifying");
  const [message, setMessage] = useState("");

  const queryString = params.toString();

  const runVerify = useCallback(async () => {
    if (!orderId || !isUuid(orderId)) {
      setPhase("err");
      setMessage("Invalid order reference.");
      return;
    }

    const sp = new URLSearchParams(queryString);
    let pi = readPaymentIntentFromUrl(sp);
    if (!pi && user && isSupabaseConfigured) {
      const sb = getSupabase();
      const { data: row } = await sb
        .from("orders")
        .select("payment_id")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (row?.payment_id) pi = row.payment_id;
    }

    if (!pi) {
      setPhase("err");
      setMessage("Missing payment reference. Open this page from the payment confirmation link or use Track order while signed in.");
      return;
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const res = await invokeAuthedFunction<VerifyResponse>("verify-payment", {
          order_id: orderId,
          payment_intent_id: pi,
        });
        if (res.verified) {
          setPhase("ok");
          const qs = new URLSearchParams();
          qs.set("payment", "success");
          qs.set("order_status", "processing");
          if (orderId) qs.set("order_id", orderId);
          if (res.tracking_id) qs.set("tracking_id", res.tracking_id);
          navigate(`/dashboard?${qs.toString()}`, { replace: true });
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Verification failed";
        if (msg.includes("not completed") || msg.includes("Payment not completed") || /400/.test(msg)) {
          await sleep(1200);
          continue;
        }
        setPhase("err");
        setMessage(msg);
        return;
      }
    }
    setPhase("err");
    setMessage("Payment is still processing. Check your order status from the dashboard in a moment.");
  }, [orderId, queryString, user, navigate]);

  useEffect(() => {
    if (loading || !isSupabaseConfigured) return;
    if (!user) return;
    void runVerify();
  }, [loading, user, runVerify]);

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
    const next = `/success?${params.toString()}`;
    persistAuthNext(next);
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center space-y-6">
        {phase === "verifying" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">Verifying payment…</h1>
              <p className="text-sm text-muted-foreground">Confirming with our payment provider.</p>
            </div>
          </>
        )}
        {phase === "err" && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-2">Payment not confirmed</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild variant="hero" className="w-full">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/track">Track order</Link>
              </Button>
            </div>
          </>
        )}
        {phase === "ok" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground">Payment successful — taking you to your dashboard…</p>
          </>
        )}
      </div>
    </div>
  );
}
