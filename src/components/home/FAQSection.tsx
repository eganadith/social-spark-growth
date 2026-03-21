import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const faqs = [
  { q: "Is this service safe for my account?", a: "Absolutely. We never ask for your password. All growth is delivered through safe, organic methods that comply with platform guidelines." },
  { q: "How fast will I see results?", a: "Most orders begin processing within minutes. Delivery times vary by package, typically between 1-5 days." },
  { q: "Are the followers and views real?", a: "Yes. We work with real, active accounts to ensure genuine engagement and lasting results." },
  { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards, Apple Pay, and Google Pay through our secure payment processor." },
  { q: "What if I don't receive my order?", a: "We offer a full refund if we are unable to deliver your order. Contact our support team with your tracking ID." },
  { q: "Can I order for multiple accounts?", a: "Yes! Simply place a separate order for each account you'd like to grow." },
];

export default function FAQSection() {
  const { ref, visible } = useScrollReveal();

  return (
    <section className="py-20 md:py-24 border-t border-white/5" ref={ref}>
      <div className="container mx-auto px-4 max-w-2xl">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl font-bold mb-3">
            Frequently asked <span className="ig-gradient-text">questions</span>
          </h2>
        </div>

        <div
          className={`transition-all duration-700 delay-200 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Accordion type="single" collapsible>
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
