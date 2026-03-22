import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Lock, ShieldCheck, Headphones, BadgeCheck } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import AnimatedCounter from "@/components/home/AnimatedCounter";

const badges: { icon: LucideIcon; label: string; href?: string }[] = [
  { icon: Lock, label: "SSL encrypted" },
  { icon: ShieldCheck, label: "No password required" },
  { icon: Headphones, label: "24/7 support" },
  { icon: BadgeCheck, label: "Live order tracking" },
];

export default function TrustStripSection() {
  const { ref, visible } = useScrollReveal(0.15);

  return (
    <section className="py-16 md:py-20 border-y border-white/5 bg-muted/20" ref={ref}>
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.p
          initial={false}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          className="text-center text-sm font-semibold text-muted-foreground mb-10"
        >
          Trusted by <span className="text-foreground">10,000+</span> happy users
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {badges.map((b, i) => {
            const inner = (
              <>
                <b.icon className="h-6 w-6 text-pink-400" />
                <span className="text-xs font-medium text-foreground leading-tight">{b.label}</span>
              </>
            );
            return (
              <motion.div
                key={b.label}
                initial={false}
                animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={{ delay: 0.05 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center gap-2 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-md p-4"
              >
                {"href" in b && b.href ? (
                  <a
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 text-center hover:opacity-90 transition-opacity"
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
          <motion.div
            initial={false}
            animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="text-2xl md:text-3xl font-black ig-gradient-text">
              <AnimatedCounter to={127843} suffix="+" />
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-1">Orders delivered</div>
          </motion.div>
          <motion.div
            initial={false}
            animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={{ delay: 0.28, duration: 0.5 }}
          >
            <div className="text-2xl md:text-3xl font-black text-emerald-400">98.7%</div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-1">Satisfaction</div>
          </motion.div>
          <motion.div
            initial={false}
            animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
            transition={{ delay: 0.36, duration: 0.5 }}
          >
            <div className="text-2xl md:text-3xl font-black text-sky-400">24/7</div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-1">Support</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
