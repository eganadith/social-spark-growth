import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { findStorePackageById, formatFollowersShort, validateSocialUrl } from "@/lib/store";
import { usePackages } from "@/hooks/usePackages";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Platform } from "@/types/database";
import { Check, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ZIINA_WEBSITE_URL } from "@/lib/paymentLinks";

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

/** Non-2xx invoke responses leave `data` null; the JSON error is on `response` (see @supabase/functions-js). */
async function edgeFunctionErrorDetail(response: Response | undefined, fallback: string): Promise<string> {
  if (!response || response.ok) return fallback;
  try {
    const ct = (response.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
    if (ct === "application/json") {
      const j = (await response.clone().json()) as { error?: unknown };
      if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
    } else {
      const t = (await response.clone().text()).trim();
      if (t) return t.slice(0, 400);
    }
  } catch {
    /* ignore */
  }
  return response.status ? `[${response.status}] ${fallback}` : fallback;
}

const devLocalCheckout = import.meta.env.VITE_DEV_LOCAL_CHECKOUT === "true";

function supabaseProjectRefHint(): string {
  try {
    const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!raw) return "";
    const host = new URL(raw).hostname;
    const ref = host.split(".")[0];
    if (!ref || ref === "localhost") return "";
    return ` Your app is using Supabase project ref “${ref}” — deploy create-payment to that same project.`;
  } catch {
    return "";
  }
}

export default function OrderPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const preselected = params.get("pkg");

  const { user, loading: authLoading, isConfigured } = useAuth();

  const [platform, setPlatform] = useState<Platform | "">("");
  const [profileLink, setProfileLink] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPkg, setSelectedPkg] = useState("");
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsError, setTermsError] = useState("");

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

  const platformMatches = !validation.valid || !platform || validation.platform === platform;

  const canProceedStep1 = Boolean(
    platform &&
      profileLink &&
      validation.valid &&
      platformMatches &&
      email &&
      selectedPkg &&
      user,
  );
  const canProceedStep2 = Boolean(user && pkg && termsAgreed);
  const canProceed = step === 1 ? canProceedStep1 : canProceedStep2;

  async function handlePay() {
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

      if (devLocalCheckout) {
        const trackingId = `SL-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
        const { error: insErr } = await sb.from("orders").insert({
          user_id: user.id,
          package_id: pkg.id,
          amount: pkg.price,
          status: "pending",
          progress: 5,
          tracking_id: trackingId,
          profile_link: profileLink.trim(),
          email: email.trim() || user.email || null,
        });
        if (insErr) throw new Error(insErr.message);
        toast({
          title: "Demo checkout",
          description: "Order saved (no Edge Function). Complete payment in production with create-payment deployed.",
        });
        navigate(`/track?id=${encodeURIComponent(trackingId)}&mock=1`);
        return;
      }

      const { data: refreshed } = await sb.auth.refreshSession();
      const accessToken = refreshed.session?.access_token;
      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again and retry payment.");
      }

      const { data, error, response: fnResponse } = await sb.functions.invoke<{
        checkoutUrl?: string;
        trackingId?: string;
        error?: string;
      }>("create-payment", {
        body: {
          package_id: pkg.id,
          profile_link: profileLink.trim(),
          email: email.trim(),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (error) {
        throw new Error(await edgeFunctionErrorDetail(fnResponse, formatPayError(error)));
      }
      if (data?.error) throw new Error(data.error);
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e) {
      const detail = formatPayError(e);
      const isUnreachable =
        /Failed to send a request to the Edge Function|Relay Error invoking the Edge Function/i.test(detail) ||
        /Failed to fetch|network|load failed|ECONNREFUSED|NetworkError/i.test(detail) ||
        /^\[404\]/i.test(detail);
      const hint = devLocalCheckout
        ? ""
        : isUnreachable
          ? ` Deploy the create-payment Edge Function to this Supabase project (Dashboard → Edge Functions, or CLI: supabase link + npm run functions:deploy). Set ZIINA_API_KEY, PUBLIC_SITE_URL, SUPABASE_SERVICE_ROLE_KEY — see docs/EDGE_FUNCTIONS.md.${supabaseProjectRefHint()}`
          : " Check Ziina: deploy create-payment, set ZIINA_API_KEY + PUBLIC_SITE_URL secrets. Dev-only without Ziina: VITE_DEV_LOCAL_CHECKOUT=true.";
      toast({
        title: "Payment could not start",
        description: `${detail.slice(0, 220)}${detail.length > 220 ? "…" : ""}${hint}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit() {
    if (step === 1) {
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
    void handlePay();
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Orders unavailable</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Configure <code className="text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable checkout.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!authLoading && !user) {
    const next = `/order${params.toString() ? `?${params.toString()}` : ""}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8 opacity-0 animate-fade-in-up">
          <h1 className="text-3xl font-bold mb-2">{step === 1 ? "Place Your Order" : "Checkout"}</h1>
          <p className="text-muted-foreground text-sm">
            {step === 1
              ? "Fill in your details and select a package (prices in AED)"
              : "You’ll be redirected to Ziina’s hosted checkout (card, Apple Pay, Google Pay where supported)"}
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
                  Secure checkout powered by{" "}
                  <a
                    href={ZIINA_WEBSITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    Ziina
                  </a>
                  . Limited daily slots — delivery starts after payment confirms.
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {devLocalCheckout ? (
                  <span className="text-amber-700 dark:text-amber-400">
                    Dev mode: skipping Ziina — order saved as pending only. Do not use in production.
                  </span>
                ) : (
                  <>
                    Pay opens{" "}
                    <a
                      href={ZIINA_WEBSITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-semibold hover:underline"
                    >
                      Ziina
                    </a>{" "}
                    (hosted payment gateway) in your browser. Requires the{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">create-payment</code> function and{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ZIINA_API_KEY</code> secret.
                  </>
                )}
              </p>

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
                <Label htmlFor="order-terms" className="text-sm font-normal leading-relaxed cursor-pointer text-muted-foreground">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms &amp; Conditions
                  </Link>
                  . By continuing, I confirm that I understand the service and agree to pay for the selected package.
                </Label>
              </div>
              {termsError ? <p className="text-sm text-destructive">{termsError}</p> : null}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {step === 2 && (
              <Button variant="outline" type="button" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
            )}
            <Button variant="hero" className="flex-1" disabled={!canProceed || processing || pkgLoading} onClick={handleSubmit}>
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirecting…
                </span>
              ) : step === 1 ? (
                "Continue to payment"
              ) : (
                `Pay ${pkg?.price ?? ""} AED`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
