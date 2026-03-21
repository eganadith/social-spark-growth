import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Zap, Heart } from "lucide-react";

const badges = [
  { icon: Shield, label: "Secure payments" },
  { icon: Clock, label: "Fast start" },
  { icon: Users, label: "Real engagement" },
];

const floatIcons = [
  { Icon: Heart, className: "top-[12%] right-[8%] text-pink-500", delay: 0 },
  { Icon: Users, className: "bottom-[18%] left-[6%] text-violet-400", delay: 0.4 },
  { Icon: Zap, className: "top-[40%] left-[4%] text-amber-400", delay: 0.2 },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-0 right-0 h-[min(100vw,520px)] w-[min(100vw,520px)] rounded-full opacity-[0.12] blur-3xl"
          style={{ background: "var(--ig-gradient)" }}
        />
        <div className="absolute bottom-0 left-0 h-[min(80vw,400px)] w-[min(80vw,400px)] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
            <div className="flex-1 text-center lg:text-left min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-muted-foreground mb-6 backdrop-blur-md"
              >
                <Zap className="h-4 w-4 text-pink-400" />
                10,000+ happy users · No password required
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl leading-[1.08] mb-6"
              >
                Grow Your Social Media{" "}
                <span className="ig-gradient-text-shine">Faster</span>{" "}
                <span className="animate-hero-rocket text-[0.92em] md:text-[0.95em] align-middle" aria-hidden>
                  🚀
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-4 leading-relaxed"
              >
                Real followers, safe gradual delivery, premium checkout. Paste your profile link — we handle the rest.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.45 }}
                className="text-sm font-medium text-foreground/90 max-w-xl mx-auto lg:mx-0 mb-8"
              >
                <span className="text-orange-400">🔥 Limited daily slots</span>
                <span className="mx-2 text-border">·</span>
                <span className="text-amber-400">⚡ Results start shortly</span>
                <span className="mx-2 text-border">·</span>
                <span className="ig-gradient-text font-semibold">10K from 499 AED</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-10"
              >
                <Link to="/order" className="w-full sm:w-auto">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto min-h-12 rounded-2xl text-base">
                    Start growing
                  </Button>
                </Link>
                <Link to={{ pathname: "/", hash: "packages" }} className="w-full sm:w-auto">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto min-h-12 rounded-2xl border-white/15 bg-white/5 backdrop-blur-sm">
                    View packages
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.5 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3"
              >
                {badges.map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <b.icon className="h-4 w-4 text-pink-400 shrink-0" />
                    {b.label}
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0 w-full max-w-md mx-auto lg:max-w-none lg:w-[min(44vw,520px)] mt-12 lg:mt-0 relative"
            >
              {floatIcons.map(({ Icon, className, delay }) => (
                <motion.div
                  key={className}
                  className={`absolute z-10 hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-card/80 shadow-lg backdrop-blur-md ${className}`}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              ))}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-card aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5] ring-1 ring-white/5">
                <img
                  src="/Images/Content_creator_filming_202603202229.jpeg"
                  alt="Creator filming content for social media"
                  className="absolute inset-0 h-full w-full object-cover"
                  width={800}
                  height={1000}
                  decoding="async"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md px-4 py-3 text-left">
                  <p className="text-xs font-semibold text-white/90">Followers delivered</p>
                  <p className="text-2xl font-black ig-gradient-text tabular-nums">127,843+</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
