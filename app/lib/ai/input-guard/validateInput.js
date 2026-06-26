/**
 * validateInput.js
 *
 * Composes the individual rule checks (detectGibberish, detectSpam,
 * detectMarketingRelevance) via resolveValidationResult into the final
 * output shape documented in marketing-input-guard.md:
 *
 *   { status, reason, userMessage, normalizedPrompt }
 *
 * Zero LLM calls. Zero DB calls. Zero I/O. Pure function of (text, executionPlan).
 */

const { detectGibberish } = require("./detectGibberish");
const { detectSpam } = require("./detectSpam");
const { detectMarketingRelevance } = require("./detectMarketingRelevance");
const { detectSemanticQuality } = require("./detectSemanticQuality");
const { resolveValidationResult, STATUS } = require("./resolveValidationResult");

const USER_MESSAGES = Object.freeze({
  [STATUS.INVALID]: "This doesn't look like usable input. Could you rephrase it?",
  [STATUS.BLOCKED]: "This looks unrelated to marketing. Try asking something campaign- or content-related.",
  [STATUS.NEEDS_CLARIFICATION]:
    "Could you say a bit more about what you'd like to create? (e.g. Blog Post, Ad, Carousel, Reel, Image)",
  [STATUS.VALID]: "",
});

/**
 * @param {string} rawText
 * @param {Object} [executionPlan] - output of runOrchestrator (step 6). Optional;
 *   see detectMarketingRelevance.js for fallback behavior when absent.
 * @returns {{ status: string, reason: string, userMessage: string, normalizedPrompt: string }}
 */
function validateInput(rawText, executionPlan = null) {
  const trimmedText = typeof rawText === "string" ? rawText.trim() : "";
  const isEmpty = trimmedText.length === 0;
  const isGibberish = !isEmpty && detectGibberish(trimmedText);
  const isSpam = !isEmpty && !isGibberish && detectSpam(trimmedText);
  const semanticQuality = isEmpty || isGibberish || isSpam
    ? { passed: false, status: null, reason: "" }
    : detectSemanticQuality(trimmedText);

  const relevance = isEmpty || isGibberish || isSpam || !semanticQuality.passed
    ? { relevant: false, needsClarification: false, blocked: false } // not evaluated — invalid already
    : detectMarketingRelevance(trimmedText, executionPlan);

  const { status, reason } = resolveValidationResult({
    trimmedText,
    isEmpty,
    isGibberish,
    isSpam,
    semanticQuality,
    relevance,
    mode: executionPlan ? executionPlan.mode : null,
  });

  return {
    status,
    reason,
    userMessage: USER_MESSAGES[status],
    normalizedPrompt: status === STATUS.VALID ? normalizeWhitespace(trimmedText) : "",
  };
}

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

module.exports = { validateInput };
