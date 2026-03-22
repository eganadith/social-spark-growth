import { getSupabase } from "@/lib/supabaseClient";

function readInvokeErrorMessage(error: unknown, data: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message: string }).message;
    if (m) return m;
  }
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === "string") return e;
  }
  return "Request failed";
}

/** Invoke a Supabase Edge Function with the current user's JWT. */
export async function invokeAuthedFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in");
  }

  const { data, error } = await sb.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    let detail = readInvokeErrorMessage(error, data);
    if (error && typeof error === "object" && "context" in error) {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
      if (ctx?.json) {
        try {
          const j = await ctx.json();
          if (j && typeof j === "object" && "error" in j && typeof (j as { error: string }).error === "string") {
            detail = (j as { error: string }).error;
          }
        } catch {
          /* ignore */
        }
      }
    }
    throw new Error(detail);
  }

  return data as T;
}
