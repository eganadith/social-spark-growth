import { Shield, Zap, Users, HeadphonesIcon, Lock, BarChart3 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const reasons = [
  { icon: Shield, title: "100% Safe", desc: "We never ask for your password or sensitive information." },
  { icon: Zap, title: "Fast Delivery", desc: "Orders move into our queue as soon as you submit." },
  { icon: Users, title: "Real Engagement", desc: "Growth from genuine accounts, not bots." },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Our team is always here to help you." },
  { icon: Lock, title: "Secure by design", desc: "HTTPS and secure sign-in — your social passwords are never required." },
  { icon: BarChart3, title: "Proven Results", desc: "Trusted by over 50,000 creators worldwide." },
];

export default function WhyChooseUs() {
  const { ref, visible } = useScrollReveal();

  return (
    <section className="py-20 md:py-24 bg-white/30 backdrop-blur-sm border-y border-border/50" ref={ref}>
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Why <span className="ig-gradient-text">Socioly</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're committed to helping you grow safely and effectively.
          </p>
        </div>

        <div
          className={`max-w-5xl mx-auto mb-10 w-full rounded-2xl overflow-hidden border border-white/80 shadow-2xl ring-1 ring-black/5 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Fixed height + w-full: aspect-ratio + max-h was shrinking width and left empty space */}
          <div className="relative w-full min-h-[200px] h-[220px] sm:h-[260px] md:h-[300px] bg-muted">
            <img
              src="/Images/Professionals_discussing_busines%E2%80%A6_202603202234.jpeg"
              alt="Professionals discussing business strategy"
              className="absolute inset-0 block h-full w-full object-cover object-center"
              width={1200}
              height={500}
              decoding="async"
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/55 via-transparent to-white/35" />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {reasons.map((r, i) => (
            <div
              key={r.title}
              className={`rounded-2xl border border-white/80 bg-white/50 backdrop-blur-xl p-6 shadow-lg hover:border-primary/25 transition-all duration-300 ${
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
