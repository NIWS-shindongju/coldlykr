import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendRequest {
  campaign_id: string;
}

function personalize(
  template: string,
  contact: { company_name: string; representative: string | null; category: string; region: string }
): string {
  return template
    .replace(/\{업체명\}/g, contact.company_name)
    .replace(/\{대표자명\}/g, contact.representative ?? "담당자")
    .replace(/\{업종\}/g, contact.category)
    .replace(/\{지역\}/g, contact.region);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    // Create admin client for DB operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { campaign_id } = (await req.json()) as SendRequest;
    if (!campaign_id) throw new Error("campaign_id is required");

    // Get campaign
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .eq("user_id", user.id)
      .single();
    if (campErr || !campaign) throw new Error("Campaign not found");

    const maxPerDay = campaign.max_per_day ?? 100;
    const sendInterval = (campaign.send_interval ?? 60) * 1000; // to ms
    const today = new Date().toISOString().split("T")[0];

    // Reset daily count if new day
    let dailySent = campaign.daily_sent_count ?? 0;
    if (campaign.last_send_date !== today) {
      dailySent = 0;
      await supabaseAdmin
        .from("campaigns")
        .update({ daily_sent_count: 0, last_send_date: today })
        .eq("id", campaign_id);
    }

    // Get pending contacts
    const { data: pendingContacts, error: pcErr } = await supabaseAdmin
      .from("campaign_contacts")
      .select("id, contact_id, contacts(company_name, representative, email, category, region)")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(maxPerDay - dailySent > 0 ? maxPerDay - dailySent : 0);

    if (pcErr) throw new Error(`Failed to fetch contacts: ${pcErr.message}`);
    if (!pendingContacts || pendingContacts.length === 0) {
      // Check if daily limit reached
      if (dailySent >= maxPerDay) {
        await supabaseAdmin
          .from("campaigns")
          .update({ status: "paused" })
          .eq("id", campaign_id);
        return new Response(
          JSON.stringify({ success: true, message: "Daily limit reached. Campaign paused.", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, message: "No pending contacts.", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign status to active
    await supabaseAdmin
      .from("campaigns")
      .update({ status: "active" })
      .eq("id", campaign_id);

    const FUNCTION_URL = SUPABASE_URL.replace(".supabase.co", ".supabase.co/functions/v1");
    let sentCount = 0;

    for (const cc of pendingContacts) {
      // Check if campaign was cancelled (status changed to paused/draft)
      if (sentCount > 0 && sentCount % 10 === 0) {
        const { data: freshCampaign } = await supabaseAdmin
          .from("campaigns")
          .select("status")
          .eq("id", campaign_id)
          .single();
        if (freshCampaign && freshCampaign.status !== "active") {
          break; // Campaign was cancelled
        }
      }

      const contact = (cc as any).contacts;
      if (!contact) {
        await supabaseAdmin
          .from("campaign_contacts")
          .update({ status: "bounced", error_message: "Contact not found" })
          .eq("id", cc.id);
        continue;
      }

      // Personalize subject and body
      const personalizedSubject = personalize(campaign.subject ?? "", contact);
      const trackingPixelUrl = `${FUNCTION_URL}/track-email-open?id=${cc.id}`;
      const personalizedBody = personalize(campaign.body ?? "", contact) +
        `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${campaign.sender_name ?? "ColdMail"} <${campaign.sender_email ?? "noreply@resend.dev"}>`,
            to: [contact.email],
            reply_to: campaign.reply_email ?? campaign.sender_email,
            subject: personalizedSubject,
            html: personalizedBody,
          }),
        });

        if (resendRes.ok) {
          await supabaseAdmin
            .from("campaign_contacts")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", cc.id);
          sentCount++;
          dailySent++;
        } else {
          const errBody = await resendRes.text();
          await supabaseAdmin
            .from("campaign_contacts")
            .update({ status: "bounced", error_message: errBody.substring(0, 500) })
            .eq("id", cc.id);
        }
      } catch (sendErr: any) {
        await supabaseAdmin
          .from("campaign_contacts")
          .update({ status: "bounced", error_message: sendErr.message?.substring(0, 500) })
          .eq("id", cc.id);
      }

      // Update daily counter
      await supabaseAdmin
        .from("campaigns")
        .update({
          daily_sent_count: dailySent,
          total_sent: (campaign.total_sent ?? 0) + sentCount,
          last_send_date: today,
        })
        .eq("id", campaign_id);

      // Check daily limit
      if (dailySent >= maxPerDay) {
        await supabaseAdmin
          .from("campaigns")
          .update({ status: "paused" })
          .eq("id", campaign_id);
        break;
      }

      // Wait for interval (except last)
      if (sendInterval > 0 && sentCount < pendingContacts.length) {
        await new Promise((r) => setTimeout(r, Math.min(sendInterval, 5000))); // cap at 5s for edge function
      }
    }

    // Check if all done
    const { count: remainingCount } = await supabaseAdmin
      .from("campaign_contacts")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    if (remainingCount === 0) {
      await supabaseAdmin
        .from("campaigns")
        .update({ status: "completed", total_sent: (campaign.total_sent ?? 0) + sentCount })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, remaining: remainingCount ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send campaign error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
