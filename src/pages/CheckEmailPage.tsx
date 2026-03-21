import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const signInHref = `/auth?next=${encodeURIComponent(next)}`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-card text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Confirm your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          We sent a link to your inbox. Click it to activate your account, then sign in. Your cart and return path are saved in this browser until you complete sign-in.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="hero" className="w-full">
            <Link to={signInHref}>Continue to sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
