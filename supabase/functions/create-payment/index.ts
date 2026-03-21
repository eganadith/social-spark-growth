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
      idempotency_key?: string;
    };
    const packageId = body.package_id?.trim();
    const profileLink = body.profile_link?.trim();
    const idempotencyKey = body.idempotency_key?.trim();
    if (!packageId || !profileLink) {
      return new Response(JSON.stringify({ error: "package_id and profile_link required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return new Response(JSON.stringify({ error: "idempotency_key required (stable per checkout attempt)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = supabaseAdmin();

    const { data: existing, error: existErr } = await admin
      .from("orders")
      .select("id, tracking_id, payment_id, checkout_redirect_url, status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existErr) {
      console.error(existErr);
      return new Response(JSON.stringify({ error: "Could not verify checkout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing) {
      if (existing.status !== "pending") {
        return new Response(
          JSON.stringify({ error: "This checkout was already used. Start a new order for another purchase." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (existing.checkout_redirect_url) {
        return new Response(
          JSON.stringify({
            checkoutUrl: existing.checkout_redirect_url,
            trackingId: existing.tracking_id,
            orderId: existing.id,
            paymentIntentId: existing.payment_id,
            idempotent: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

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

    const site = (Deno.env.get("PUBLIC_SITE_URL") ?? "http://localhost:5173").replace(/\/$/, "");

    let orderId: string;
    let trackingId: string;

    if (existing && existing.status === "pending") {
      orderId = existing.id;
      trackingId = existing.tracking_id || crypto.randomUUID();
      const { error: updOrd } = await admin
        .from("orders")
        .update({
          package_id: packageId,
          amount: pkg.price,
          profile_link: profileLink,
          email: body.email?.trim() || user.email || null,
          tracking_id: trackingId,
        })
        .eq("id", existing.id);
      if (updOrd) {
        console.error(updOrd);
        return new Response(JSON.stringify({ error: "Could not update order" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      trackingId = crypto.randomUUID();
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
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();

      if (orderErr || !order) {
        if (orderErr?.code === "23505") {
          const { data: raced } = await admin
            .from("orders")
            .select("id, tracking_id, payment_id, checkout_redirect_url, status")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (raced?.checkout_redirect_url && raced.status === "pending") {
            return new Response(
              JSON.stringify({
                checkoutUrl: raced.checkout_redirect_url,
                trackingId: raced.tracking_id,
                orderId: raced.id,
                paymentIntentId: raced.payment_id,
                idempotent: true,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ error: "Duplicate checkout in progress; retry shortly." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error(orderErr);
        return new Response(JSON.stringify({ error: "Could not create order" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orderId = order.id;
    }

    const successUrl = `${site}/track?id=${encodeURIComponent(trackingId)}`;
    const cancelUrl = `${site}/order`;
    const failureUrl = `${site}/order?payment=failed`;

    const ziina = await createZiinaPaymentIntent({
      orderId,
      userId: user.id,
      packageId,
      amount: Number(pkg.price),
      currency: "AED",
      trackingId,
      successUrl,
      cancelUrl,
      failureUrl,
    });

    const { error: payUpdErr } = await admin
      .from("orders")
      .update({
        payment_id: ziina.paymentIntentId,
        checkout_redirect_url: ziina.redirectUrl,
      })
      .eq("id", orderId);

    if (payUpdErr) {
      console.error("Could not store payment intent / checkout URL on order", payUpdErr);
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: ziina.redirectUrl,
        trackingId,
        orderId,
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
