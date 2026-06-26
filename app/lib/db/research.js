import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

export async function getResearch(campaignId) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_research")
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getCampaignResearchOutputs(campaignId) {
  const supabase = await createClient();

  const { data: memoryEvents, error: memoryError } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "research")
    .not("artifact", "is", null)
    .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
    .order("created_at", { ascending: false });

  const { data: fallbackOutputs, error: fallbackError } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "research")
    .order("created_at", { ascending: false });

  if (memoryError) {
    console.error("getCampaignResearchOutputs memory error:", memoryError);
  }

  if (fallbackError) {
    console.error("getCampaignResearchOutputs fallback error:", fallbackError);
  }

  return [
    ...(memoryEvents || []).map(mapResearchMemoryEvent),
    ...(fallbackOutputs || []).map(mapResearchOutput),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function mapResearchMemoryEvent(row) {
  const payload = row.payload || {};
  const artifact = resolveMemoryArtifact(row);

  return {
    id: row.id,
    source: "campaign_memory_events",
    campaign_id: row.campaign_id,
    module: row.module,
    artifact,
    type: artifact || row.task || payload.task || payload.type || "research",
    title: payload.title || row.summary || "Research Report",
    prompt: "",
    content: payload.content || "",
    researchOutput: {
      type: artifact || payload.type || row.task || "research",
      title: payload.title || row.summary || "Research Report",
      summary: payload.summary || row.summary || "",
      insights: payload.insights || [],
      recommendations: payload.recommendations || [],
      risks: payload.risks || [],
      nextActions: payload.nextActions || [],
      metadata: {
        provider: payload.provider || "memory",
        confidence: payload.confidence || row.confidence || 0,
        generatedAt: payload.generatedAt || row.created_at || "",
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

function mapResearchOutput(row) {
  const payload = row.metadata?.memoryEvent?.payload || {};

  return {
    ...row,
    source: "campaign_outputs",
    researchOutput: {
      type: payload.type || row.type || "research",
      title: payload.title || row.title || "Research Report",
      summary: payload.summary || "",
      insights: payload.insights || [],
      recommendations: payload.recommendations || [],
      risks: payload.risks || [],
      nextActions: payload.nextActions || [],
      metadata: {
        provider: row.metadata?.provider || payload.provider || "memory",
        confidence: row.metadata?.confidence || payload.confidence || 0,
        generatedAt: row.metadata?.generatedAt || payload.generatedAt || row.created_at || "",
      },
    },
    approval_status: row.approval_status || row.metadata?.memoryEvent?.approval_status || "auto_saved",
  };
}

export async function createResearch(campaignId, values = {}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_research")
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

export async function updateResearch(campaignId, values = {}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_research")
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
