import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

export async function getCampaignAds(campaignId) {
  const supabase = await createClient();

  const { data: memoryEvents, error: memoryError } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "ads")
    .not("artifact", "is", null)
    .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
    .order("created_at", { ascending: false });

  const { data: fallbackOutputs, error: fallbackError } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "ads")
    .order("created_at", { ascending: false });

  if (memoryError) {
    console.error("getCampaignAds memory error:", memoryError);
  }

  if (fallbackError) {
    console.error("getCampaignAds fallback error:", fallbackError);
  }

  return [
    ...(memoryEvents || []).map(mapAdsMemoryEvent),
    ...(fallbackOutputs || []).map(mapAdsOutput),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function mapAdsMemoryEvent(row) {
  const payload = row.payload || {};
  const artifact = resolveMemoryArtifact(row);

  return {
    id: row.id,
    source: "campaign_memory_events",
    campaign_id: row.campaign_id,
    module: "ads",
    artifact,
    type: row.task || payload.task || payload.type || artifact || "google_ads",
    title: payload.title || row.summary || "Ads Report",
    prompt: "",
    content: payload.content || "",
    adsOutput: {
      ...payload,
      type: payload.type || row.task || "google_ads",
      title: payload.title || row.summary || "Ads Report",
      summary: payload.summary || row.summary || "",
      metadata: {
        provider: payload.provider || "memory",
        confidence: payload.confidence || row.confidence || 0,
        generatedAt: payload.generatedAt || row.created_at || "",
        ...(payload.metadata || {}),
      },
    },
    approval_status: row.approval_status,
    confidence: row.confidence,
    risk_level: row.risk_level,
    created_at: row.created_at,
    metadata: {
      memoryEvent: row,
      provider: payload.provider || "memory",
      confidence: payload.confidence || row.confidence || 0,
      generatedAt: payload.generatedAt || row.created_at || "",
    },
  };
}

function mapAdsOutput(row) {
  const payload = row.metadata?.memoryEvent?.payload || {};
  const legacyContent = String(row.content || "").trim();

  return {
    ...row,
    source: "campaign_outputs",
    adsOutput: {
      ...payload,
      type: payload.type || row.type || "google_ads",
      title: payload.title || row.title || "Ads Report",
      summary:
        payload.summary ||
        (legacyContent ? "Legacy ad output loaded from campaign history." : ""),
      primaryTexts:
        payload.primaryTexts ||
        payload.primary_texts ||
        (legacyContent ? [legacyContent] : []),
      metadata: {
        provider: row.metadata?.provider || payload.provider || "memory",
        confidence: row.metadata?.confidence || payload.confidence || 0,
        generatedAt:
          row.metadata?.generatedAt ||
          payload.generatedAt ||
          row.created_at ||
          "",
        ...(payload.metadata || {}),
      },
    },
    approval_status:
      row.approval_status ||
      row.metadata?.memoryEvent?.approval_status ||
      "pending",
    risk_level:
      row.risk_level || row.metadata?.memoryEvent?.risk_level || "high",
  };
}

export async function getAdPlatforms() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_platforms")
    .select(
      `
      *,
      ad_output_types(*)
    `,
    )
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return data ?? [];
}
