import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/** Mobile-first sticky CTA — min 48px tap target, subtle pulse */
export default function StickyGrowthCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden pointer-events-none">
      <div className="pointer-events-auto flex justify-center">
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Link
            to="/order"
            className="inline-flex items-center justify-center gap-2 min-h-12 rounded-2xl gradient-bg px-8 text-base font-bold text-primary-foreground shadow-lg"
          >
            🚀 Start Growing
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
