import { ensureSession } from "@/lib/authSession";
import { getSupabase } from "@/lib/supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js";

function readDataErrorField(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === "string" && e.trim()) return e;
  }
  return null;
}

/** Non-2xx responses never populate `data`; the JSON body is still on `error.context` (Response). */
async function messageFromFunctionsHttpError(error: FunctionsHttpError): Promise<string | null> {
  const res = error.context;
  if (!(res instanceof Response)) return null;
  const ct = res.headers.get("Content-Type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j: unknown = await res.clone().json();
      const fromError = readDataErrorField(j);
      if (fromError) return fromError;
      if (j && typeof j === "object" && "message" in j && typeof (j as { message: unknown }).message === "string") {
        const msg = (j as { message: string }).message;
        if (msg.trim()) return msg;
      }
    } else {
      const text = (await res.clone().text()).trim();
      if (text) return text.slice(0, 500);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function fallbackInvokeMessage(error: unknown, data: unknown): string {
  const fromData = readDataErrorField(data);
  if (fromData) return fromData;
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message: string }).message;
    if (m) return m;
  }
  return "Request failed";
}

/** Invoke a Supabase Edge Function with the current user's JWT. */
export async function invokeAuthedFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const sb = getSupabase();
  await ensureSession();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in — refresh the page and sign in again.");
  }

  const { data, error } = await sb.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    let detail = fallbackInvokeMessage(error, data);
    if (error instanceof FunctionsHttpError) {
      const fromBody = await messageFromFunctionsHttpError(error);
      if (fromBody) detail = fromBody;
      const res = error.context;
      if (res instanceof Response) {
        detail = `${detail} (HTTP ${res.status})`;
      }
    }
    throw new Error(detail);
  }

  return data as T;
}
