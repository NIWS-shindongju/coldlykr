import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TOSS_SECRET = Deno.env.get("TOSS_PAYMENTS_SECRET_KEY");
  if (!TOSS_SECRET) {
    return new Response(JSON.stringify({ error: "TOSS_PAYMENTS_SECRET_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tossAuth = btoa(`${TOSS_SECRET}:`);
  const body = await req.json();
  const { action } = body;

  try {
    // Issue billing key after card registration
    if (action === "issue-billing-key") {
      const { authKey, customerKey } = body;
      const res = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
        method: "POST",
        headers: {
          Authorization: `Basic ${tossAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authKey, customerKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to issue billing key");
      }

      // Save subscription
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan: body.plan,
        billing_key: data.billingKey,
        customer_key: customerKey,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "user_id" });

      // Record payment
      const planPrices: Record<string, number> = {
        starter: 29000,
        growth: 69000,
        scale: 149000,
      };
      const amount = planPrices[body.plan] || 0;

      // Execute first billing
      const billingRes = await fetch(`https://api.tosspayments.com/v1/billing/${data.billingKey}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${tossAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerKey,
          amount,
          orderId: `order_${user.id}_${Date.now()}`,
          orderName: `${body.plan} 요금제 구독`,
          customerEmail: user.email,
        }),
      });
      const billingData = await billingRes.json();

      if (billingRes.ok) {
        await supabase.from("payment_history").insert({
          user_id: user.id,
          plan: body.plan,
          amount,
          status: "paid",
          payment_key: billingData.paymentKey,
          order_id: billingData.orderId,
          receipt_url: billingData.receipt?.url || null,
        });
      }

      return new Response(JSON.stringify({ success: true, billingKey: data.billingKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Change plan
    if (action === "change-plan") {
      const { plan } = body;
      await supabase
        .from("subscriptions")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel subscription
    if (action === "cancel") {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Request tax invoice
    if (action === "request-tax-invoice") {
      const { paymentId } = body;
      await supabase
        .from("payment_history")
        .update({ tax_invoice_requested: true })
        .eq("id", paymentId)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Toss Payments error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
