import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const testimonials = [
  {
    name: "Leo M. · Lifestyle creator",
    handle: "480K followers · Dubai",
    text: "We ran Socioly on a brand collab — clean dashboard, Ziina checkout was instant, and delivery stayed gradual. That is exactly what I pitch to partners.",
    rating: 5,
  },
  {
    name: "Amara Perera",
    handle: "@amaracreates",
    text: "Gained 2,000 real followers in just a week. Delivery was smooth and engagement actually went up.",
    rating: 5,
  },
  {
    name: "Dinesh Kumar",
    handle: "@dineshvlogs",
    text: "Best growth service I've used. Support answered fast and the process felt safe — no password drama.",
    rating: 5,
  },
  {
    name: "Sofia Mendez",
    handle: "@sofiamstyle",
    text: "I was skeptical at first but the results speak for themselves. Fast start and professional comms.",
    rating: 5,
  },
];

export default function Testimonials() {
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
            Loved by <span className="ig-gradient-text">creators</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
            Join 10,000+ users who trust Socioly for safe, gradual growth.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={false}
              animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl p-6 shadow-lg"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.handle}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
