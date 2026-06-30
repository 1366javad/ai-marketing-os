import {
  CREDIT_LIMIT_MESSAGE,
  getModuleCreditCost,
  getPlanLimits,
} from "./usagePolicy";
import {
  getActionGate,
  getFeatureGate,
  getLimitGate,
} from "@/app/lib/plans/planPolicy";
import { resolvePlanForUser } from "@/app/lib/plans/planResolver";

const RUNNING_USAGE_ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export async function resolveUserPlan(input = {}) {
  if (typeof input === "string") {
    const plan = await resolvePlanForUser({ userId: input });
    return plan.id;
  }

  const plan = await resolvePlanForUser(input);
  return plan.id;
}

export async function getDailyUsage({ supabase, userId }) {
  if (!supabase || !userId) {
    return { creditsUsed: 0, requests: 0, events: [] };
  }

  await expireStaleRunningUsage({ supabase, userId });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const activeRunningCutoff = new Date(
    Date.now() - RUNNING_USAGE_ACTIVE_WINDOW_MS,
  ).toISOString();

  const { data, error } = await supabase
    .from("ai_usage")
    .select("id, credits_used, status, created_at")
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());

  if (error) {
    console.warn("Daily usage lookup failed:", error);
    return { creditsUsed: 0, requests: 0, events: [] };
  }

  const events = data || [];
  const billableEvents = events.filter((event) =>
    isBillableUsageEvent(event, activeRunningCutoff),
  );
  const creditsUsed = billableEvents.reduce(
    (sum, event) => sum + toNonNegativeInt(event.credits_used),
    0,
  );

  return {
    creditsUsed,
    requests: events.length,
    events,
  };
}

export function getCreditCost({ module }) {
  return getModuleCreditCost(module);
}

export async function checkCreditLimit({
  supabase,
  userId,
  module,
  artifact,
  isRegenerate = false,
}) {
  const plan = await resolveUserPlan({ supabase, userId });
  const limits = getPlanLimits(plan);
  const featureGate = getFeatureGate({ plan, module, feature: artifact });

  if (!featureGate.allowed) {
    return {
      allowed: false,
      reason: "feature_locked",
      ...featureGate,
      dailyCredits: limits.dailyCredits,
      usedCredits: 0,
      remainingCredits: limits.dailyCredits,
      requiredCredits: 0,
      billableCredits: 0,
      message: featureGate.message,
    };
  }

  if (isRegenerate) {
    const regenerateGate = getActionGate({ plan, action: "regenerate" });

    if (!regenerateGate.allowed) {
      return {
        allowed: false,
        reason: "feature_locked",
        ...regenerateGate,
        dailyCredits: limits.dailyCredits,
        usedCredits: 0,
        remainingCredits: limits.dailyCredits,
        requiredCredits: 0,
        billableCredits: 0,
        message: regenerateGate.message,
      };
    }
  }

  const requiredCredits = getCreditCost({ module, artifact });
  const usage = await getDailyUsage({ supabase, userId });
  const remainingCredits = Math.max(0, limits.dailyCredits - usage.creditsUsed);

  return {
    allowed: remainingCredits >= requiredCredits,
    internalBypass: false,
    internalBypassReason: "",
    plan,
    dailyCredits: limits.dailyCredits,
    usedCredits: usage.creditsUsed,
    remainingCredits,
    requiredCredits,
    billableCredits: requiredCredits,
    message: CREDIT_LIMIT_MESSAGE,
  };
}

export async function checkCampaignLimit({ supabase, userId }) {
  const plan = await resolveUserPlan({ supabase, userId });
  const limits = getPlanLimits(plan);
  const currentCount = await countUserCampaigns({ supabase, userId });
  const limitGate = getLimitGate({
    plan,
    limit: "campaigns",
    currentCount,
  });

  return {
    ...limitGate,
    currentCount,
    maxCampaigns: limits.maxCampaigns,
  };
}

export async function checkActionAccess({ supabase, userId, action }) {
  const plan = await resolveUserPlan({ supabase, userId });
  return getActionGate({ plan, action });
}

