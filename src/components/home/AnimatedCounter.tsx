import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

type Props = {
  /** Target integer (e.g. 10000) */
  to: number;
  suffix?: string;
  className?: string;
};

export default function AnimatedCounter({ to, suffix = "", className }: Props) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const duration = 1400;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.floor(eased * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [inView, to]);

  return (
    <span ref={ref} className={className}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}
