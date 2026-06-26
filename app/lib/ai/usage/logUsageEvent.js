export async function logUsageEvent({
  supabase,
  userId,
  campaign,
  campaignId,
  runId,
  module,
  artifact,
  provider,
  model,
  requestType = "agent_generation",
  status,
  metadata = {},
  cost = 0,
  creditsUsed = 1,
  source = "agent_v2",
}) {
  if (!supabase || !userId) return null;

  const providerUsage = normalizeProviderUsage({
    provider,
    model,
    metadata,
  });
  const resolvedModule = clean(module) || "unknown";
  const resolvedArtifact = clean(artifact) || "generation";
  const resolvedRunId = clean(runId) || createRunId();
  const resolvedCampaignId = campaign?.id || campaignId || null;
  const resolvedStatus =
    clean(status) ||
    (metadata?.usedFallback || metadata?.lowConfidenceProvider
      ? "fallback"
      : "completed");

  const event = {
    user_id: userId,
    campaign_id: resolvedCampaignId,
    run_id: resolvedRunId,
    module: resolvedModule,
    artifact: resolvedArtifact,
    provider: providerUsage.provider,
    model: providerUsage.model,
    request_type: clean(requestType) || "agent_generation",
    status: resolvedStatus,
    input_tokens: providerUsage.inputTokens,
    output_tokens: providerUsage.outputTokens,
    total_tokens: providerUsage.totalTokens,
    tokens_used: providerUsage.totalTokens,
    cost: toNonNegativeNumber(cost),
    credits_used: toNonNegativeInt(creditsUsed),
    latency_ms: providerUsage.latencyMs,
    provider_reported_tokens: providerUsage.providerReportedTokens,
    source,
    metadata: {
      ...(metadata || {}),
      usageLoggedAt: new Date().toISOString(),
    },
    action: `${resolvedModule}:${resolvedArtifact}`,
  };

  const { data, error } = await supabase
    .from("ai_usage")
    .insert(event)
    .select()
    .single();

  if (!error) return data;

  if (isMissingColumnError(error)) {
    return writeLegacyUsageEvent({ supabase, event, error });
  }

  console.warn("Usage event write failed:", error);
  return null;
}

async function writeLegacyUsageEvent({ supabase, event, error }) {
  const legacyEvent = {
    user_id: event.user_id,
    campaign_id: event.campaign_id,
    module: event.module,
    artifact: event.artifact,
    provider: event.provider,
    model: event.model,
    status: event.status,
    input_tokens: event.input_tokens || 0,
    output_tokens: event.output_tokens || 0,
    tokens_used: event.tokens_used || 0,
    credits_used: event.credits_used || 0,
    latency_ms: event.latency_ms || 0,
    action: event.action,
    cost: event.cost || 0,
  };

  const { data, error: legacyError } = await supabase
    .from("ai_usage")
    .insert(legacyEvent)
    .select()
    .single();

  if (!legacyError) return data;

  console.warn("Usage V2 write failed:", {
    message: error.message,
    code: error.code,
  });
  console.warn("Usage legacy write failed:", legacyError);
  return null;
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

function isMissingColumnError(error) {
  return error?.code === "PGRST204" || error?.code === "42703";
}

function createRunId() {
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