export async function startUsageEvent({
  supabase,
  userId,
  campaignId,
  runId,
  module,
  artifact,
  requestType = "generation",
  creditsUsed = 0,
  source = "agent_v2",
  metadata = {},
}) {
  if (!supabase || !userId) return null;

  const operationId = metadata.operationId || createOperationId();
  const existing = await findUsageByOperationId({
    supabase,
    userId,
    operationId,
  });

  if (existing) return existing;

  const event = {
    user_id: userId,
    campaign_id: campaignId || null,
    run_id: clean(runId) || operationId,
    module: clean(module) || "unknown",
    artifact: clean(artifact) || "generation",
    request_type: clean(requestType) || "generation",
    status: "running",
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    tokens_used: 0,
    cost: 0,
    credits_used: toNonNegativeInt(creditsUsed),
    latency_ms: null,
    provider_reported_tokens: false,
    source,
    action: `${clean(module) || "unknown"}:${clean(artifact) || "generation"}`,
    metadata: {
      ...metadata,
      operationId,
      usageStartedAt: new Date().toISOString(),
    },
  };

  const { data, error } = await supabase
    .from("ai_usage")
    .insert(event)
    .select()
    .single();

  if (!error) return data;

  console.warn("Usage start failed:", error);
  return null;
}

export async function completeUsageEvent({
  supabase,
  usageId,
  provider,
  model,
  status = "completed",
  metadata = {},
  cost = 0,
  creditsUsed,
}) {
  if (!supabase || !usageId) return null;

  const usageRow = await getUsageAuditFields({ supabase, usageId });
  const existingMetadata = await getExistingMetadata({ supabase, usageId });
  const providerUsage = normalizeProviderUsage({ provider, model, metadata });
  const patch = {
    provider: providerUsage.provider,
    model: providerUsage.model,
    status,
    input_tokens: providerUsage.inputTokens,
    output_tokens: providerUsage.outputTokens,
    total_tokens: providerUsage.totalTokens,
    tokens_used: providerUsage.totalTokens || 0,
    cost: toNonNegativeNumber(cost),
    latency_ms: providerUsage.latencyMs,
    provider_reported_tokens: providerUsage.providerReportedTokens,
    metadata: {
      ...existingMetadata,
      ...metadata,
      usageCompletedAt: new Date().toISOString(),
    },
  };

  if (creditsUsed !== undefined) {
    patch.credits_used = toNonNegativeInt(creditsUsed);
  }

  const { data, error } = await supabase
    .from("ai_usage")
    .update(patch)
    .eq("id", usageId)
    .select()
    .single();

  if (!error) return data;

  logUsageUpdateFailure("Usage completion failed", {
    usageId,
    usageRow,
    error,
  });
  throw error;
}

export async function failUsageEvent({
  supabase,
  usageId,
  error,
  metadata = {},
}) {
  if (!supabase || !usageId) return null;

  const usageRow = await getUsageAuditFields({ supabase, usageId });
  const existingMetadata = await getExistingMetadata({ supabase, usageId });
  const { data, error: updateError } = await supabase
    .from("ai_usage")
    .update({
      status: "failed",
      credits_used: 0,
      metadata: {
        ...existingMetadata,
        ...metadata,
        error: String(error || "Generation failed"),
        usageFailedAt: new Date().toISOString(),
      },
    })
    .eq("id", usageId)
    .select()
    .single();

  if (!updateError) return data;

  logUsageUpdateFailure("Usage failure update failed", {
    usageId,
    usageRow,
    error: updateError,
  });
  throw updateError;
}

export async function expireStaleRunningUsage({ supabase, userId } = {}) {
  if (!supabase) return [];

  const cutoff = new Date(
    Date.now() - RUNNING_USAGE_ACTIVE_WINDOW_MS,
  ).toISOString();
  let query = supabase
    .from("ai_usage")
    .select("id, run_id, user_id, campaign_id, metadata")
    .eq("status", "running")
    .lt("created_at", cutoff);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: staleRows, error: selectError } = await query;

  if (selectError) {
    console.error("Stale running usage lookup failed:", {
      userId,
      cutoff,
      error: selectError,
    });
    return [];
  }

  const rows = staleRows || [];

  for (const row of rows) {
    const metadata =
      row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const { error: updateError } = await supabase
      .from("ai_usage")
      .update({
        status: "failed",
        credits_used: 0,
        metadata: {
          ...metadata,
          error: "stale_running_expired",
          staleRunningExpiredAt: new Date().toISOString(),
        },
      })
      .eq("id", row.id);

    if (updateError) {
      logUsageUpdateFailure("Stale running usage expiration failed", {
        usageId: row.id,
        usageRow: row,
        error: updateError,
      });
    }
  }

  return rows;
}

async function getExistingMetadata({ supabase, usageId }) {
  const { data, error } = await supabase
    .from("ai_usage")
    .select("metadata")
    .eq("id", usageId)
    .maybeSingle();

  if (error) return {};
  return data?.metadata && typeof data.metadata === "object"
    ? data.metadata
    : {};
}

