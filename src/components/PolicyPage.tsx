import { useScrollReveal } from "@/hooks/useScrollReveal";

interface PolicyPageProps {
  title: string;
  content: { heading: string; body: string }[];
  /** Optional highlighted block shown under the title (e.g. required legal/delivery copy). */
  lead?: string;
}

export default function PolicyPage({ title, content, lead }: PolicyPageProps) {
  const { ref, visible } = useScrollReveal(0.1);

  return (
    <div className="min-h-screen pt-24 pb-16" ref={ref}>
      <div className="container mx-auto px-4 max-w-2xl">
        <h1
          className={`text-3xl font-bold mb-8 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {title}
        </h1>
        {lead ? (
          <p
            className={`text-sm leading-relaxed text-foreground/90 rounded-2xl border border-border bg-card/80 px-5 py-4 mb-10 shadow-card ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } transition-all duration-700`}
          >
            {lead}
          </p>
        ) : null}
        <div className="space-y-8">
          {content.map((section, i) => (
            <div
              key={i}
              className={`transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: visible ? `${100 + i * 60}ms` : "0ms" }}
            >
              <h2 className="text-lg font-semibold mb-2">{section.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
