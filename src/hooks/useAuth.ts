import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { clearPendingReferralCode, getPendingReferralCode } from "@/lib/referralStorage";

async function applyPendingReferral(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const code = getPendingReferralCode();
  if (!code) return;

  const sb = getSupabase();
  const { data: referrerId, error: refErr } = await sb.rpc("get_profile_id_by_referral_code", { p_code: code });

  const rid = typeof referrerId === "string" ? referrerId : null;
  if (refErr || !rid || rid === userId) {
    clearPendingReferralCode();
    return;
  }

  const { data: me } = await sb.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
  if (me?.referred_by) {
    clearPendingReferralCode();
    return;
  }

  await sb.from("profiles").update({ referred_by: rid }).eq("id", userId);
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
      if (s?.user) void applyPendingReferral(s.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) void applyPendingReferral(s.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) await applyPendingReferral(data.user.id);
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) await applyPendingReferral(data.user.id);
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
