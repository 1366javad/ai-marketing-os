/**
 * resolveValidationResult.js
 *
 * Composes the results of detectGibberish, detectSpam, and detectMarketingRelevance
 * into the final { status, reason } pair. This is also the ONE place Rule 5
 * (campaign-mode leniency) is applied — deliberately centralized here rather
 * than threaded through every individual check, so there's a single, auditable
 * spot where "campaign mode makes the Guard softer" actually happens.
 *
 * Status precedence (checked in this fixed order — first match wins):
 *   1. invalid    — empty or gibberish (Rule 1, Rule 2)
 *   2. blocked     — generic off-topic (Rule 4)
 *   3. needs_clarification — too short / ambiguous for this task (Rule 3)
 *   4. valid        — everything else
 *
 * Spam detection does not get its own status — per the original v1.0 spec,
 * spam-like input is folded into "invalid" (same bucket as gibberish), since
 * from the user's perspective both produce the same "please rephrase" outcome.
 */

const STATUS = Object.freeze({
  VALID: "valid",
  NEEDS_CLARIFICATION: "needs_clarification",
  INVALID: "invalid",
  BLOCKED: "blocked",
});

/**
 * @param {Object} params
 * @param {string} params.trimmedText
 * @param {boolean} params.isEmpty
 * @param {boolean} params.isGibberish
 * @param {boolean} params.isSpam
 * @param {{ passed: boolean, status: string|null, reason: string }} params.semanticQuality
 * @param {{ relevant: boolean, needsClarification: boolean, blocked: boolean }} params.relevance
 * @param {"tool"|"campaign"|null} [params.mode]
 * @returns {{ status: string, reason: string }}
 */
function resolveValidationResult({
  trimmedText,
  isEmpty,
  isGibberish,
  isSpam,
  semanticQuality,
  relevance,
  mode = null,
}) {
  if (isEmpty) {
    return { status: STATUS.INVALID, reason: "empty_input" };
  }

  if (isGibberish || isSpam) {
    return { status: STATUS.INVALID, reason: isGibberish ? "gibberish" : "spam_pattern" };
  }

  if (semanticQuality && !semanticQuality.passed) {
    return {
      status: semanticQuality.status || STATUS.NEEDS_CLARIFICATION,
      reason: semanticQuality.reason || "missing_marketing_subject",
    };
  }

  if (relevance.blocked) {
    return { status: STATUS.BLOCKED, reason: "off_topic" };
  }

  if (relevance.needsClarification) {
    // Rule 5: campaign mode softens this. A short input like "QuestApply" is
    // much more likely to be a deliberate, complete answer (e.g. a campaign
    // or brand name) when the user is already inside a campaign context, vs.
    // a cold start in tool mode where the same input is genuinely ambiguous.
    //
    // This does NOT mean campaign mode skips validation — it means the
    // length/ambiguity heuristic alone is not sufficient grounds for
    // needs_clarification when the user has already established intent by
    // being in campaign mode for a specific module/task. Generic off-topic
    // and gibberish/spam checks above are NOT softened by mode — those are
    // structural problems with the input itself, not ambiguity about intent.
    if (mode === "campaign") {
      return { status: STATUS.VALID, reason: "short_input_accepted_in_campaign_mode" };
    }
    return { status: STATUS.NEEDS_CLARIFICATION, reason: "ambiguous_or_too_short" };
  }

  return { status: STATUS.VALID, reason: "" };
}

module.exports = { resolveValidationResult, STATUS };
