import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { packages } from "@/lib/store";
import { Check, Instagram, Youtube } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const platforms = [
  { id: "instagram" as const, label: "Instagram", icon: Instagram },
  { id: "tiktok" as const, label: "TikTok", icon: () => <span className="text-base">♪</span> },
  { id: "youtube" as const, label: "YouTube", icon: Youtube },
];

export default function PackagesSection() {
  const [active, setActive] = useState<"instagram" | "tiktok" | "youtube">("instagram");
  const { ref, visible } = useScrollReveal();

  const filtered = packages.filter((p) => p.platform === active);

  return (
    <section id="packages" className="py-20 bg-card" ref={ref}>
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl font-bold mb-3">
            Choose Your <span className="gradient-text">Growth Package</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Select your platform and pick the perfect package for your goals.
          </p>
        </div>

        {/* Platform tabs */}
        <div
          className={`flex justify-center gap-2 mb-10 transition-all duration-700 delay-100 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active === p.id
                  ? "gradient-bg text-white shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <p.icon className="h-4 w-4" />
              {p.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {filtered.map((pkg, i) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl bg-background border border-border p-6 shadow-card hover:shadow-card-hover transition-all duration-300 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              } ${pkg.popular ? "ring-2 ring-primary" : ""}`}
              style={{ transitionDelay: visible ? `${200 + i * 80}ms` : "0ms" }}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-bg text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="text-center mb-6">
                <h3 className="font-semibold text-lg mb-1">{pkg.name}</h3>
                <div className="text-3xl font-extrabold mb-1">${pkg.price}</div>
                <div className="text-sm text-muted-foreground">
                  {pkg.quantity} {pkg.type}
                </div>
                <div className="text-xs text-muted-foreground mt-1">⏱ {pkg.deliveryTime}</div>
              </div>
              <ul className="space-y-2 mb-6">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={`/order?pkg=${pkg.id}`}>
                <Button variant={pkg.popular ? "hero" : "outline"} className="w-full">
                  Buy Now
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
