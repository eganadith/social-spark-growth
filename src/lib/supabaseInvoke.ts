import { ensureSession } from "@/lib/authSession";
import { getSupabase } from "@/lib/supabaseClient";

/**
 * Invoke a JWT-protected Edge Function with a fresh access token, explicit apikey header,
 * and one retry after refresh on 401 (common with near-expiry sessions or relay quirks).
 */
export async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>) {
  const sb = getSupabase();
  await ensureSession();
  const { data: refData, error: refErr } = await sb.auth.refreshSession();
  let accessToken = refData.session?.access_token;
  if (!accessToken) {
    const { data: snap } = await sb.auth.getSession();
    accessToken = snap.session?.access_token ?? undefined;
  }
  if (!accessToken) {
    return {
      data: null,
      error: new Error(
        refErr?.message
          ? `Session could not be refreshed (${refErr.message}). Sign out and sign in again.`
          : "Your session expired. Please sign in again and retry payment.",
      ),
      response: undefined as Response | undefined,
    };
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (anonKey) headers.apikey = anonKey;

  const call = () => sb.functions.invoke<T>(name, { body, headers });

  let out = await call();
  if (out.error && out.response?.status === 401) {
    await sb.auth.refreshSession();
    const { data: snap2 } = await sb.auth.getSession();
    const t2 = snap2.session?.access_token;
    if (t2) {
      headers.Authorization = `Bearer ${t2}`;
      out = await sb.functions.invoke<T>(name, { body, headers });
    }
  }
  return out;
}
