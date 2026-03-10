import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const FUNCTION_URL = SUPABASE_URL.replace(".supabase.co", ".supabase.co/functions/v1");
    const now = new Date();

    // Get all active/completed campaigns with sequences enabled
    const { data: campaigns, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("use_sequence", true)
      .in("status", ["active", "completed", "paused"]);

    if (campErr) throw new Error(`Failed to fetch campaigns: ${campErr.message}`);
    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No sequence campaigns found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalProcessed = 0;

    for (const campaign of campaigns) {
      // Process step 1 → step 2: contacts sent at step 1, not opened, N days passed
      const seq2Days = campaign.sequence_2_days ?? 3;
      const seq2Subject = campaign.sequence_2_subject;
      const seq2Body = campaign.sequence_2_body;

      if (seq2Subject && seq2Body) {
        const cutoffDate2 = new Date(now.getTime() - seq2Days * 24 * 60 * 60 * 1000).toISOString();

        // Get step 1 contacts that were sent, not opened, and enough time has passed
        const { data: step1Contacts } = await supabase
          .from("campaign_contacts")
          .select("id, contact_id, contacts(company_name, representative, email, category, region)")
          .eq("campaign_id", campaign.id)
          .eq("sequence_step", 1)
          .eq("status", "sent")
          .lt("sent_at", cutoffDate2)
          .limit(50);

        if (step1Contacts && step1Contacts.length > 0) {
          for (const cc of step1Contacts) {
            const contact = (cc as any).contacts;
            if (!contact) continue;

            const personalizedSubject = personalize(seq2Subject, contact);
            const trackingPixelUrl = `${FUNCTION_URL}/track-email-open?id=${cc.id}`;
            const personalizedBody = personalize(seq2Body, contact) +
              `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;

            try {
              const res = await fetch("https://api.resend.com/emails", {
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

              if (res.ok) {
                await supabase
                  .from("campaign_contacts")
                  .update({ sequence_step: 2, status: "sent", sent_at: now.toISOString() })
                  .eq("id", cc.id);
                totalProcessed++;
              } else {
                const errBody = await res.text();
                await supabase
                  .from("campaign_contacts")
                  .update({ sequence_step: 2, status: "bounced", error_message: errBody.substring(0, 500) })
                  .eq("id", cc.id);
              }
            } catch (e: any) {
              await supabase
                .from("campaign_contacts")
                .update({ sequence_step: 2, status: "bounced", error_message: e.message?.substring(0, 500) })
                .eq("id", cc.id);
            }
          }
        }
      }

      // Process step 2 → step 3: contacts sent at step 2, not replied, N days passed
      const seq3Days = campaign.sequence_3_days ?? 7;
      const seq3Subject = campaign.sequence_3_subject;
      const seq3Body = campaign.sequence_3_body;

      if (seq3Subject && seq3Body) {
        const cutoffDate3 = new Date(now.getTime() - seq3Days * 24 * 60 * 60 * 1000).toISOString();

        // Get step 2 contacts: sent or opened (not replied), enough time passed
        const { data: step2Contacts } = await supabase
          .from("campaign_contacts")
          .select("id, contact_id, contacts(company_name, representative, email, category, region)")
          .eq("campaign_id", campaign.id)
          .eq("sequence_step", 2)
          .in("status", ["sent", "opened"])
          .lt("sent_at", cutoffDate3)
          .limit(50);

        if (step2Contacts && step2Contacts.length > 0) {
          for (const cc of step2Contacts) {
            const contact = (cc as any).contacts;
            if (!contact) continue;

            const personalizedSubject = personalize(seq3Subject, contact);
            const trackingPixelUrl = `${FUNCTION_URL}/track-email-open?id=${cc.id}`;
            const personalizedBody = personalize(seq3Body, contact) +
              `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;

            try {
              const res = await fetch("https://api.resend.com/emails", {
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

              if (res.ok) {
                await supabase
                  .from("campaign_contacts")
                  .update({ sequence_step: 3, status: "sent", sent_at: now.toISOString() })
                  .eq("id", cc.id);
                totalProcessed++;
              } else {
                const errBody = await res.text();
                await supabase
                  .from("campaign_contacts")
                  .update({ sequence_step: 3, status: "bounced", error_message: errBody.substring(0, 500) })
                  .eq("id", cc.id);
              }
            } catch (e: any) {
              await supabase
                .from("campaign_contacts")
                .update({ sequence_step: 3, status: "bounced", error_message: e.message?.substring(0, 500) })
                .eq("id", cc.id);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Process sequences error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
