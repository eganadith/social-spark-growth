import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const { requestPasswordReset, isConfigured, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConfigured) {
      toast({ title: "Supabase not configured", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast({
        title: "Check your email",
        description: "If an account exists for that address, we sent a link to set a new password.",
      });
    } catch (err) {
      toast({
        title: "Could not send reset email",
        description: err instanceof Error ? err.message : "Try again later",
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
          <p className="text-sm text-muted-foreground mb-4">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
          <Button asChild variant="outline">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-center mb-1">Forgot password</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>

        {sent ? (
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <p>
              If <span className="font-medium text-foreground">{email}</span> is registered, you&apos;ll receive an email shortly. Check spam
              too.
            </p>
            <Button asChild variant="hero" className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : (
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
            <Button type="submit" variant="hero" className="w-full" disabled={busy || authLoading}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/auth" className="text-primary hover:underline">
            Back to sign in
          </Link>
          {" · "}
          <Link to="/" className="text-primary hover:underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