async function getUsageAuditFields({ supabase, usageId }) {
  const { data, error } = await supabase
    .from("ai_usage")
    .select("id, run_id, user_id, campaign_id")
    .eq("id", usageId)
    .maybeSingle();

  if (error) {
    console.error("Usage audit lookup failed:", { usageId, error });
    return null;
  }

  return data || null;
}

export function createCreditLimitResponse(creditCheck) {
  if (creditCheck?.reason === "feature_locked") {
    return createFeatureLockedResponse(creditCheck);
  }

  return Response.json(
    {
      error: "credit_limit_reached",
      message: `You need ${creditCheck.requiredCredits} credits, but you have ${creditCheck.remainingCredits} left today. Come back tomorrow or upgrade to Pro.`,
      remainingCredits: creditCheck.remainingCredits,
      requiredCredits: creditCheck.requiredCredits,
      dailyCredits: creditCheck.dailyCredits,
      usedCredits: creditCheck.usedCredits,
      plan: creditCheck.plan,
    },
    { status: 402 },
  );
}

export function createFeatureLockedResponse(gate) {
  return Response.json(
    {
      error: "feature_locked",
      message:
        gate?.message ||
        `${gate?.featureLabel || "This feature"} is available on Pro and Pro+.`,
      feature: gate?.feature || gate?.action || gate?.limit || "",
      featureLabel: gate?.featureLabel || "",
      module: gate?.module || "",
      plan: gate?.plan || "free",
      requiredPlan: gate?.requiredPlan || "Pro",
      benefit: gate?.benefit || "",
    },
    { status: 403 },
  );
}

function isBillableUsageEvent(event, activeRunningCutoff) {
  const status = String(event?.status || "").toLowerCase();

  if (status === "failed") return false;
  if (status === "completed" || status === "fallback") return true;

  if (status === "running") {
    return String(event?.created_at || "") >= activeRunningCutoff;
  }

  return false;
}

function logUsageUpdateFailure(message, { usageId, usageRow, error }) {
  console.error(message, {
    usageId,
    runId: usageRow?.run_id || null,
    userId: usageRow?.user_id || null,
    campaignId: usageRow?.campaign_id || null,
    error,
  });
}

async function findUsageByOperationId({ supabase, userId, operationId }) {
  if (!operationId) return null;

  const { data: runMatch, error: runError } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("run_id", operationId)
    .maybeSingle();

  if (!runError && runMatch) return runMatch;

  const { data, error } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("metadata->>operationId", operationId)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function countUserCampaigns({ supabase, userId }) {
  if (!supabase || !userId) return 0;

  const { count, error } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Campaign limit lookup failed:", { userId, error });
    return 0;
  }

  return Number(count || 0);
}

function normalizeProviderUsage({ provider, model, metadata = {} }) {
  if (metadata?.providerReportedTokens === false) {
    return {
      provider: clean(provider) || clean(metadata.provider) || "unknown",
      model: clean(model) || clean(metadata.model) || "unknown",
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      latencyMs: toNullableNonNegativeInt(metadata.latencyMs),
      providerReportedTokens: false,
    };
  }

  const usage = metadata?.usage || {};
  const inputTokens = toNullableNonNegativeInt(
    usage.inputTokens ??
      usage.promptTokens ??
      usage.prompt_tokens ??
      metadata.inputTokens ??
      metadata.promptTokens,
  );
  const outputTokens = toNullableNonNegativeInt(
    usage.outputTokens ??
      usage.completionTokens ??
      usage.completion_tokens ??
      metadata.outputTokens ??
      metadata.completionTokens,
  );
  const explicitTotalTokens = toNullableNonNegativeInt(
    usage.totalTokens ?? usage.total_tokens ?? metadata.totalTokens,
  );
  const computedTotalTokens =
    inputTokens !== null || outputTokens !== null
      ? Number(inputTokens || 0) + Number(outputTokens || 0)
      : null;
  const totalTokens = explicitTotalTokens ?? computedTotalTokens;
  const hasPositiveTokenUsage =
    Number(inputTokens || 0) > 0 ||
    Number(outputTokens || 0) > 0 ||
    Number(totalTokens || 0) > 0;

  return {
    provider: clean(provider) || clean(metadata.provider) || "unknown",
    model: clean(model) || clean(metadata.model) || "unknown",
    inputTokens: hasPositiveTokenUsage ? inputTokens : null,
    outputTokens: hasPositiveTokenUsage ? outputTokens : null,
    totalTokens: hasPositiveTokenUsage ? totalTokens : null,
    latencyMs: toNullableNonNegativeInt(metadata.latencyMs),
    providerReportedTokens: hasPositiveTokenUsage,
  };
}

function createOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clean(value) {
  return String(value || "").trim();
}

function toNullableNonNegativeInt(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function toNonNegativeInt(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
