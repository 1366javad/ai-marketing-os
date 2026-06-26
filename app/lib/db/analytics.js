import { createClient } from "@/app/lib/supabase/server";
import { buildCampaignIntelligence } from "@/app/lib/analytics/engine";

export async function getCampaignIntelligence(campaign) {
  if (!campaign?.id) return null;
  const supabase = await createClient();
  const [memoryResult, outputsResult, assetsResult] = await Promise.all([
    supabase
      .from("campaign_memory_events")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_outputs")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false }),
  ]);

  if (memoryResult.error) {
    console.error("Analytics memory error:", memoryResult.error);
  }
  if (outputsResult.error) {
    console.error("Analytics outputs error:", outputsResult.error);
  }
  if (assetsResult.error) {
    console.error("Analytics assets error:", assetsResult.error);
  }

  return buildCampaignIntelligence({
    campaign,
    memoryEvents: memoryResult.data || [],
    outputs: outputsResult.data || [],
    assets: assetsResult.data || [],
  });
}
