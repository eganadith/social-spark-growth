import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { getAuthEmailRedirectTo } from "@/lib/siteUrl";
import { clearPendingReferralCode, getPendingReferralCode } from "@/lib/referralStorage";

async function applyPendingReferral(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const code = getPendingReferralCode();
  if (!code) return;

  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.user) return;

  const { error } = await sb.rpc("claim_referral", { p_code: code });
  if (error) {
    console.warn("claim_referral:", error.message);
    return;
  }
  clearPendingReferralCode();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) void applyPendingReferral();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) void applyPendingReferral();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    const redirect = getAuthEmailRedirectTo();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      ...(redirect ? { options: { emailRedirectTo: redirect } } : {}),
    });
    if (error) throw error;
    if (data.session) await applyPendingReferral();
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) await applyPendingReferral();
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isConfigured: isSupabaseConfigured,
  };
}
