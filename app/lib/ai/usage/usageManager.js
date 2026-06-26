import {
  CREDIT_LIMIT_MESSAGE,
  getModuleCreditCost,
  getPlanLimits,
} from "./usagePolicy";

export async function resolveUserPlan() {
  return "free";
}

export async function getDailyUsage({ supabase, userId }) {
  if (!supabase || !userId) {
    return { creditsUsed: 0, requests: 0, events: [] };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

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
  const creditsUsed = events.reduce(
    (sum, event) =>
      event.status === "failed" ? sum : sum + toNonNegativeInt(event.credits_used),
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

export async function checkCreditLimit({ supabase, userId, module, artifact }) {
  const plan = await resolveUserPlan(userId);
  const limits = getPlanLimits(plan);
  const requiredCredits = getCreditCost({ module, artifact });
  const usage = await getDailyUsage({ supabase, userId });
  const remainingCredits = Math.max(0, limits.dailyCredits - usage.creditsUsed);

  return {
    allowed: remainingCredits >= requiredCredits,
    plan,
    dailyCredits: limits.dailyCredits,
    usedCredits: usage.creditsUsed,
    remainingCredits,
    requiredCredits,
    message: CREDIT_LIMIT_MESSAGE,
  };
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

  console.warn("Usage completion failed:", error);
  return null;
}

export async function failUsageEvent({ supabase, usageId, error, metadata = {} }) {
  if (!supabase || !usageId) return null;

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

  console.warn("Usage failure update failed:", updateError);
  return null;
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

export function createCreditLimitResponse(creditCheck) {
  return Response.json(
    {
      error: "credit_limit_reached",
      message: CREDIT_LIMIT_MESSAGE,
      remainingCredits: creditCheck.remainingCredits,
      requiredCredits: creditCheck.requiredCredits,
      dailyCredits: creditCheck.dailyCredits,
      usedCredits: creditCheck.usedCredits,
      plan: creditCheck.plan,
    },
    { status: 402 },
  );
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
