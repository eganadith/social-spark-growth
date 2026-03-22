import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { findStorePackageById, formatFollowersShort, validateSocialUrl } from "@/lib/store";
import { usePackages } from "@/hooks/usePackages";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Platform } from "@/types/database";
import { Check, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { persistAuthNext } from "@/lib/authRedirect";
import { savePendingOrderDraft, loadPendingOrderDraft, clearPendingOrderDraft } from "@/lib/orderDraft";
import { invokeAuthedFunction } from "@/lib/supabaseFunctions";
import { buildZiinaPaymentBody } from "@/lib/ziinaCheckout";
import { setCheckoutContext, setZiinaCheckoutUrl } from "@/lib/ziinaCheckoutStorage";

function isUuidParam(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function formatPayError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

export default function OrderPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const preselected = params.get("pkg");

  const { user, isConfigured } = useAuth();

  const [platform, setPlatform] = useState<Platform | "">("");
  const [profileLink, setProfileLink] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPkg, setSelectedPkg] = useState("");
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsError, setTermsError] = useState("");
  const submitIdempotencyRef = useRef<string | null>(null);

  const { data: packages = [], isLoading: pkgLoading } = usePackages(platform);

  const validation = useMemo(() => validateSocialUrl(profileLink), [profileLink]);
  const pkg = packages.find((p) => p.id === selectedPkg);

  useEffect(() => {
    if (!preselected || !isConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        if (isUuidParam(preselected)) {
          const { data, error } = await sb.from("packages").select("*").eq("id", preselected).maybeSingle();
          if (cancelled || error || !data) return;
          setPlatform(data.platform as Platform);
          setSelectedPkg(data.id);
          return;
        }
        const cat = findStorePackageById(preselected);
        if (!cat) return;
        const { data, error } = await sb
          .from("packages")
          .select("*")
          .eq("platform", cat.platform)
          .eq("followers", cat.followers)
          .maybeSingle();
        if (cancelled || error || !data) return;
        setPlatform(data.platform as Platform);
        setSelectedPkg(data.id);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselected, isConfigured]);

  useEffect(() => {
    if (user?.email) setEmail((prev) => prev || user.email || "");
  }, [user?.email]);

  useEffect(() => {
    if (!user && step === 2) {
      setStep(1);
      setTermsAgreed(false);
    }
  }, [user, step]);

  useEffect(() => {
    if (!user || !isConfigured) return;
    if (preselected) {
      clearPendingOrderDraft();
      return;
    }
    const d = loadPendingOrderDraft();
    if (!d) return;
    if (d.platform) setPlatform(d.platform);
    setProfileLink(d.profileLink);
    setEmail(d.email);
    setSelectedPkg(d.selectedPkg);
    setStep(d.step);
    setTermsAgreed(d.termsAgreed);
    clearPendingOrderDraft();
  }, [user, isConfigured, preselected]);

  const platformMatches = !validation.valid || !platform || validation.platform === platform;

  const canProceedStep1Guest = Boolean(
    platform && profileLink && validation.valid && platformMatches && email && selectedPkg,
  );
  const canProceedStep2 = Boolean(user && pkg && termsAgreed);
  const canProceed = step === 1 ? canProceedStep1Guest : canProceedStep2;

  async function handleSubmitOrder() {
    if (!user || !pkg) return;
    if (!termsAgreed) {
      const msg = "You must agree to the Terms and Conditions before proceeding.";
      setTermsError(msg);
      toast({ title: "Terms required", description: msg, variant: "destructive" });
      return;
    }
    setTermsError("");
    setProcessing(true);
    try {
      const sb = getSupabase();
      if (!submitIdempotencyRef.current) submitIdempotencyRef.current = crypto.randomUUID();
      const trackingId = `SL-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
      const { data: inserted, error: insErr } = await sb
        .from("orders")
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          amount: pkg.price,
          status: "pending",
          progress: 5,
          tracking_id: trackingId,
          profile_link: profileLink.trim(),
          email: email.trim() || user.email || null,
          idempotency_key: submitIdempotencyRef.current,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      if (!inserted?.id) throw new Error("Order was not created");

      let redirectUrl: string;
      try {
        const pay = await invokeAuthedFunction<{ redirect_url: string }>(
          "create-ziina-payment",
          buildZiinaPaymentBody(inserted.id),
        );
        redirectUrl = pay.redirect_url;
        if (!redirectUrl) throw new Error("No checkout URL returned");
      } catch (e) {
        const detail = formatPayError(e);
        toast({
          title: "Order saved — payment could not start",
          description: `${detail.slice(0, 220)}${detail.length > 220 ? "…" : ""} You can retry from your dashboard.`,
          variant: "destructive",
        });
        clearPendingOrderDraft();
        navigate(`/dashboard`);
        return;
      }

      clearPendingOrderDraft();
      try {
        setCheckoutContext({
          trackingId,
          amountLabel: `${pkg.price} AED`,
          packageName: pkg.name ?? undefined,
        });
        setZiinaCheckoutUrl(redirectUrl);
      } catch {
        toast({
          title: "Invalid checkout URL",
          description: "Use “Full window” from the dashboard or contact support.",
          variant: "destructive",
        });
        navigate(`/dashboard`);
        return;
      }
      toast({
        title: "Opening secure checkout",
        description: `Tracking ID: ${trackingId}. Complete payment to confirm your order.`,
      });
      navigate("/checkout");
    } catch (e) {
      const detail = formatPayError(e);
      toast({
        title: "Could not submit order",
        description: `${detail.slice(0, 220)}${detail.length > 220 ? "…" : ""}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit() {
    if (step === 1) {
      if (!canProceedStep1Guest) {
        toast({
          title: "Complete the form",
          description: "Select platform, package, profile link, and email to continue.",
          variant: "destructive",
        });
        return;
      }
      if (!user) {
        const next = `/order${params.toString() ? `?${params.toString()}` : ""}`;
        savePendingOrderDraft({
          platform,
          profileLink,
          email,
          selectedPkg,
          step: 2,
          termsAgreed: false,
        });
        persistAuthNext(next);
        navigate(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      submitIdempotencyRef.current = null;
      setStep(2);
      setTermsError("");
      return;
    }
    if (!termsAgreed) {
      const msg = "You must agree to the Terms and Conditions before proceeding.";
      setTermsError(msg);
      toast({ title: "Terms required", description: msg, variant: "destructive" });
      return;
    }
    void handleSubmitOrder();
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Orders unavailable</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Configure <code className="text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable orders.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8 opacity-0 animate-fade-in-up">
          <h1 className="text-3xl font-bold mb-2">{step === 1 ? "Place your order" : "Review & submit"}</h1>
          <p className="text-muted-foreground text-sm">
            {step === 1
              ? "Fill in your details and select a package (prices in AED)"
              : "Confirm your package and accept the terms — you’ll pay securely via Ziina, then we’ll confirm your order"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s ? "gradient-bg text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > 1 ? "gradient-bg" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div
          className="rounded-2xl bg-card border border-border p-6 shadow-card opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value as Platform | "");
                    setSelectedPkg("");
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select platform</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Profile / page link</label>
                <input
                  type="url"
                  value={profileLink}
                  onChange={(e) => setProfileLink(e.target.value)}
                  placeholder="https://instagram.com/yourprofile"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {profileLink && validation.valid && platformMatches && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-3">
                    <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                      {validation.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">@{validation.username}</div>
                      <div className="text-xs text-muted-foreground capitalize">{validation.platform}</div>
                    </div>
                    <Check className="h-4 w-4 text-accent ml-auto" />
                  </div>
                )}
                {profileLink && (!validation.valid || !platformMatches) && (
                  <div className="mt-2 flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {!validation.valid
                      ? "Enter a valid Instagram, Facebook, or TikTok URL"
                      : "URL platform must match the platform you selected"}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {platform && (
                <div>
                  <label className="block text-sm font-medium mb-2">Package</label>
                  {pkgLoading ? (
                    <p className="text-sm text-muted-foreground">Loading packages…</p>
                  ) : packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No packages for this platform.</p>
                  ) : (
                    <div className="space-y-2">
                      {packages.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPkg(p.id)}
                          className={`w-full flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                            selectedPkg === p.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div>
                            <span className="font-medium">{p.name}</span>
                            {p.followers != null && (
                              <span className="ml-2 text-xs font-bold text-muted-foreground uppercase">
                                {formatFollowersShort(p.followers)}
                              </span>
                            )}
                            {p.popular && (
                              <span className="ml-2 text-xs font-semibold text-primary">Most Popular</span>
                            )}
                          </div>
                          <span className="font-bold">{p.price} AED</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{pkg?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reach</span>
                  <span className="font-medium">
                    {pkg?.followers != null ? `${formatFollowersShort(pkg.followers)} followers` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium capitalize">{platform}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">{pkg?.price} AED</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Your profile link and email are stored securely. Limited daily slots — we&apos;ll confirm next steps
                  after you submit.
                </span>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <Checkbox
                  id="order-terms"
                  checked={termsAgreed}
                  onCheckedChange={(c) => {
                    const on = c === true;
                    setTermsAgreed(on);
                    if (on) setTermsError("");
                  }}
                  className="mt-0.5"
                  aria-invalid={Boolean(termsError)}
                />
                <p className="text-sm font-normal leading-relaxed text-muted-foreground">
                  <label htmlFor="order-terms" className="cursor-pointer">
                    I agree to the{" "}
                  </label>
                  <Link
                    to="/terms"
                    className="text-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms &amp; Conditions
                  </Link>
                  <label htmlFor="order-terms" className="cursor-pointer">
                    . By continuing, I confirm that I understand the service and the order total shown above.
                  </label>
                </p>
              </div>
              {termsError ? <p className="text-sm text-destructive">{termsError}</p> : null}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {step === 2 && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  submitIdempotencyRef.current = null;
                  setStep(1);
                }}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="hero"
              className="flex-1"
              disabled={!canProceed || processing || pkgLoading}
              onClick={handleSubmit}
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
                </span>
              ) : step === 1 ? (
                user ? "Continue to review" : "Sign in to continue"
              ) : (
                `Submit order · ${pkg?.price ?? ""} AED`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
