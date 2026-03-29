import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFollowersShort, type DisplayPackage } from "@/lib/store";

const features = ["No password required", "Safe & gradual delivery", "High-quality followers"];

type Props = {
  pkg: DisplayPackage;
  index: number;
  visible: boolean;
};

export default function PackageCard({ pkg, index, visible }: Props) {
  const priceLabel = `${pkg.price.toLocaleString()} AED`;

  return (
    <motion.div
      layout
      initial={false}
      animate={
        visible
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 28 }
      }
      transition={{
        duration: 0.45,
        delay: visible ? 0.08 + index * 0.06 : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      /* Avoid scale on the full card — in 5-up grids it bleeds into neighbors. Lift only. */
      whileHover={{ y: -6 }}
      className={`relative min-w-0 h-full flex flex-col rounded-2xl p-5 sm:p-6 backdrop-blur-xl bg-white/65 border border-white/90 shadow-[0_8px_32px_-8px_hsla(220,30%,30%,0.1)] isolate overflow-x-hidden ${
        pkg.popular ? "package-popular-glow z-[1]" : ""
      }`}
    >
      {/* Badges inside layout — avoids clipping by card overflow-hidden and Embla carousel viewport */}
      <div
        className={cn(
          "relative shrink-0 w-full",
          (pkg.popular || pkg.premium) && "mb-3 min-h-[1.75rem]",
        )}
      >
        {pkg.popular && (
          <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 via-pink-600 to-violet-600 px-3 py-1 text-xs font-bold text-white shadow-md">
            🔥 Most Popular
          </span>
        )}
        {pkg.premium && (
          <span className="absolute right-0 top-0 z-10 rounded-full border border-violet-300/70 bg-violet-50/95 px-2.5 py-1 text-[10px] font-semibold text-violet-800 shadow-sm backdrop-blur-sm">
            💎 Premium
          </span>
        )}
      </div>

      <div className="text-center mb-5 min-w-0 px-0.5">
        <h3 className="font-semibold text-base sm:text-lg text-foreground mb-3 leading-snug line-clamp-2">
          {pkg.name}
        </h3>
        <p className="text-3xl sm:text-4xl xl:text-[1.75rem] 2xl:text-[2rem] font-black tracking-tight text-foreground leading-none uppercase">
          {formatFollowersShort(pkg.followers)}
        </p>
        <p className="mt-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Followers
        </p>
        <p className="mt-3 text-lg sm:text-xl font-extrabold ig-gradient-text tabular-nums">{priceLabel}</p>
      </div>

      <ul className="space-y-2.5 mb-6 flex-1 min-w-0">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground text-left">
            <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="min-w-0 leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
        <Button
          asChild
          variant={pkg.popular ? "hero" : "outline"}
          className="w-full rounded-xl font-semibold shadow-sm"
        >
          <Link to={`/order?pkg=${encodeURIComponent(pkg.orderParam)}`}>Start Growing 🚀</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
