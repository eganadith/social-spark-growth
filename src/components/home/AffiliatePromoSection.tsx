import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Gift, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { REWARD_MILESTONES } from "@/lib/rewardMilestones";

export default function AffiliatePromoSection() {
  const { ref, visible } = useScrollReveal(0.12);

  return (
    <section className="relative py-20 md:py-24 overflow-hidden" ref={ref}>
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 20% 40%, rgba(245,133,41,0.2), transparent), radial-gradient(ellipse 50% 50% at 90% 60%, rgba(129,52,175,0.2), transparent)",
        }}
      />
      <div className="relative container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={false}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            Viral loop
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Earn <span className="ig-gradient-text">free likes</span> with Socioly
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Share your unique link. When friends complete a purchase, you unlock milestone rewards — real bonus likes,
            not cash. Gamified, shareable, built for growth.
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10"
        >
          {REWARD_MILESTONES.map((m, i) => (
            <div
              key={m.code}
              className="rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-5 shadow-lg text-center"
              style={{ transitionDelay: visible ? `${80 + i * 60}ms` : "0ms" }}
            >
              <div className="text-xs font-bold text-muted-foreground mb-2">{m.referrals} paid referral{m.referrals > 1 ? "s" : ""}</div>
              <div className="text-2xl font-black ig-gradient-text mb-1">{m.likes.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mb-3">free likes</div>
              <div className="font-mono text-sm font-bold text-foreground">{m.code}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={false}
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 text-sm text-muted-foreground text-center sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-bg">
              <Share2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2 justify-center sm:justify-start">
                <Gift className="h-4 w-4 text-pink-400" />
                Your link:{" "}
                <code className="rounded-lg bg-muted/80 px-2 py-0.5 text-xs font-mono">yoursite.com/?ref=CODE</code>
              </p>
              <p className="text-xs mt-1">Copy from your dashboard after you sign up.</p>
            </div>
          </div>
          <Button asChild variant="hero" size="lg" className="min-h-12 rounded-2xl px-8 shrink-0">
            <Link to="/auth?next=/dashboard">Get your link</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
