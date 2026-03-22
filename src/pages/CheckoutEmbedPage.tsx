import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutContext } from "@/lib/ziinaCheckoutStorage";
import {
  clearCheckoutContext,
  clearZiinaCheckoutUrl,
  peekCheckoutContext,
  peekZiinaCheckoutUrl,
} from "@/lib/ziinaCheckoutStorage";

/**
 * In-app Ziina checkout: Socioly-themed shell + iframe to pay.ziina.com.
 * If the provider blocks framing, use "Open full window".
 */
export default function CheckoutEmbedPage() {
  const navigate = useNavigate();
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CheckoutContext | null>(null);

  useEffect(() => {
    const url = peekZiinaCheckoutUrl();
    setCtx(peekCheckoutContext());
    if (!url) {
      navigate("/dashboard", { replace: true });
      return;
    }
    setIframeUrl(url);
  }, [navigate]);

  const leaveCheckout = useCallback(() => {
    clearZiinaCheckoutUrl();
    clearCheckoutContext();
  }, []);

  const handleBack = () => {
    leaveCheckout();
    navigate("/dashboard", { replace: true });
  };

  const openFullWindow = () => {
    if (!iframeUrl) return;
    leaveCheckout();
    window.location.assign(iframeUrl);
  };

  if (!iframeUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading checkout…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur-md">
        <Button type="button" variant="ghost" size="sm" className="gap-2 -ml-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Link to="/" className="font-bold tracking-tight ig-gradient-text text-lg">
          Socioly
        </Link>
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={openFullWindow}>
          Full window
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left — Socioly / order context (theme) */}
        <aside className="relative flex flex-col justify-between border-b border-border/40 bg-gradient-to-br from-card via-card to-primary/[0.12] p-6 lg:w-[min(420px,38vw)] lg:border-b-0 lg:border-r lg:p-8">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          </div>
          <div className="relative space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg text-sm font-black text-white shadow-lg">
              S
            </div>
            <div>
              <p className="inline-flex rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                Secure checkout
              </p>
              <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                Complete your <span className="ig-gradient-text">payment</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                You&apos;re paying through Ziina on a secure page. Your order stays linked to your Socioly account.
              </p>
            </div>
            {(ctx?.amountLabel || ctx?.trackingId || ctx?.packageName) && (
              <div className="rounded-2xl border border-white/10 bg-background/50 p-4 backdrop-blur-sm space-y-2 text-sm">
                {ctx.packageName ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium text-right">{ctx.packageName}</span>
                  </div>
                ) : null}
                {ctx.amountLabel ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold tabular-nums">{ctx.amountLabel}</span>
                  </div>
                ) : null}
                {ctx.trackingId ? (
                  <div className="flex justify-between gap-4 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Tracking</span>
                    <span className="font-mono text-xs font-semibold">{ctx.trackingId}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <div className="relative mt-8 flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-4 text-xs text-muted-foreground backdrop-blur-sm lg:mt-0">
            <Shield className="h-5 w-5 shrink-0 text-primary" />
            <span>Encrypted checkout via Ziina. Socioly never sees your card details.</span>
          </div>
        </aside>

        {/* Right — hosted payment UI */}
        <main className="relative flex min-h-0 flex-1 flex-col bg-muted/30 p-3 sm:p-4 lg:p-6">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground sm:hidden">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Scroll to pay</span>
          </div>
          <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)]">
            <iframe
              title="Ziina secure checkout"
              src={iframeUrl}
              className="h-full min-h-[560px] w-full flex-1 border-0 bg-white"
              allow="payment *; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            If the form doesn&apos;t load,{" "}
            <button type="button" className="text-primary underline font-medium" onClick={openFullWindow}>
              open checkout in full window
            </button>
            .
          </p>
        </main>
      </div>
    </div>
  );
}
