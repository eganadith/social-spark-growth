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

function edgeDeployHint(functionName: string): string {
  return ` Deploy the function: supabase functions deploy ${functionName} (same project as VITE_SUPABASE_URL).`;
}

/**
 * Direct POST to the Functions gateway — same as the JS client, but avoids rare client bugs.
 * Gateway expects both Authorization (user JWT) and apikey (anon).
 */
async function invokeEdgeFunctionViaFetch<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<T> {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!base || !anonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  }

  const res = await fetch(`${base}/functions/v1/${encodeURIComponent(functionName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Edge Function returned non-JSON (${res.status}). ${text.slice(0, 120)}${edgeDeployHint(functionName)}`,
    );
  }

  if (!res.ok) {
    const errMsg =
      json && typeof json === "object" && json !== null && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `HTTP ${res.status}`;
    throw new Error(`${errMsg}${edgeDeployHint(functionName)}`);
  }

  return json as T;
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

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const invokeHeaders: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };
  if (anonKey) {
    invokeHeaders.apikey = anonKey;
  }

  // Prefer direct fetch: `functions.invoke` often surfaces flaky "Failed to send" in browsers.
  try {
    return await invokeEdgeFunctionViaFetch<T>(name, body, session.access_token);
  } catch (fetchErr) {
    const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const { data, error } = await sb.functions.invoke(name, {
      body,
      headers: invokeHeaders,
    });

    if (!error) {
      return data as T;
    }

    let detail = fallbackInvokeMessage(error, data);
    if (error instanceof FunctionsHttpError) {
      const fromBody = await messageFromFunctionsHttpError(error);
      if (fromBody) detail = fromBody;
      const res = error.context;
      if (res instanceof Response) {
        detail = `${detail} (HTTP ${res.status})`;
      }
    }

    throw new Error(
      `${fetchMsg}${detail && detail !== fetchMsg ? ` — client invoke: ${detail}` : ""}`,
    );
  }
}
