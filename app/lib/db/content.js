import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

export async function getCampaignContent(campaignId) {
  const supabase = await createClient();

  const { data: memoryEvents, error: memoryError } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "content")
    .not("artifact", "is", null)
    .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
    .order("created_at", { ascending: false });

  const { data: fallbackOutputs, error: fallbackError } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "content")
    .order("created_at", { ascending: false });

  if (memoryError) {
    console.error("getCampaignContent memory error:", memoryError);
  }

  if (fallbackError) {
    console.error("getCampaignContent fallback error:", fallbackError);
  }

  return [
    ...(memoryEvents || []).map(mapContentMemoryEvent),
    ...(fallbackOutputs || []).map(mapContentOutput),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function mapContentMemoryEvent(row) {
  const payload = row.payload || {};
  const artifact = resolveMemoryArtifact(row);
  const type = resolveContentTypeFromEvent(
    payload.type || payload.task || row.task || artifact || row.type,
  );

  return {
    id: row.id,
    source: "campaign_memory_events",
    campaign_id: row.campaign_id,
    module: row.module,
    artifact,
    type,
    title: payload.title || payload.subject || row.summary || "Content Draft",
    prompt: "",
    content: payload.body || payload.content || "",
    approval_status: row.approval_status,
    confidence: row.confidence,
    risk_level: row.risk_level,
    created_at: row.created_at,
    metadata: {
      memoryEvent: row,
      cta: payload.cta || "",
      wordCount: payload.wordCount || 0,
      generatedAt: payload.generatedAt || row.created_at || "",
    },
  };
}

function mapContentOutput(row) {
  const payload = row.metadata?.memoryEvent?.payload || {};
  const artifact = row.metadata?.memoryEvent?.artifact || row.artifact;
  const type = resolveContentTypeFromEvent(
    row.type || artifact || payload.type || payload.task,
  );

  return {
    ...row,
    type,
    title: row.title || payload.title || payload.subject || "Content Draft",
    content: row.content || payload.body || payload.content || "",
    approval_status:
      row.approval_status ||
      row.metadata?.memoryEvent?.approval_status ||
      "auto_saved",
  };
}

function resolveContentTypeFromEvent(eventType) {
  const normalized = String(eventType || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map = {
    blog: "blog_post",
    blog_post: "blog_post",
    blog_draft: "blog_post",
    email: "email",
    email_draft: "email",
    newsletter: "newsletter",
    landing: "landing_page",
    landing_page: "landing_page",
    case_study: "case_study",
    linkedin: "linkedin_post",
    linkedin_post: "linkedin_post",
    instagram: "instagram_caption",
    instagram_caption: "instagram_caption",
  };

  return map[normalized] || "blog_post";
}

export async function createContentOutput({
  campaignId,
  type,
  prompt,
  content,
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_outputs")
    .insert({
      campaign_id: campaignId,
      module: "content",
      type,
      prompt,
      content,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getContentTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
