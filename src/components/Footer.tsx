import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { ZIINA_WEBSITE_URL } from "@/lib/paymentLinks";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4 grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-flex mb-3" aria-label="Socioly home">
            <BrandLogo className="h-7 sm:h-8" />
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trusted social media growth service. Real engagement, real results.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Services</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to={{ pathname: "/", hash: "packages" }} className="hover:text-foreground transition-colors">
                Instagram
              </Link>
            </li>
            <li>
              <Link to={{ pathname: "/", hash: "packages" }} className="hover:text-foreground transition-colors">
                TikTok
              </Link>
            </li>
            <li>
              <Link to={{ pathname: "/", hash: "packages" }} className="hover:text-foreground transition-colors">
                Facebook
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/track" className="hover:text-foreground transition-colors">Track Order</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Policies</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link></li>
            <li><Link to="/delivery" className="hover:text-foreground transition-colors">Delivery Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <p>
          Payments processed securely via{" "}
          <a href={ZIINA_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Ziina
          </a>{" "}
          — licensed by the Central Bank of the UAE.
        </p>
        <p>© {new Date().getFullYear()} Socioly. All rights reserved.</p>
      </div>
    </footer>
  );
}
