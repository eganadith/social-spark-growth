import { createZiinaPaymentIntent } from "../_shared/ziina.ts";
import { supabaseAdmin, supabaseUser } from "../_shared/supabase.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = supabaseUser(req);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      package_id?: string;
      profile_link?: string;
      email?: string;
    };
    const packageId = body.package_id?.trim();
    const profileLink = body.profile_link?.trim();
    if (!packageId || !profileLink) {
      return new Response(JSON.stringify({ error: "package_id and profile_link required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = supabaseAdmin();
    const { data: pkg, error: pkgErr } = await admin
      .from("packages")
      .select("id, price")
      .eq("id", packageId)
      .single();

    if (pkgErr || !pkg) {
      return new Response(JSON.stringify({ error: "Invalid package" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingId = `SL-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const site = (Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:5173").replace(/\/$/, "");

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        package_id: packageId,
        amount: pkg.price,
        status: "pending",
        progress: 5,
        tracking_id: trackingId,
        profile_link: profileLink,
        email: body.email?.trim() || user.email || null,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error(orderErr);
      return new Response(JSON.stringify({ error: "Could not create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const successUrl = `${site}/track?id=${encodeURIComponent(trackingId)}`;
    const cancelUrl = `${site}/order`;
    const failureUrl = `${site}/order?payment=failed`;

    const ziina = await createZiinaPaymentIntent({
      orderId: order.id,
      userId: user.id,
      packageId,
      amount: Number(pkg.price),
      currency: "AED",
      trackingId,
      successUrl,
      cancelUrl,
      failureUrl,
    });

    const { error: payIdErr } = await admin
      .from("orders")
      .update({ payment_id: ziina.paymentIntentId })
      .eq("id", order.id);

    if (payIdErr) {
      console.error("Could not store Ziina payment_intent id on order", payIdErr);
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: ziina.redirectUrl,
        trackingId,
        orderId: order.id,
        paymentIntentId: ziina.paymentIntentId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
