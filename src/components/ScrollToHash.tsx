import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** After client navigation to `/#section`, scroll `#section` into view (fixed nav offset). */
export default function ScrollToHash() {
  const location = useLocation();

  useLayoutEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace(/^#/, "");
    if (!id) return;

    const scroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const navH = 72;
      const top = el.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };

    // Brief delay so home content (packages) is in the DOM after route commit
    const t = window.setTimeout(scroll, 32);
    return () => window.clearTimeout(t);
  }, [location.pathname, location.hash]);

  return null;
}
