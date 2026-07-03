import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

export async function getCampaignCreatives(campaignId) {
  const supabase = await createClient();

  const { data: memoryEvents, error: memoryError } = await supabase
    .from("campaign_memory_events")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "creative")
    .not("artifact", "is", null)
    .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
    .order("created_at", { ascending: false });

  const { data: fallbackOutputs, error: fallbackError } = await supabase
    .from("campaign_outputs")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("module", "creative")
    .order("created_at", { ascending: false });

  if (memoryError) {
    console.error("getCampaignCreatives memory error:", memoryError);
  }

  if (fallbackError) {
    console.error("getCampaignCreatives fallback error:", fallbackError);
  }

  return [
    ...mergeCreativeMemoryEvents(
      (memoryEvents || []).map(mapCreativeMemoryEvent),
    ),
    ...(fallbackOutputs || []).map(mapCreativeOutput),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function mergeCreativeMemoryEvents(events) {
  const groups = new Map();

  for (const event of events) {
    const key = event.type || "image_post";
    groups.set(key, [...(groups.get(key) || []), event]);
  }

  return [...groups.values()].map(mergeCreativeTaskEvents);
}

function mergeCreativeTaskEvents(events) {
  const sorted = [...events].sort(compareNewestFirst);
  const conceptEvent =
    sorted.find((event) => event.artifact === "creative_concept") || sorted[0];
  const imageEvent =
    sorted.find(
      (event) =>
        event.artifact === "image_asset" &&
        hasCreativeImage(event) &&
        !isFailedCreativeImage(event),
    ) ||
    sorted.find((event) => event.artifact === "image_asset" && hasCreativeImage(event)) ||
    null;
  const conceptReport = conceptEvent?.creativeOutput || {};
  const imageReport = imageEvent?.creativeOutput || {};
  const latestCreatedAt = sorted[0]?.created_at || conceptEvent?.created_at || "";

  return {
    ...conceptEvent,
    id: conceptEvent?.id || imageEvent?.id,
    records: sorted.map((event) => event.id),
    artifact: "creative_concept",
    content:
      imageReport.asset?.imageUrl ||
      imageEvent?.content ||
      conceptEvent?.content ||
      "",
    creativeOutput: {
      ...conceptReport,
      ...(imageEvent ? imageReport : {}),
      type: conceptReport.type || imageReport.type || conceptEvent?.type || "image_post",
      title:
        conceptReport.title ||
        imageReport.title ||
        conceptEvent?.title ||
        "Creative Concept",
      specification:
        conceptReport.specification || imageReport.specification || {},
      visualDirection:
        conceptReport.visualDirection || imageReport.visualDirection || {},
      concept: conceptReport.concept || imageReport.concept || "",
      caption: conceptReport.caption || imageReport.caption || "",
      designDirection:
        conceptReport.designDirection || imageReport.designDirection || "",
      visualNotes: conceptReport.visualNotes || imageReport.visualNotes || [],
      cta: conceptReport.cta || imageReport.cta || "",
      imagePrompt: imageReport.imagePrompt || conceptReport.imagePrompt || "",
      asset: imageReport.asset || conceptReport.asset || null,
      review: imageReport.review || conceptReport.review || null,
      metadata: {
        ...(conceptReport.metadata || {}),
        ...(imageReport.metadata || {}),
      },
    },
    approval_status:
      imageEvent?.approval_status || conceptEvent?.approval_status || "pending",
    created_at: latestCreatedAt,
  };
}

function compareNewestFirst(a, b) {
  return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
}

function hasCreativeImage(event) {
  return Boolean(
    event?.creativeOutput?.asset?.imageUrl ||
      event?.creativeOutput?.asset?.remoteUrl ||
      event?.content,
  );
}

function isFailedCreativeImage(event) {
  const status = String(
    event?.creativeOutput?.metadata?.imageStatus ||
      event?.metadata?.memoryEvent?.payload?.imageStatus ||
      event?.approval_status ||
      "",
  ).toLowerCase();

  return status === "failed" || status === "rejected";
}

function mapCreativeMemoryEvent(row) {
  const payload = row.payload || {};
  const artifact = resolveMemoryArtifact(row);

  return {
    id: row.id,
    source: "campaign_memory_events",
    campaign_id: row.campaign_id,
    module: row.module,
    artifact,
    type: row.task || payload.task || payload.type || artifact || "image_post",
    title: payload.title || row.summary || "Creative Concept",
    prompt: "",
    content: payload.asset?.imageUrl || payload.content || "",
    creativeOutput: {
      ...payload,
      type: payload.type || row.task || "image_post",
      title: payload.title || row.summary || "Creative Concept",
      concept: payload.concept || row.summary || "",
      metadata: {
        ...(payload.metadata || {}),
        provider: payload.provider || "memory",
        textProvider: payload.textProvider || payload.metadata?.textProvider || "",
        imageProvider:
          payload.asset?.provider ||
          payload.imageProvider ||
          payload.metadata?.imageProvider ||
          "",
        imageFallbackUsed: Boolean(
          payload.imageFallbackUsed || payload.metadata?.imageFallbackUsed,
        ),
        imageFallbackProvider:
          payload.imageFallbackProvider ||
          payload.metadata?.imageFallbackProvider ||
          "",
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
      textProvider: payload.textProvider || payload.metadata?.textProvider || "",
      imageProvider:
        payload.asset?.provider ||
        payload.imageProvider ||
        payload.metadata?.imageProvider ||
        "",
      confidence: payload.confidence || row.confidence || 0,
      generatedAt: payload.generatedAt || row.created_at || "",
    },
  };
}

function mapCreativeOutput(row) {
  const payload = row.metadata?.memoryEvent?.payload || {};

  return {
    ...row,
    source: "campaign_outputs",
    creativeOutput: {
      ...payload,
      type: payload.type || row.type || "image_post",
      title: payload.title || row.title || "Creative Concept",
      concept: payload.concept || row.title || "",
      asset: payload.asset || {
        imageUrl: row.content || "",
      },
      metadata: {
        ...(row.metadata || {}),
        ...(payload.metadata || {}),
        provider: row.metadata?.provider || payload.provider || "memory",
        textProvider:
          row.metadata?.textProvider || payload.textProvider || payload.metadata?.textProvider || "",
        imageProvider:
          payload.asset?.provider ||
          row.metadata?.imageProvider ||
          payload.imageProvider ||
          payload.metadata?.imageProvider ||
          "",
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

export async function getCreativeTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creative_asset_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
