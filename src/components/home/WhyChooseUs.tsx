import { Shield, Zap, Users, HeadphonesIcon, Lock, BarChart3 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const reasons = [
  { icon: Shield, title: "100% Safe", desc: "We never ask for your password or sensitive information." },
  { icon: Zap, title: "Fast Delivery", desc: "Orders start processing within minutes of payment." },
  { icon: Users, title: "Real Engagement", desc: "Growth from genuine accounts, not bots." },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Our team is always here to help you." },
  { icon: Lock, title: "Secure Payments", desc: "Bank-grade encryption on every transaction." },
  { icon: BarChart3, title: "Proven Results", desc: "Trusted by over 50,000 creators worldwide." },
];

export default function WhyChooseUs() {
  const { ref, visible } = useScrollReveal();

  return (
    <section className="py-20 bg-card" ref={ref}>
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl font-bold mb-3">
            Why Choose <span className="gradient-text">Social Lanka</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're committed to helping you grow safely and effectively.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`rounded-xl bg-background border border-border p-6 shadow-card hover:shadow-card-hover transition-all duration-300 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: visible ? `${100 + i * 80}ms` : "0ms" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-bg mb-4">
                <r.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
