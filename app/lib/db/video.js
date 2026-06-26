import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

export async function getCampaignVideos(campaignId) {
  const supabase = await createClient();

  const { data: memoryEvents, error: memoryError } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "video")
    .not("artifact", "is", null)
    .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
    .order("created_at", { ascending: false });

  const { data: outputs, error: outputError } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "video")
    .order("created_at", { ascending: false });

  if (memoryError) console.error("getCampaignVideos memory error:", memoryError);
  if (outputError) console.error("getCampaignVideos output error:", outputError);

  return [
    ...(memoryEvents || []).map(mapVideoMemory),
    ...(outputs || []).map(mapVideoOutput),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function mapVideoMemory(row) {
  const payload = row.payload || {};
  const artifact = resolveMemoryArtifact(row);
  return {
    id: row.id,
    source: "campaign_memory_events",
    module: "video",
    artifact,
    type: artifact || row.task || row.type || payload.type || "video_script",
    title: payload.title || row.summary || "Video Plan",
    content: payload.body || "",
    videoOutput: {
      ...payload,
      type: artifact || payload.type || row.task || row.type,
      title: payload.title || row.summary || "Video Plan",
      summary: payload.summary || row.summary || "",
      metadata: {
        provider: payload.provider || "memory",
        confidence: payload.confidence || row.confidence || 0,
        generatedAt: payload.generatedAt || row.created_at || "",
      },
    },
    approval_status: row.approval_status,
    risk_level: row.risk_level,
    created_at: row.created_at,
  };
}

function mapVideoOutput(row) {
  const payload = row.metadata?.memoryEvent?.payload || {};
  return {
    ...row,
    source: "campaign_outputs",
    videoOutput: {
      ...payload,
      type: payload.type || row.type || "video_script",
      title: payload.title || row.title || "Video Plan",
      summary: payload.summary || "",
      metadata: {
        provider: row.metadata?.provider || payload.provider || "memory",
        confidence: row.metadata?.confidence || payload.confidence || 0,
        generatedAt:
          row.metadata?.generatedAt || payload.generatedAt || row.created_at || "",
      },
    },
    approval_status:
      row.approval_status ||
      row.metadata?.memoryEvent?.approval_status ||
      "pending",
  };
}
export async function getVideoTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("video_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return data ?? [];
}
