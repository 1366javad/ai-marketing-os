/**
 * buildBrief.js
 *
 * The public function of Brief Builder. Composes Phase A (extractSignals)
 * and Phase B (enrichBrief) into a single call.
 *
 * No LLM. No DB. No I/O. Pure function of its three inputs.
 *
 * @param {string} normalizedPrompt       - from validateInput().normalizedPrompt
 * @param {Object} executionPlan          - from runOrchestrator()
 * @param {Object|null} contextSlice      - from getCampaignContextSlice(), null in Tool Mode
 * @returns {MarketingBrief}
 */

const { extractSignals } = require("./extractSignals");
const { enrichBrief } = require("./enrichBrief");

function buildBrief(normalizedPrompt, executionPlan, contextSlice = null) {
  if (!normalizedPrompt || typeof normalizedPrompt !== "string") {
    throw new Error(
      "buildBrief: normalizedPrompt is required. " +
      "This should be validateInput().normalizedPrompt — never raw user text."
    );
  }
  if (!executionPlan) {
    throw new Error("buildBrief: executionPlan is required.");
  }

  const extractedSignals = extractSignals(normalizedPrompt);
  return enrichBrief({ extractedSignals, executionPlan, contextSlice });
}

module.exports = { buildBrief };
