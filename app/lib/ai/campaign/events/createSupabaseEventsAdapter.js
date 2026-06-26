const {
  canonicalizeMemoryEvent,
  matchesArtifactSelectors,
  resolveMemoryArtifact,
} = require("../memorySchema");

function createSupabaseEventsAdapter(supabase) {
  return async (campaignId, artifactSelectors, readOptions = {}) => {
    if (Array.isArray(artifactSelectors) && artifactSelectors.length === 0) {
      return [];
    }

    let memoryQuery = supabase
      .from("campaign_memory_events")
      .select("*")
      .eq("campaign_id", campaignId)
      .in(
        "approval_status",
        readOptions.includePending
          ? ["pending", "approved", "auto_saved"]
          : ["approved", "auto_saved"],
      )
      .order("created_at", { ascending: false });

    let outputQuery = supabase
      .from("campaign_outputs")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (Array.isArray(artifactSelectors)) {
      const modules = [...new Set(artifactSelectors.map((item) => item.module))];
      const artifacts = [
        ...new Set(artifactSelectors.map((item) => item.artifact)),
      ];

      memoryQuery = memoryQuery
        .in("module", modules)
        .in("artifact", artifacts);
      outputQuery = outputQuery.in("module", modules);
    }

    const [
      { data: memoryRows, error: memoryError },
      { data: outputRows, error: outputError },
    ] = await Promise.all([memoryQuery, outputQuery]);

    if (memoryError) throw memoryError;
    if (outputError) {
      console.warn("Campaign outputs context fallback failed:", outputError);
    }

    return [
      ...(memoryRows || []).map(mapMemoryRow),
      ...(outputRows || []).map(mapCampaignOutput).filter(Boolean),
    ].filter((event) =>
      matchesArtifactSelectors(event, artifactSelectors),
    );
  };
}

function mapMemoryRow(row) {
  return canonicalizeMemoryEvent({
    id: row.id,
    campaignId: row.campaign_id,
    module: row.module,
    artifact: row.artifact,
    type: row.type,
    approvalStatus: row.approval_status,
    confidence: row.confidence || 0,
    riskLevel: row.risk_level || "medium",
    task: row.task || row.artifact || row.type,
    summary: row.summary || "",
    payload: row.payload || {},
    supersedes: row.supersedes || null,
    createdAt: row.created_at,
    createdBy: row.created_by || "system",
  });
}

function mapCampaignOutput(row) {
  const memoryEvent = row.metadata?.memoryEvent || {};
  const memoryModule = row.module || memoryEvent.module;
  const artifact = resolveMemoryArtifact({
    module: memoryModule,
    artifact: memoryEvent.artifact,
    type: row.type || memoryEvent.type,
    task: memoryEvent.task,
    payload: memoryEvent.payload || row.metadata,
  });

  if (!memoryModule || !artifact) return null;

  return canonicalizeMemoryEvent({
    id: row.id,
    campaignId: row.campaign_id,
    module: memoryModule,
    artifact,
    type: artifact,
    approvalStatus:
      row.approval_status ||
      memoryEvent.approval_status ||
      "approved",
    confidence: row.metadata?.confidence || memoryEvent.confidence || 0.75,
    riskLevel: memoryEvent.risk_level || "medium",
    task: row.type || memoryEvent.task || artifact,
    summary: row.title || summarize(row.content),
    payload: memoryEvent.payload || row.metadata || { content: row.content },
    supersedes: null,
    createdAt: row.created_at,
    createdBy: "system",
  });
}

function summarize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

module.exports = { createSupabaseEventsAdapter };
