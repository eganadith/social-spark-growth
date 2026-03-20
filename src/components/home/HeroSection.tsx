import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Zap } from "lucide-react";

const stats = [
  { value: "127,843", label: "Orders Delivered" },
  { value: "98.7%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Support Available" },
];

const badges = [
  { icon: Shield, label: "Secure Payments" },
  { icon: Clock, label: "Fast Delivery" },
  { icon: Users, label: "Real Users" },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.07] gradient-bg blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.05] bg-accent blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6 opacity-0 animate-fade-in-up"
          >
            <Zap className="h-3.5 w-3.5 text-primary" />
            Trusted by 50,000+ creators
          </div>

          <h1
            className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.1] mb-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Grow Your Social Media{" "}
            <span className="gradient-text">Instantly</span>
          </h1>

          <p
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Real followers, real engagement, fast delivery. No passwords needed — just paste your link and watch your audience grow.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Link to="/order">
              <Button variant="hero" size="xl">
                Get Started
              </Button>
            </Link>
            <a href="#packages">
              <Button variant="hero-outline" size="xl">
                View Packages
              </Button>
            </a>
          </div>

          {/* Trust badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-6 mb-16 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            {badges.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <b.icon className="h-4 w-4 text-primary" />
                {b.label}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4 max-w-md mx-auto opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0.5s" }}
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold gradient-text">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
