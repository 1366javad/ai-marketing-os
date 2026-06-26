import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";

const DELETABLE_SOURCES = new Set([
  "campaign_memory_events",
  "campaign_outputs",
  "campaign_assets",
]);

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const campaignId = body.campaignId;
    const requestedRecords = normalizeRequestedRecords(body);

    if (!campaignId || requestedRecords.length === 0) {
      return Response.json(
        { error: "Invalid asset delete request." },
        { status: 400 },
      );
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign || campaign.user_id !== user.id) {
      return Response.json({ error: "Campaign not found." }, { status: 404 });
    }

    const related = await findRelatedRecords({
      supabase,
      campaignId,
      requestedRecords,
    });

    const storageTargets = [
      ...related.assets,
      ...related.outputs,
      ...related.memory,
    ].flatMap(resolveStorageTargets);
    const filesDeleted = await deleteStorageFiles(supabase, storageTargets);
    const outputsDeleted = await deleteRows(
      supabase,
      "campaign_outputs",
      campaignId,
      related.outputs.map((row) => row.id),
    );
    const assetsDeleted = await deleteRows(
      supabase,
      "campaign_assets",
      campaignId,
      related.assets.map((row) => row.id),
    );
    const memoryTombstoned = await tombstoneMemoryEvents({
      supabase,
      campaignId,
      userId: user.id,
      events: related.memory,
    });

    const result = {
      outputsDeleted,
      assetsDeleted,
      filesDeleted,
      memoryTombstoned,
    };
    const changed = Object.values(result).some((count) => count > 0);

    if (!changed) {
      return Response.json(
        {
          success: false,
          error: "No related asset records were changed.",
          ...result,
        },
        { status: 404 },
      );
    }

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("Asset delete error:", error);
    return Response.json(
      { error: error?.message || "Asset could not be deleted." },
      { status: 500 },
    );
  }
}

function normalizeRequestedRecords(body) {
  const records = Array.isArray(body.records) ? body.records : [];
  const fallback =
    body.source && body.sourceId
      ? [{ source: body.source, sourceId: body.sourceId }]
      : [];
  const seen = new Set();

  return [...records, ...fallback]
    .map((record) => ({
      source: String(record?.source || ""),
      sourceId: record?.sourceId,
    }))
    .filter((record) => {
      if (!DELETABLE_SOURCES.has(record.source) || !record.sourceId) {
        return false;
      }

      const key = `${record.source}:${record.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function findRelatedRecords({ supabase, campaignId, requestedRecords }) {
  const groupedIds = {
    campaign_memory_events: [],
    campaign_outputs: [],
    campaign_assets: [],
  };

  for (const record of requestedRecords) {
    groupedIds[record.source].push(record.sourceId);
  }

  const [memory, outputs, assets] = await Promise.all([
    selectRows(
      supabase,
      "campaign_memory_events",
      campaignId,
      groupedIds.campaign_memory_events,
    ),
    selectRows(
      supabase,
      "campaign_outputs",
      campaignId,
      groupedIds.campaign_outputs,
    ),
    selectRows(
      supabase,
      "campaign_assets",
      campaignId,
      groupedIds.campaign_assets,
    ),
  ]);

  return { memory, outputs, assets };
}

async function selectRows(supabase, table, campaignId, ids) {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("campaign_id", campaignId)
    .in("id", ids);

  if (error) throw error;
  return data || [];
}

async function deleteRows(supabase, table, campaignId, ids) {
  if (ids.length === 0) return 0;

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("campaign_id", campaignId)
    .in("id", ids)
    .select("id");

  if (error) throw error;
  return data?.length || 0;
}

async function tombstoneMemoryEvents({
  supabase,
  campaignId,
  userId,
  events,
}) {
  if (events.length === 0) return 0;

  const eventIds = events.map((event) => event.id);
  const { data: existing, error: existingError } = await supabase
    .from("campaign_memory_events")
    .select("supersedes, payload")
    .eq("campaign_id", campaignId)
    .in("supersedes", eventIds);

  if (existingError) throw existingError;

  const alreadyTombstoned = new Set(
    (existing || [])
      .filter((row) => row.payload?.deleted === true)
      .map((row) => row.supersedes)
      .filter(Boolean),
  );
  const now = new Date().toISOString();
  const tombstones = events
    .filter(
      (event) =>
        event.payload?.deleted !== true && !alreadyTombstoned.has(event.id),
      )
      .map((event) => ({
        campaign_id: campaignId,
        type: event.artifact || event.type,
        module: event.module,
        artifact: event.artifact || event.type,
      approval_status: "rejected",
      confidence: event.confidence || 0,
      risk_level: event.risk_level || "medium",
      task: event.task || event.artifact || event.type,
      summary: `Removed from Campaign Asset Library: ${event.summary || event.type}`,
      payload: {
        deleted: true,
        deletedAt: now,
        deletedAssetId: event.id,
      },
      supersedes: event.id,
      created_by: userId,
    }));

  if (tombstones.length === 0) return 0;

  const { data, error } = await supabase
    .from("campaign_memory_events")
    .insert(tombstones)
    .select("id");

  if (error) throw error;
  return data?.length || 0;
}

async function deleteStorageFiles(supabase, targets) {
  const targetsByBucket = new Map();

  for (const target of targets) {
    const paths = targetsByBucket.get(target.bucket) || new Set();
    paths.add(target.path);
    targetsByBucket.set(target.bucket, paths);
  }

  let deleted = 0;

  for (const [bucket, pathSet] of targetsByBucket) {
    const paths = [...pathSet];
    const { data, error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
    deleted += data?.length || 0;
  }

  return deleted;
}

function resolveStorageTargets(row) {
  const candidates = [
    row,
    row.metadata,
    row.payload,
    row.payload?.asset,
    row.metadata?.asset,
    row.metadata?.memoryEvent?.payload,
    row.metadata?.memoryEvent?.payload?.asset,
  ].filter(Boolean);
  const seen = new Set();

  return candidates.map(resolveStorageTarget).filter((target) => {
    if (!target) return false;
    const key = `${target.bucket}:${target.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveStorageTarget(row) {
  const metadata = row.metadata || {};
  const bucket =
    row.bucket ||
    row.storage_bucket ||
    metadata.bucket ||
    metadata.storageBucket ||
    "";
  const path =
    row.path ||
    row.storage_path ||
    row.object_path ||
    metadata.path ||
    metadata.storagePath ||
    metadata.objectPath ||
    "";

  if (bucket && path) return { bucket, path };

  const url =
    row.file_url ||
    row.url ||
    row.public_url ||
    row.storage_url ||
    row.imageUrl ||
    row.fileUrl ||
    metadata.url ||
    "";

  return parseSupabaseStorageUrl(url);
}

function parseSupabaseStorageUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!match) return null;

    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}
