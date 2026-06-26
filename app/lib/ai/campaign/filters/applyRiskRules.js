/**
 * applyRiskRules.js
 *
 * This is a DEFENSIVE check, not the primary enforcement point for risk.
 * Risk classification itself happens at WRITE time, in the Orchestrator's
 * classifyRisk() (orchestrator-design.md, Section 3 + adr-003-risk-classification.md).
 * By the time an event reaches getCampaignContextSlice(), it should already
 * carry a correct riskLevel.
 *
 * What this filter actually does: supports an optional `maxRiskLevel` read-time
 * constraint, for callers that want to exclude high-risk pending/unverified
 * context even if it slipped past approval filtering somehow (defense in depth).
 * In the common case (no maxRiskLevel passed), this is a no-op pass-through.
 *
 * This is intentionally a separate file from applyApprovalRules — approval
 * status and risk level are different axes (Rule 3/4 vs ADR-003) and mixing
 * their logic into one function is exactly the kind of God Function this
 * module split is meant to avoid.
 */

const RISK_ORDER = Object.freeze({ low: 0, medium: 1, high: 2 });

/**
 * @param {import("../events/loadCampaignEvents").CampaignMemoryEvent[]} events
 * @param {Object} [options]
 * @param {"low"|"medium"|"high"|null} [options.maxRiskLevel=null] - if set, excludes
 *   events with riskLevel above this threshold. null = no risk-based exclusion
 *   (the default — risk gating already happened at write time).
 * @returns {import("../events/loadCampaignEvents").CampaignMemoryEvent[]}
 */
function applyRiskRules(events, options = {}) {
  const { maxRiskLevel = null } = options;

  if (!maxRiskLevel) {
    return events;
  }

  if (!(maxRiskLevel in RISK_ORDER)) {
    throw new Error(
      `applyRiskRules: invalid maxRiskLevel "${maxRiskLevel}". Must be one of: ${Object.keys(
        RISK_ORDER
      ).join(", ")}.`
    );
  }

  const ceiling = RISK_ORDER[maxRiskLevel];
  return events.filter((e) => RISK_ORDER[e.riskLevel] <= ceiling);
}

module.exports = { applyRiskRules };
