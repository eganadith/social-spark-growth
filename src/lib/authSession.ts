import { getSupabase } from "@/lib/supabaseClient";

/** Refreshes session when the access token is missing (e.g. after tab sleep). Safe no-op if already valid. */
export async function ensureSession(): Promise<void> {
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    await sb.auth.refreshSession();
  }
}
