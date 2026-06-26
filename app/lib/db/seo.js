import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

export async function getSEO(campaignId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_seo")
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getCampaignSeoOutputs(campaignId) {
  const supabase = await createClient();

  const { data: memoryEvents, error: memoryError } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "seo")
    .not("artifact", "is", null)
    .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
    .order("created_at", { ascending: false });

  const { data: fallbackOutputs, error: fallbackError } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "seo")
    .order("created_at", { ascending: false });

  if (memoryError) {
    console.error("getCampaignSeoOutputs memory error:", memoryError);
  }

  if (fallbackError) {
    console.error("getCampaignSeoOutputs fallback error:", fallbackError);
  }

  return [
    ...(memoryEvents || []).map(mapSeoMemoryEvent),
    ...(fallbackOutputs || []).map(mapSeoOutput),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function mapSeoMemoryEvent(row) {
  const payload = row.payload || {};
  const artifact = resolveMemoryArtifact(row);

  return {
    id: row.id,
    source: "campaign_memory_events",
    campaign_id: row.campaign_id,
    module: row.module,
    artifact,
    type: artifact || row.task || payload.task || payload.type || "seo",
    title: payload.title || row.summary || "SEO Report",
    prompt: "",
    content: payload.content || "",
    seoOutput: {
      ...payload,
      type: artifact || payload.type || row.task || "seo",
      title: payload.title || row.summary || "SEO Report",
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

function mapSeoOutput(row) {
  const payload = row.metadata?.memoryEvent?.payload || {};

  return {
    ...row,
    source: "campaign_outputs",
    seoOutput: {
      ...payload,
      type: payload.type || row.type || "seo",
      title: payload.title || row.title || "SEO Report",
      summary: payload.summary || "",
      metadata: {
        provider: row.metadata?.provider || payload.provider || "memory",
        confidence: row.metadata?.confidence || payload.confidence || 0,
        generatedAt:
          row.metadata?.generatedAt || payload.generatedAt || row.created_at || "",
        ...(payload.metadata || {}),
      },
    },
    approval_status:
      row.approval_status ||
      row.metadata?.memoryEvent?.approval_status ||
      "auto_saved",
  };
}

export async function createSEO(campaignId, values = {}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_seo")
    .insert({
      campaign_id: campaignId,
      ...values,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateSEO(campaignId, values = {}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_seo")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("campaign_id", campaignId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
