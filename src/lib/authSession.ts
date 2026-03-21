import { getSupabase } from "@/lib/supabaseClient";

/** Refreshes session when missing or expiring within ~2 minutes (avoids 401 on Edge Function invoke). */
export async function ensureSession(): Promise<void> {
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    await sb.auth.refreshSession();
    return;
  }
  const exp = session.expires_at;
  if (exp != null && exp * 1000 < Date.now() + 120_000) {
    await sb.auth.refreshSession();
  }
}
