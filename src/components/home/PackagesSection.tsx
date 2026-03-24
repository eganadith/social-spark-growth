import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Music2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePackages } from "@/hooks/usePackages";
import PackageCard from "@/components/PackageCard";
import type { DbPackage, Platform } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { toDisplayPackagesFromDb, toDisplayPackagesFromStore, type DisplayPackage } from "@/lib/store";

const platforms: { id: Platform; label: string; icon: LucideIcon }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "tiktok", label: "TikTok", icon: Music2 },
];

const DELIVERY_SNIPPET =
  "Delivery begins shortly after your order is placed and is completed within 24 to 72 hours. We use a gradual and natural process to ensure your account remains safe and high-quality.";

function buildDisplayList(
  platform: Platform,
  configured: boolean,
  isLoading: boolean,
  isError: boolean,
  dbList: DbPackage[],
): DisplayPackage[] {
  if (!configured || isError) {
    return toDisplayPackagesFromStore(platform);
  }
  if (isLoading) return [];
  if (dbList.length === 0) return [];
  return toDisplayPackagesFromDb(dbList);
}

function PlatformPackageGrid({ platform, visible }: { platform: Platform; visible: boolean }) {
  const { data: dbList = [], isLoading, isError, error } = usePackages(platform);

  const displayList = useMemo(
    () => buildDisplayList(platform, isSupabaseConfigured, isLoading, isError, dbList),
    [platform, isLoading, isError, dbList],
  );

  const cardsReady = displayList.length > 0 && (!isSupabaseConfigured || !isLoading || isError);

  return (
    <>
      {!isSupabaseConfigured && (
        <p className="text-center text-sm text-muted-foreground mb-8 max-w-lg mx-auto">
          Connect Supabase to sync live inventory and checkout. Showing catalog preview from app config.
        </p>
      )}

      {isSupabaseConfigured && isLoading && (
        <p className="text-center text-muted-foreground text-sm mb-8">Loading packages…</p>
      )}

      {isSupabaseConfigured && isError && (
        <div className="text-center text-sm max-w-lg mx-auto mb-8 space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="font-medium text-destructive">Could not load packages</p>
          <p className="text-xs text-muted-foreground break-words">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <p className="text-xs text-muted-foreground">Showing catalog preview below.</p>
        </div>
      )}

      <div className="md:hidden -mx-1">
        <Carousel opts={{ align: "start", loop: false }} className="w-full">
          <CarouselContent className="-ml-3 pb-1">
            {displayList.map((pkg, i) => (
              <CarouselItem key={pkg.id} className="pl-3 basis-[88%] sm:basis-[70%] min-w-0">
                <PackageCard pkg={pkg} index={i} visible={visible && cardsReady} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <p className="text-center text-[11px] text-muted-foreground mt-3">Swipe for more packages →</p>
      </div>

      <div className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch [&>*]:min-w-0">
        {displayList.map((pkg, i) => (
          <PackageCard key={pkg.id} pkg={pkg} index={i} visible={visible && cardsReady} />
        ))}
      </div>

      {isSupabaseConfigured && !isLoading && !isError && displayList.length === 0 && (
        <p className="text-center text-muted-foreground text-sm mt-6">No packages found for this platform.</p>
      )}
    </>
  );
}

export default function PackagesSection() {
  const { ref, visible } = useScrollReveal(0.15);
  const [tab, setTab] = useState<Platform>("instagram");

  return (
    <section id="packages" className="relative py-20 md:py-24 overflow-hidden" ref={ref}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-25"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,133,41,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(129,52,175,0.12), transparent), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(81,91,212,0.12), transparent)",
        }}
      />
      <div className="relative container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={false}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 md:mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Socioly</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Growth packages for every <span className="ig-gradient-text">platform</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Same transparent AED pricing on Instagram, Facebook, and TikTok — pick your platform and scale with a
            package built for creators and brands.
          </p>
          <p className="mt-3 text-xs font-medium text-emerald-600/90 dark:text-emerald-400/90 max-w-lg mx-auto">
            Place your order in-app — you get a tracking ID as soon as you submit.
          </p>
          <p className="mt-4 text-sm text-foreground/80 max-w-lg mx-auto">
            <span className="font-semibold ig-gradient-text">10K · 499 AED</span> is our most chosen tier — maximum
            value before you step up to{" "}
            <span className="font-medium text-foreground">100K at 4,699 AED</span> for flagship reach.
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Platform)} className="w-full">
          <motion.div
            initial={false}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-10"
          >
            <TabsList className="h-auto flex-wrap gap-1 p-1.5 rounded-xl bg-muted/80 backdrop-blur-sm border border-border/60 shadow-sm">
              {platforms.map((p) => {
                const PIcon = p.icon;
                return (
                  <TabsTrigger
                    key={p.id}
                    value={p.id}
                    className="relative gap-2 overflow-hidden rounded-lg px-4 py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {tab === p.id && (
                      <motion.div
                        layoutId="packagesPlatformTab"
                        className="pointer-events-none absolute inset-0 rounded-lg ig-gradient-border shadow-md"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-2">
                      <PIcon className="h-4 w-4 shrink-0" />
                      {p.label}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </motion.div>

          {platforms.map((p) => (
            <TabsContent key={p.id} value={p.id} className="mt-0 outline-none">
              <PlatformPackageGrid platform={p.id} visible={visible} />
            </TabsContent>
          ))}
        </Tabs>

        <motion.div
          initial={false}
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-12 text-center space-y-2"
        >
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">🔥 Limited daily slots available</p>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ⚡ Results start shortly after purchase
          </p>
        </motion.div>

        <motion.div
          initial={false}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-10 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md px-5 py-5 md:px-8 shadow-card max-w-3xl mx-auto"
        >
          <p className="text-sm leading-relaxed text-foreground/90 text-center">{DELIVERY_SNIPPET}</p>
        </motion.div>

        <motion.ul
          initial={false}
          animate={visible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
        >
          <li>🔒 No password required</li>
          <li>✅ Safe & secure process</li>
          <li>📈 Trusted by thousands of users</li>
          <li>💬 24/7 support</li>
        </motion.ul>
      </div>
    </section>
  );
}
