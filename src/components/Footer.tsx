import { Link } from "react-router-dom";
import { Facebook } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SUPPORT_EMAIL } from "@/lib/siteUrl";

const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61577811122459";

/** Ziina-style wordmark badge (brand gradient). */
function ZiinaMark() {
  return (
    <span
      className="inline-flex items-center justify-center font-bold tracking-tight text-lg"
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      Ziina
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex mb-3" aria-label="Socioly home">
              <BrandLogo className="h-7 sm:h-8" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Trusted social media growth service. Real engagement, real results.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Follow us</span>
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-[#1877F2] hover:bg-muted transition-colors"
                aria-label="Socioly on Facebook"
              >
                <Facebook className="h-5 w-5" aria-hidden />
              </a>
            </div>
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">Support: </span>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/track" className="hover:text-foreground transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Policies</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/refund" className="hover:text-foreground transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-foreground transition-colors">
                  Delivery Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Payment methods */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Payment methods</h4>
            <div className="flex flex-wrap gap-3">
              <div
                className="inline-flex min-h-[44px] min-w-[7rem] items-center justify-center rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-foreground"
                title="Stripe"
              >
                <span className="sr-only">Stripe</span>
                <span className="text-[#635BFF] font-semibold text-lg tracking-tight lowercase">stripe</span>
              </div>
              <div
                className="inline-flex min-h-[44px] min-w-[7rem] items-center justify-center rounded-lg border border-border bg-muted/30 px-4 py-2.5"
                title="Ziina"
              >
                <span className="sr-only">Ziina</span>
                <ZiinaMark />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Socioly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
