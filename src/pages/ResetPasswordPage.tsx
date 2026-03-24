import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

/**
 * User lands here from Supabase password-recovery email (hash often includes type=recovery, or ?code= for PKCE).
 * Session is established by the client; we collect the new password and call updateUser.
 */
export default function ResetPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false);
      return;
    }
    const sb = getSupabase();
    let cancelled = false;

    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const recoveryLikely =
      /type=recovery|type%3Drecovery/i.test(hash) || (search.includes("code=") && window.location.pathname.includes("reset-password"));

    const poll = () => {
      void sb.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user && recoveryLikely) {
          setReady(true);
          setChecking(false);
        }
      });
    };

    poll();
    const t1 = window.setTimeout(poll, 400);
    const t2 = window.setTimeout(poll, 1200);

    const tDone = window.setTimeout(() => {
      if (cancelled) return;
      setChecking(false);
    }, 4000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(tDone);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!isSupabaseConfigured) return;

    setBusy(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can sign in with your new password." });
      await sb.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (err) {
      toast({
        title: "Could not update password",
        description: err instanceof Error ? err.message : "Try requesting a new link.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Configuration needed</h1>
          <Button asChild variant="outline">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Verifying reset link…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-card text-center space-y-4">
          <h1 className="text-xl font-bold">Link invalid or expired</h1>
          <p className="text-sm text-muted-foreground">
            Open the latest link from your password email, or request a new one.
          </p>
          <Button asChild variant="hero">
            <Link to="/auth/forgot-password">Request new link</Link>
          </Button>
          <p>
            <Link to="/auth" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-center mb-1">Set a new password</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/auth" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
