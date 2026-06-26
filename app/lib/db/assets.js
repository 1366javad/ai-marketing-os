import { createClient } from "@/app/lib/supabase/server";
import { resolveMemoryArtifact } from "@/app/lib/ai/campaign/memorySchema";

const LIBRARY_MODULES = new Set([
  "research",
  "seo",
  "content",
  "creative",
  "ads",
  "video",
]);

export async function getCampaignAssets(campaignId) {
  const supabase = await createClient();

  const [memoryResult, outputsResult, assetsResult] = await Promise.all([
    supabase
      .from("campaign_memory_events")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("module", [...LIBRARY_MODULES])
      .not("artifact", "is", null)
      .in("approval_status", ["pending", "approved", "rejected", "auto_saved"])
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_outputs")
      .select("*")
      .eq("campaign_id", campaignId)
      .in("module", [...LIBRARY_MODULES])
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_assets")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
  ]);

  logSourceError("campaign_memory_events", memoryResult.error);
  logSourceError("campaign_outputs", outputsResult.error);
  logSourceError("campaign_assets", assetsResult.error);

  const memoryRows = memoryResult.data || [];
  const supersededMemoryIds = new Set(
    memoryRows.map((row) => row.supersedes).filter(Boolean),
  );
  const memoryAssets = memoryRows
    .filter(
      (row) =>
        !supersededMemoryIds.has(row.id) &&
        row.payload?.deleted !== true,
    )
    .map(mapMemoryEvent);
  const outputAssets = (outputsResult.data || []).map(mapCampaignOutput);
  const exportedAssets = (assetsResult.data || []).map(mapCampaignAsset);

  return groupAssets([
    ...memoryAssets,
    ...outputAssets,
    ...exportedAssets,
  ]).sort(
    (a, b) =>
      new Date(b.generatedAt || 0).getTime() -
      new Date(a.generatedAt || 0).getTime(),
  );
}

function mapMemoryEvent(row) {
  const payload = row.payload || {};
  const assetModule = normalizeModule(row.module);
  const artifact = resolveMemoryArtifact(row);
  const content = formatPayloadContent(payload, row.summary);
  const assetUrl = resolveAssetUrl(payload);

  return {
    id: `memory-${row.id}`,
    sourceId: row.id,
    source: "campaign_memory_events",
    module: assetModule,
    title:
      cleanText(payload.title) ||
      cleanText(payload.subject) ||
      cleanText(row.summary) ||
      `${titleCase(assetModule)} Output`,
    outputType: normalizeOutputType(
      artifact || row.task || payload.task || payload.type || row.type,
    ),
    status: normalizeStatus(row.approval_status),
    generatedAt: payload.generatedAt || row.created_at || "",
    provider:
      cleanText(payload.provider) ||
      cleanText(payload.metadata?.provider) ||
      "memory",
    content,
    url: assetUrl,
    mimeType: resolveMimeType(payload, assetUrl),
    fileName: "",
    riskLevel: row.risk_level || "",
    artifact,
    records: [{ source: "campaign_memory_events", sourceId: row.id }],
  };
}

function mapCampaignOutput(row) {
  const memoryEvent = row.metadata?.memoryEvent || {};
  const payload = memoryEvent.payload || {};
  const assetModule = normalizeModule(row.module);
  const assetUrl = resolveAssetUrl(payload) || resolveContentUrl(row.content);

  return {
    id: `output-${row.id}`,
    sourceId: row.id,
    source: "campaign_outputs",
    module: assetModule,
    title:
      cleanText(payload.title) ||
      cleanText(payload.subject) ||
      cleanText(row.title) ||
      `${titleCase(assetModule)} Output`,
    outputType: normalizeOutputType(
      row.type || payload.task || payload.type || memoryEvent.task,
    ),
    status: normalizeStatus(
      row.approval_status || memoryEvent.approval_status || "draft",
    ),
    generatedAt:
      row.metadata?.generatedAt ||
      payload.generatedAt ||
      row.created_at ||
      "",
    provider:
      cleanText(row.metadata?.provider) ||
      cleanText(payload.provider) ||
      "unknown",
    content:
      formatPayloadContent(payload, "") ||
      (assetUrl === row.content ? "" : cleanText(row.content)),
    url: assetUrl,
    mimeType: resolveMimeType(payload, assetUrl),
    fileName: "",
    riskLevel: memoryEvent.risk_level || "",
    records: [{ source: "campaign_outputs", sourceId: row.id }],
  };
}

function mapCampaignAsset(row) {
  const metadata = row.metadata || {};
  const url =
    row.file_url ||
    row.url ||
    row.public_url ||
    row.storage_url ||
    metadata.url ||
    "";

  return {
    id: `asset-${row.id}`,
    sourceId: row.id,
    source: "campaign_assets",
    module: "exports",
    title:
      row.name ||
      row.title ||
      row.file_name ||
      metadata.fileName ||
      "Campaign Export",
    outputType: normalizeOutputType(
      row.type || row.asset_type || row.file_type || metadata.type || "export",
    ),
    status: normalizeStatus(
      row.approval_status || row.status || metadata.status || "approved",
    ),
    generatedAt: row.created_at || row.updated_at || "",
    provider: cleanText(metadata.provider) || "",
    content:
      cleanText(row.content) ||
      cleanText(row.description) ||
      cleanText(metadata.content),
    url,
    mimeType:
      row.mime_type ||
      row.content_type ||
      metadata.mimeType ||
      resolveMimeType(metadata, url),
    fileName:
      row.file_name || row.name || metadata.fileName || "campaign-export",
    riskLevel: row.risk_level || "",
    records: [{ source: "campaign_assets", sourceId: row.id }],
  };
}

