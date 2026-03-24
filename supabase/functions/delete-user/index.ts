import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

/**
 * Deletes an auth user (and cascaded public data). Caller must be profiles.role = super_admin.
 * Uses service role — never expose this without JWT + role checks.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const targetId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  if (!targetId) {
    return jsonResponse({ error: "user_id required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: callerProfile, error: cpErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (cpErr || !callerProfile || callerProfile.role !== "super_admin") {
    return jsonResponse({ error: "Forbidden — super admin only" }, 403);
  }

  if (targetId === user.id) {
    return jsonResponse({ error: "You cannot delete your own account here" }, 400);
  }

  const { data: targetProfile, error: tpErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();

  if (tpErr) {
    return jsonResponse({ error: tpErr.message }, 500);
  }
  if (!targetProfile) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  if (targetProfile.role === "super_admin") {
    const { count, error: cntErr } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (cntErr) {
      return jsonResponse({ error: "Could not verify super admins" }, 500);
    }
    if ((count ?? 0) <= 1) {
      return jsonResponse({ error: "Cannot delete the last super admin" }, 400);
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) {
    return jsonResponse({ error: delErr.message }, 400);
  }

  return jsonResponse({ ok: true });
});
