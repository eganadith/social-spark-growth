import { Link2, Package, CreditCard, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const steps = [
  { icon: Link2, title: "Paste your link", desc: "Enter your social media profile or post URL" },
  { icon: Package, title: "Choose a package", desc: "Select the growth plan that fits your needs" },
  { icon: CreditCard, title: "Make payment", desc: "Pay securely with card or digital wallet" },
  { icon: TrendingUp, title: "Watch your growth", desc: "Sit back and see real results roll in" },
];

export default function HowItWorks() {
  const { ref, visible } = useScrollReveal();

  return (
    <section className="py-20" ref={ref}>
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl font-bold mb-3">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get started in minutes with our simple 4-step process.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`text-center transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: visible ? `${100 + i * 100}ms` : "0ms" }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg shadow-md">
                <s.icon className="h-7 w-7 text-white" />
              </div>
              <div className="text-xs font-bold text-primary mb-2">STEP {i + 1}</div>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