function groupAssets(assets) {
  const groups = new Map();

  for (const asset of assets) {
    if (!asset.module || (!asset.content && !asset.url && !asset.title)) {
      continue;
    }

    const key = buildAssetEntityKey(asset);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...asset,
        entityKey: key,
        records: [...(asset.records || [])],
      });
      continue;
    }

    groups.set(key, mergeAssetRecords(current, asset));
  }

  return [...groups.values()];
}

function buildAssetEntityKey(asset) {
  const generatedAt = normalizeGeneratedAt(asset.generatedAt);
  const title = normalizeIdentityText(asset.title);
  const outputType = normalizeOutputType(asset.outputType);

  return [asset.module, outputType, generatedAt, title].join(":");
}

function mergeAssetRecords(current, incoming) {
  const records = [...(current.records || []), ...(incoming.records || [])];
  const seen = new Set();
  const uniqueRecords = records.filter((record) => {
    const key = `${record.source}:${record.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const preferred =
    sourcePriority(incoming.source) < sourcePriority(current.source)
      ? incoming
      : current;
  const secondary = preferred === current ? incoming : current;

  return {
    ...preferred,
    entityKey: current.entityKey,
    records: uniqueRecords,
    content: preferred.content || secondary.content,
    url: preferred.url || secondary.url,
    mimeType: preferred.mimeType || secondary.mimeType,
    fileName: preferred.fileName || secondary.fileName,
    provider:
      preferred.provider && preferred.provider !== "memory"
        ? preferred.provider
        : secondary.provider || preferred.provider,
    status: preferred.status || secondary.status,
  };
}

function sourcePriority(source) {
  if (source === "campaign_assets") return 0;
  if (source === "campaign_memory_events") return 1;
  return 2;
}

function normalizeGeneratedAt(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 19);
}

function normalizeIdentityText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function formatPayloadContent(payload, fallback) {
  if (!payload || typeof payload !== "object") return cleanText(fallback);

  const direct =
    cleanText(payload.body) ||
    cleanText(payload.content) ||
    cleanText(payload.summary);
  const sections = [
    ["Summary", payload.summary],
    ["Concept", payload.concept],
    ["Headlines", payload.headlines],
    ["Primary Text", payload.primaryTexts || payload.primary_texts],
    ["Descriptions", payload.descriptions],
    ["CTAs", payload.ctas || payload.cta],
    ["Insights", payload.insights],
    ["Recommendations", payload.recommendations],
    ["Risks", payload.risks],
    ["Next Actions", payload.nextActions || payload.next_actions],
    ["Keywords", payload.keywords],
    ["Visual Notes", payload.visualNotes],
  ]
    .map(([title, value]) => formatSection(title, value))
    .filter(Boolean);

  return sections.join("\n\n") || direct || cleanText(fallback);
}

function formatSection(title, value) {
  if (Array.isArray(value) && value.length > 0) {
    return `${title}\n${value
      .map((item) => `- ${stringifyValue(item)}`)
      .filter((item) => item !== "- ")
      .join("\n")}`;
  }

  const text = cleanText(value);
  return text ? `${title}\n${text}` : "";
}

function stringifyValue(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  return Object.values(value)
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map(stringifyValue)
    .filter(Boolean)
    .join(" - ");
}

function resolveAssetUrl(payload) {
  return (
    payload?.asset?.imageUrl ||
    payload?.asset?.url ||
    payload?.imageUrl ||
    payload?.fileUrl ||
    ""
  );
}

function resolveContentUrl(value) {
  const text = cleanText(value);
  return /^(https?:\/\/|data:image\/)/i.test(text) ? text : "";
}

function resolveMimeType(payload, url) {
  if (payload?.asset?.mimeType) return payload.asset.mimeType;
  if (String(url).startsWith("data:image/")) {
    return String(url).slice(5, String(url).indexOf(";"));
  }
  if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url)) return "image";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return "video";
  return "";
}

function normalizeModule(value) {
  const assetModule = String(value || "").toLowerCase();
  return LIBRARY_MODULES.has(assetModule) ? assetModule : "";
}

function normalizeStatus(value) {
  const status = String(value || "draft").toLowerCase();
  if (status === "approved" || status === "auto_saved") return "approved";
  if (status === "pending" || status === "pending_review") return "pending";
  if (status === "rejected") return "rejected";
  return "draft";
}

function normalizeOutputType(value) {
  return String(value || "output")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function logSourceError(source, error) {
  if (error) {
    console.error(`getCampaignAssets ${source} error:`, error);
  }
}
