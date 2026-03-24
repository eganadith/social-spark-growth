import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { WHATSAPP_PHONE_DIGITS } from "@/lib/siteUrl";

const DEFAULT_TEXT = encodeURIComponent("Hi Socioly, I want to grow my account 🚀");

export default function WhatsAppButton() {
  const { pathname } = useLocation();
  const clearStickyBar = pathname === "/dashboard";
  return (
    <a
      href={`https://wa.me/${WHATSAPP_PHONE_DIGITS}?text=${DEFAULT_TEXT}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed z-50 flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-2xl shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 right-4 md:bottom-8 md:right-8 animate-wa-pulse ${
        clearStickyBar ? "bottom-[max(1rem,env(safe-area-inset-bottom))]" : "bottom-[max(5.5rem,env(safe-area-inset-bottom)+4.25rem)]"
      }`}
      style={{ background: "hsl(142, 70%, 45%)" }}
      aria-label="Chat on WhatsApp with Socioly"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
  );
}
