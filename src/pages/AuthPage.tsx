import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { persistAuthNext, consumeAuthNext, peekAuthNext } from "@/lib/authRedirect";

export default function AuthPage() {
  const [params] = useSearchParams();
  const nextFromUrl = params.get("next") || "/dashboard";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, isConfigured, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = params.get("next");
    if (q && q.startsWith("/") && !q.startsWith("//")) {
      persistAuthNext(q);
    }
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfigured) {
      toast({ title: "Supabase not configured", description: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const data = await signUp(email, password);
        if (!data.session) {
          toast({
            title: "Check your email",
            description: "We sent a confirmation link. After you confirm, sign in to continue your order.",
          });
          const resume = peekAuthNext() || nextFromUrl;
          navigate(`/check-email?next=${encodeURIComponent(resume)}`, { replace: true });
          return;
        }
        toast({ title: "Account ready" });
      } else {
        await signIn(email, password);
        toast({ title: "Welcome back" });
      }
      const dest = consumeAuthNext(nextFromUrl);
      navigate(dest, { replace: true });
    } catch (err) {
      toast({
        title: "Authentication failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Configuration needed</h1>
          <p className="text-sm text-muted-foreground mb-4">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign in.</p>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-center mb-1">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "signin" ? "Welcome back to Socioly" : "Start growing with referral rewards"}
        </p>

        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === "signin" ? "bg-background shadow-sm" : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-background shadow-sm" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-sm font-medium">Password</label>
              {mode === "signin" && (
                <Link to="/auth/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy || authLoading}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
