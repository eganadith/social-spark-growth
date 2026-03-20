import { Star } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const testimonials = [
  {
    name: "Amara Perera",
    handle: "@amaracreates",
    text: "Gained 2,000 real followers in just a week. The delivery was smooth and my engagement actually increased!",
    rating: 5,
  },
  {
    name: "Dinesh Kumar",
    handle: "@dineshvlogs",
    text: "Best service I've tried. My YouTube views shot up overnight and I got real watch time. Highly recommend.",
    rating: 5,
  },
  {
    name: "Sofia Mendez",
    handle: "@sofiamstyle",
    text: "I was skeptical at first but the results speak for themselves. Fast delivery and great support team.",
    rating: 4,
  },
];

export default function Testimonials() {
  const { ref, visible } = useScrollReveal();

  return (
    <section className="py-20" ref={ref}>
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl font-bold mb-3">
            What Our <span className="gradient-text">Clients Say</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Join thousands of satisfied creators who trust Social Lanka.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`rounded-xl bg-card border border-border p-6 shadow-card transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: visible ? `${100 + i * 100}ms` : "0ms" }}
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.handle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
