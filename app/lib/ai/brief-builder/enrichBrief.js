/**
 * enrichBrief.js
 *
 * Phase B of Brief Builder. Takes:
 *   - extractedSignals (from Phase A — what we could read from the raw prompt)
 *   - executionPlan (from Orchestrator — mode, module, task, riskLevel, ...)
 *   - contextSlice (from getCampaignContextSlice — already Matrix-filtered,
 *     so only the fields this module is ALLOWED to see are present)
 *
 * And produces a complete MarketingBrief where:
 *   - contextSlice fields WIN over signal-extracted fields (trusted, approved data > inferred data)
 *   - signal-extracted fields fill in what context doesn't have
 *   - null is a legitimate value (e.g. SEO module never gets tone from context,
 *     and the prompt "generate keywords" has no tone signal either → tone: null is correct)
 *
 * This function never reads Campaign Context Object or Campaign Memory directly.
 * Everything it needs has already been filtered and passed in by the caller.
 *
 * Precedence (per field, highest wins):
 *   1. contextSlice.context field (approved campaign truth)
 *   2. extractedSignals field (from raw prompt)
 *   3. null
 */

/**
 * @param {Object} params
 * @param {Object} params.extractedSignals   - output of extractSignals()
 * @param {Object} params.executionPlan      - output of runOrchestrator()
 * @param {Object|null} params.contextSlice  - output of getCampaignContextSlice(), or null in Tool Mode
 * @returns {MarketingBrief}
 */
function enrichBrief({
  extractedSignals,
  executionPlan,
  contextSlice,
  knowledgeSlice,
  knowledgeDiagnostics,
}) {
  const ctx = contextSlice ? contextSlice.context : {};
  const sig = extractedSignals || {};
  const plan = executionPlan || {};

  // Helper: context first, signal fallback, then null.
  const prefer = (ctxKey, sigKey) => ctx[ctxKey] ?? sig[sigKey] ?? null;

  // platform: merge context platforms with signal-detected platforms.
  // Context platforms is the canonical list; signals can ONLY add to it,
  // not replace it (user might say "Instagram" in prompt even in campaign mode
  // — that's useful, not contradictory, so union them).
  const contextPlatforms = Array.isArray(ctx.platforms) && ctx.platforms.length > 0 ? ctx.platforms : null;
  const signalPlatforms = Array.isArray(sig.platforms) && sig.platforms.length > 0 ? sig.platforms : null;
  const platforms = contextPlatforms
    ? signalPlatforms
      ? [...new Set([...contextPlatforms, ...signalPlatforms])]
      : contextPlatforms
    : signalPlatforms;

  /** @type {MarketingBrief} */
  const brief = {
    // From ExecutionPlan (always present — no fallback needed)
    campaignId: plan.campaignId ?? null,
    mode: plan.mode ?? "tool",
    module: plan.module ?? null,
    task: plan.task ?? null,

    // From Context > Signal > null
    industry: prefer("industry", null),     // industry has no signal extractor in v1
    offer: prefer("offer", null),           // offer has no signal extractor in v1
    goal: prefer("goal", "goal"),
    audience: prefer("audience", null),     // audience has no signal extractor in v1
    platforms,
    tone: prefer("tone", "tone"),
    positioning: prefer("positioning", null),
    valueProposition: prefer("valueProposition", null),
    competitors: Array.isArray(ctx.competitors) && ctx.competitors.length > 0 ? ctx.competitors : null,

    // Signal-only fields (not in Campaign Context Object schema)
    campaignType: sig.campaignType ?? null,
    cta: prefer("cta", "cta"),

    // Confidence: how complete is this brief?
    // Base = signal confidence. Boost if context enriched key fields.
    confidence: computeConfidence(ctx, sig),

    // Durable Business Knowledge and Campaign Memory remain separate inputs.
    knowledgeEnabled: knowledgeDiagnostics?.enabled === true,
    knowledgeItems: knowledgeSlice?.items || [],
    knowledgeContext: formatKnowledgeContext(knowledgeSlice?.items || []),
    knowledgeDiagnostics: knowledgeDiagnostics || {
      enabled: false,
      status: "disabled",
      reduced: false,
      reason: "rollout_disabled",
    },
    campaignProvenance: {
      contextVersion: contextSlice?.contextVersion ?? null,
      sourceEventIds: (contextSlice?.relevantEvents || [])
        .map((event) => event.id)
        .filter(Boolean),
    },
    knowledgeProvenance: {
      generatedAt: knowledgeSlice?.generatedAt || null,
      knowledgeIds: (knowledgeSlice?.items || []).map((item) => item.knowledgeId),
      sourceIds: [...new Set((knowledgeSlice?.items || [])
        .flatMap((item) => item.sourceIds || []))],
    },
  };

  return brief;
}

function formatKnowledgeContext(items) {
  if (!items.length) return "No approved business knowledge is available for this request.";
  return items.map((item) => [
    `- [${item.domain}] ${formatKnowledgeValue(item.value)}`,
    `(knowledgeId=${item.knowledgeId}; version=${item.version}; sources=${item.sourceIds.join(",") || "none"})`,
  ].join(" ")).join("\n");
}

function formatKnowledgeValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Heuristic confidence score — not scientifically precise, but useful for
 * downstream consumers (e.g. Quality Layer) to know how much context the
 * agent is working with. 0.0 = almost no info; 1.0 = rich, fully populated brief.
 *
 * @param {Object} ctx - contextSlice.context (may be empty object in Tool Mode)
 * @param {Object} sig - extractedSignals
 * @returns {number} 0.0 – 1.0
 */
function computeConfidence(ctx, sig) {
  // Key fields that matter most for agent quality
  const KEY_FIELDS = ["industry", "offer", "goal", "audience", "tone", "platforms"];
  let filled = 0;
  for (const field of KEY_FIELDS) {
    const val = ctx[field] ?? sig[field] ?? null;
    if (val !== null && val !== undefined && (Array.isArray(val) ? val.length > 0 : true)) {
      filled++;
    }
  }
  return parseFloat((filled / KEY_FIELDS.length).toFixed(2));
}

module.exports = { enrichBrief };
