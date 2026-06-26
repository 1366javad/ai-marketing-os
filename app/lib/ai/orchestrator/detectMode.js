/**
 * detectMode.js
 *
 * Implements the deterministic mode check from orchestrator-design.md, Section 1.
 * Pure decision function — no I/O, no side effects, no DB calls. The caller
 * is responsible for actually checking campaign existence/status (this file
 * does not import a DB adapter on purpose, to keep it trivially unit-testable).
 *
 * Mode is NOT a user setting and NOT inferred from prompt phrasing. It is
 * derived solely from whether a valid, non-archived campaignId was supplied.
 */

const TOOL_MODE = "tool";
const CAMPAIGN_MODE = "campaign";

/**
 * @param {Object} request
 * @param {string} [request.campaignId]
 * @param {Object} [campaignLookup] - result of checking campaignId against storage,
 *   resolved by the caller BEFORE calling this function (e.g. via loadCampaignContext,
 *   wrapped in try/catch — this function does not perform that lookup itself).
 * @param {boolean} [campaignLookup.exists]
 * @param {"draft"|"active"|"completed"|"archived"} [campaignLookup.status]
 * @returns {{ mode: "tool" | "campaign", fallbackReason: string | null }}
 */
function detectMode(request, campaignLookup = null) {
  if (!request || !request.campaignId) {
    return { mode: TOOL_MODE, fallbackReason: null };
  }

  if (!campaignLookup || !campaignLookup.exists) {
    return {
      mode: TOOL_MODE,
      fallbackReason: `campaignId "${request.campaignId}" not found — falling back to tool mode.`,
    };
  }

  if (campaignLookup.status === "archived") {
    return {
      mode: TOOL_MODE,
      fallbackReason: `campaign "${request.campaignId}" is archived — falling back to tool mode.`,
    };
  }

  return { mode: CAMPAIGN_MODE, fallbackReason: null };
}

module.exports = { detectMode, TOOL_MODE, CAMPAIGN_MODE };
