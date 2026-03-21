import { useState, useEffect } from "react";
import { Link, useLocation, type To } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, loading, signOut, isConfigured } = useAuth();
  const isAdmin = user?.app_metadata?.role === "admin";

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setOpen(false), [location]);

  const links: { to: To; label: string }[] = [
    { to: "/", label: "Home" },
    /* RR6: `/#packages` string is unreliable; use pathname + hash */
    { to: { pathname: "/", hash: "packages" }, label: "Packages" },
    { to: "/track", label: "Track Order" },
    ...(user ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-dark shadow-card" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Zap className="h-6 w-6 text-primary" />
          <span className="gradient-text">Socioly</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {isConfigured && !loading && user ? (
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          ) : isConfigured ? (
            <Link to="/auth?next=/dashboard">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
          ) : null}
          <Link to="/order">
            <Button variant="hero" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass-dark border-t border-border px-4 pb-4 space-y-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="block py-2 text-sm font-medium text-muted-foreground">
              {l.label}
            </Link>
          ))}
          {isConfigured && !loading && user ? (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => void signOut()}>
              Sign out
            </Button>
          ) : isConfigured ? (
            <Link to="/auth?next=/dashboard" className="block">
              <Button variant="ghost" size="sm" className="w-full">
                Sign in
              </Button>
            </Link>
          ) : null}
          <Link to="/order">
            <Button variant="hero" size="sm" className="w-full">
              Get Started
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
