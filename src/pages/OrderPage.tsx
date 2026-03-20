import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { packages, validateSocialUrl, saveOrder, generateTrackingId, type Order } from "@/lib/store";
import { Check, AlertCircle, CreditCard, Smartphone, Shield } from "lucide-react";

export default function OrderPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const preselected = params.get("pkg");

  const [platform, setPlatform] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [email, setEmail] = useState("");
  const [selectedPkg, setSelectedPkg] = useState(preselected || "");
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);

  const validation = useMemo(() => validateSocialUrl(profileLink), [profileLink]);
  const pkg = packages.find((p) => p.id === selectedPkg);

  useEffect(() => {
    if (preselected) {
      const p = packages.find((x) => x.id === preselected);
      if (p) setPlatform(p.platform);
    }
  }, [preselected]);

  const filteredPackages = packages.filter((p) => p.platform === platform);

  const canProceed =
    step === 1
      ? platform && profileLink && validation.valid && email && selectedPkg
      : true;

  function handleSubmit() {
    if (step === 1) {
      setStep(2);
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      const trackingId = generateTrackingId();
      const order: Order = {
        id: crypto.randomUUID(),
        trackingId,
        email,
        platform,
        profileLink,
        packageName: pkg ? `${pkg.quantity} ${pkg.type}` : "",
        price: pkg?.price || 0,
        status: "pending",
        progress: 0,
        createdAt: new Date().toISOString(),
        paymentStatus: "paid",
      };
      saveOrder(order);
      navigate(`/track?id=${trackingId}`);
    }, 2000);
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="text-center mb-8 opacity-0 animate-fade-in-up">
          <h1 className="text-3xl font-bold mb-2">
            {step === 1 ? "Place Your Order" : "Secure Payment"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === 1
              ? "Fill in your details and select a package"
              : "Complete your payment to start growing"}
          </p>
        </div>

        {/* Step indicator */}
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
              {/* Platform */}
              <div>
                <label className="block text-sm font-medium mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    setSelectedPkg("");
                  }}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select platform</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </select>
              </div>

              {/* Profile Link */}
              <div>
                <label className="block text-sm font-medium mb-2">Profile / Post Link</label>
                <input
                  type="url"
                  value={profileLink}
                  onChange={(e) => setProfileLink(e.target.value)}
                  placeholder="https://instagram.com/yourprofile"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {profileLink && validation.valid && (
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
                {profileLink && !validation.valid && (
                  <div className="mt-2 flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Please enter a valid Instagram, TikTok, or YouTube URL
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Package selection */}
              {platform && (
                <div>
                  <label className="block text-sm font-medium mb-2">Package</label>
                  <div className="space-y-2">
                    {filteredPackages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPkg(p.id)}
                        className={`w-full flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-all ${
                          selectedPkg === p.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div>
                          <span className="font-medium">
                            {p.quantity} {p.type}
                          </span>
                          <span className="text-muted-foreground ml-2">· {p.deliveryTime}</span>
                        </div>
                        <span className="font-bold">${p.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Payment step */
            <div className="space-y-5">
              {/* Order summary */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{pkg?.quantity} {pkg?.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium capitalize">{platform}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg">${pkg?.price}</span>
                </div>
              </div>

              {/* Mock card input */}
              <div>
                <label className="block text-sm font-medium mb-2">Card Number</label>
                <div className="flex items-center rounded-lg border border-input bg-background px-3 py-2.5">
                  <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CVC</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Digital wallets */}
              <div className="flex gap-2">
                <button className="flex-1 rounded-lg border border-border bg-foreground text-background py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <Smartphone className="h-4 w-4" /> Apple Pay
                </button>
                <button className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-muted transition-colors">
                  <Smartphone className="h-4 w-4" /> Google Pay
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Payments are encrypted and secure
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
            )}
            <Button
              variant="hero"
              className="flex-1"
              disabled={!canProceed || processing}
              onClick={handleSubmit}
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : step === 1 ? (
                "Continue to Payment"
              ) : (
                `Pay $${pkg?.price}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
