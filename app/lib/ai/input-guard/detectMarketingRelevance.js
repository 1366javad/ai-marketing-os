/**
 * detectMarketingRelevance.js
 *
 * THE TASK-AWARE UPGRADE.
 *
 * Important distinction (do not blur this):
 *   - This function reads the ExecutionPlan (mode, module, task) — the
 *     output of the Orchestrator (step 6). That's a routing decision,
 *     already computed, already in memory. No DB call.
 *   - This function does NOT read the CampaignContextObject (audience,
 *     tone, positioning, etc.) — that boundary from marketing-input-guard.md
 *     v1.1 ("Input Guard is context-independent... does not read Campaign
 *     Context Object") still holds. This is a NEW, separate decision:
 *     Input Guard becomes plan-aware, not campaign-content-aware. It still
 *     performs zero I/O and stays fast/cheap/predictable.
 *
 * Old behavior (v1.1, generic): "Is this marketing-related at all?"
 * New behavior (v2.0, task-aware): "Is this a usable answer for what THIS
 * task needs?" The same raw input can be valid for one task and ambiguous
 * for another — see the worked example below.
 *
 * Example (from the spec discussion):
 *   input: "QuestApply"
 *   plan.module === "content" && plan.task implies "blog_post"
 *     → needs_clarification (too vague to write a blog post about)
 *   plan.task implies "campaign_name" / mode is campaign creation
 *     → valid (a name is exactly what's being asked for)
 */

// Generic non-marketing questions — Rule 4. Stays mode/task-independent:
// "what's the capital of France" is never going to become marketing-relevant
// regardless of which module/task the user is in.
const GENERIC_OFF_TOPIC_PATTERNS = [
  /capital of \w+/i,
  /^what(?:'s| is) \d+\s*[\+\-\*\/]\s*\d+/i, // arithmetic
  /weather (?:in|today|tomorrow)/i,
  /tell me a joke/i,
  /who (?:is|was) the (?:president|king|queen) of/i,
];

const MIN_LENGTH_FOR_AUTO_VALID = 12; // chars — below this, lean toward needs_clarification unless task says otherwise

/**
 * Tasks where a short, bare input (like a single name) is plausibly complete
 * on its own — no clarification needed even though it's short.
 * This list should grow as Brief Builder (step 8) defines more task types;
 * keep it explicit rather than guessing from string length alone.
 */
const SHORT_INPUT_OK_TASKS = new Set([
  "campaign_name",
  "brand_name",
  "competitor_name",
  "keyword_seed",
]);

/**
 * @param {string} text - normalized input (already passed gibberish/spam checks)
 * @param {Object} [executionPlan] - output of runOrchestrator (step 6). Optional —
 *   if absent, this function falls back to v1.1 generic behavior (mode-blind).
 * @param {"tool"|"campaign"} [executionPlan.mode]
 * @param {string} [executionPlan.module]
 * @param {string} [executionPlan.task]
 * @returns {{ relevant: boolean, needsClarification: boolean, blocked: boolean }}
 */
function detectMarketingRelevance(text, executionPlan = null) {
  const trimmed = (text || "").trim();

  // Rule 4 first — generic off-topic questions are blocked regardless of plan.
  // No execution plan can make "what is the capital of France" marketing-relevant.
  const isGenericOffTopic = GENERIC_OFF_TOPIC_PATTERNS.some((p) => p.test(trimmed));
  if (isGenericOffTopic) {
    return { relevant: false, needsClarification: false, blocked: true };
  }

  // No execution plan available (e.g. Guard running before Orchestrator in
  // some future flow) — fall back to v1.1 generic length-based heuristic.
  if (!executionPlan) {
    const relevant = trimmed.length >= MIN_LENGTH_FOR_AUTO_VALID;
    return { relevant, needsClarification: !relevant, blocked: false };
  }

  // Task-aware path.
  const taskAllowsShortInput = SHORT_INPUT_OK_TASKS.has(executionPlan.task);

  if (trimmed.length < MIN_LENGTH_FOR_AUTO_VALID && !taskAllowsShortInput) {
    // Campaign mode softens this slightly per Rule 5 — see resolveValidationResult.js,
    // which applies the campaign-mode leniency AFTER this function returns, rather
    // than duplicating mode logic inside every individual rule check.
    return { relevant: true, needsClarification: true, blocked: false };
  }

  return { relevant: true, needsClarification: false, blocked: false };
}

module.exports = {
  detectMarketingRelevance,
  GENERIC_OFF_TOPIC_PATTERNS,
  SHORT_INPUT_OK_TASKS,
  MIN_LENGTH_FOR_AUTO_VALID,
};
