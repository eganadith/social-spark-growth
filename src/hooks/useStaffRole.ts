import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { ProfileStaffRole } from "@/types/database";

/**
 * Loads `profiles.role` for the signed-in user (source of truth for staff access).
 */
export function useStaffRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<ProfileStaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setRole(null);
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (cancelled) return;
        if (error || !data?.role) {
          setRole(null);
        } else {
          setRole(data.role as ProfileStaffRole);
        }
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isStaff = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  return {
    role,
    isStaff,
    isSuperAdmin,
    loading: authLoading || (Boolean(user) && loading),
  };
}
