import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4 grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-bold text-lg mb-3">
            <Zap className="h-5 w-5 text-primary" />
            <span className="gradient-text">Socioly</span>
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
      <div className="container mx-auto px-4 mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Socioly. All rights reserved.
      </div>
    </footer>
  );
}
