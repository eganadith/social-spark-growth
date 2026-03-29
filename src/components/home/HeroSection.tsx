import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Zap, Heart, Check } from "lucide-react";

const INFLUENCER_PACK_PKG = "instagram-influencer-pack";

const influencerMiniFeatures = ["No password required", "Safe & gradual delivery", "High-quality followers"] as const;

const badges = [
  { icon: Shield, label: "Secure sign-in & data" },
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
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm font-medium text-muted-foreground mb-6 backdrop-blur-xl shadow-sm"
              >
                <Zap className="h-4 w-4 text-pink-400" />
                2,400+ profiles boosted this week · No password required
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
                Real followers, safe gradual delivery, simple ordering. Paste your profile link — we handle the rest.
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
                className="flex flex-col items-center lg:items-stretch gap-5 sm:gap-6 mb-10 w-full max-w-lg mx-auto lg:mx-0 lg:max-w-xl"
              >
                <Link to="/order" className="w-full sm:w-auto self-center lg:self-start">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto min-h-12 rounded-2xl text-base">
                    Start growing
                  </Button>
                </Link>

                <Link
                  to={`/order?pkg=${encodeURIComponent(INFLUENCER_PACK_PKG)}`}
                  className="group relative w-full rounded-2xl border border-white/80 bg-white/50 p-4 pt-6 backdrop-blur-xl shadow-lg transition-colors hover:bg-white/65 package-popular-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Influencer Pack: 10K followers for 499 AED — open order with this package"
                >
                  <span className="absolute right-3 top-0 z-10 -translate-y-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 via-pink-600 to-violet-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md sm:text-xs sm:right-4">
                    🔥 Most Popular
                  </span>
                  <div className="flex flex-row items-center justify-between gap-2 min-w-0 sm:gap-4 md:gap-5">
                    <div className="flex flex-row items-center justify-start gap-2 min-w-0 flex-1 sm:gap-3 md:gap-5">
                      <div className="flex flex-col justify-center gap-0.5 text-left shrink min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight sm:text-sm md:text-base">
                          Influencer Pack
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:text-[10px] sm:tracking-[0.2em] md:text-xs md:tracking-widest">
                          Followers
                        </p>
                      </div>
                      <p
                        className="text-4xl font-black tracking-tight text-foreground tabular-nums leading-[0.85] shrink-0 sm:text-5xl sm:leading-[0.9] md:text-6xl lg:text-7xl"
                        aria-hidden
                      >
                        10K
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 max-w-[46%] sm:max-w-none sm:gap-2 pl-1">
                      <p className="text-lg font-black ig-gradient-text tabular-nums leading-none sm:text-xl md:text-2xl">
                        499 AED
                      </p>
                      <ul className="flex flex-col gap-0.5 text-right sm:gap-1">
                        {influencerMiniFeatures.map((f) => (
                          <li
                            key={f}
                            className="flex items-start justify-end gap-1 text-[9px] text-muted-foreground sm:gap-1.5 sm:text-[11px]"
                          >
                            <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-px sm:h-3.5 sm:w-3.5 sm:mt-0.5" aria-hidden />
                            <span className="leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Link>

                <Link to={{ pathname: "/", hash: "packages" }} className="w-full sm:w-auto self-center lg:self-start">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto min-h-12 rounded-2xl border-border/70 bg-white/45 backdrop-blur-md shadow-sm hover:bg-white/60">
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
                  className={`absolute z-10 hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/55 shadow-lg backdrop-blur-xl ${className}`}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              ))}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/80 bg-card aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5] ring-1 ring-black/5">
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
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/80 bg-white/55 backdrop-blur-xl px-4 py-3 text-left shadow-lg">
                  <p className="text-xs font-semibold text-foreground">Followers delivered</p>
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
