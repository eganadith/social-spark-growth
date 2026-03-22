import type { ReactNode } from "react";
import { Link2, Package, Send, TrendingUp, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const steps: { icon: LucideIcon; title: string; desc: ReactNode }[] = [
  { icon: Link2, title: "Paste your link", desc: "Enter your social media profile or page URL" },
  { icon: Package, title: "Choose a package", desc: "Pick the tier that matches your growth goal" },
  {
    icon: Send,
    title: "Submit your order",
    desc: "Review details, accept the terms, and get a tracking ID instantly — no third-party checkout page.",
  },
  { icon: TrendingUp, title: "Watch it grow", desc: "Gradual, natural delivery — no password needed" },
];

export default function HowItWorks() {
  const { ref, visible } = useScrollReveal();

  return (
    <section className="py-20 md:py-24" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={false}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            How it <span className="ig-gradient-text">works</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
            Four simple steps — most users finish in under two minutes.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={false}
              animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.45, delay: 0.08 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="text-center rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 shadow-lg"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-bg shadow-md">
                <s.icon className="h-7 w-7 text-white" />
              </div>
              <div className="text-xs font-bold text-pink-400 mb-2">STEP {i + 1}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
