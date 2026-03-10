import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent GIF
const TRANSPARENT_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0)
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const campaignContactId = url.searchParams.get("id");

  if (campaignContactId) {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabaseAdmin
        .from("campaign_contacts")
        .update({ status: "opened", opened_at: new Date().toISOString() })
        .eq("id", campaignContactId)
        .in("status", ["sent"]); // Only update if currently sent

      // Also update campaign total_opened
      const { data: cc } = await supabaseAdmin
        .from("campaign_contacts")
        .select("campaign_id")
        .eq("id", campaignContactId)
        .single();

      if (cc) {
        await supabaseAdmin.rpc("increment_campaign_opened", { cid: cc.campaign_id }).catch(() => {
          // Fallback: manual increment
        });
        // Direct update as fallback
        const { data: camp } = await supabaseAdmin
          .from("campaigns")
          .select("total_opened")
          .eq("id", cc.campaign_id)
          .single();
        if (camp) {
          await supabaseAdmin
            .from("campaigns")
            .update({ total_opened: (camp.total_opened ?? 0) + 1 })
            .eq("id", cc.campaign_id);
        }
      }
    } catch (e) {
      console.error("Track open error:", e);
    }
  }

  return new Response(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
