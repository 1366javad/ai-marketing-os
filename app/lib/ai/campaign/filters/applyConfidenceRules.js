/**
 * applyConfidenceRules.js
 *
 * Enforces the `minConfidence` option from the function contract defined
 * in campaign-memory-v1.md, Section 3:
 *
 *   options.minConfidence  // default: 0.0
 *
 * Simple numeric threshold filter. Kept as its own file (rather than folded
 * into applyRiskRules) because confidence and risk are conceptually distinct:
 * riskLevel is about consequence-if-wrong (set at write time per ADR-003),
 * confidence is about how sure the *producing agent* was about the content
 * itself. A low-risk event can still have low confidence, and vice versa.
 */

/**
 * @param {import("../events/loadCampaignEvents").CampaignMemoryEvent[]} events
 * @param {Object} [options]
 * @param {number} [options.minConfidence=0.0]
 * @returns {import("../events/loadCampaignEvents").CampaignMemoryEvent[]}
 */
function applyConfidenceRules(events, options = {}) {
  const { minConfidence = 0.0 } = options;

  if (typeof minConfidence !== "number" || minConfidence < 0 || minConfidence > 1) {
    throw new Error(
      `applyConfidenceRules: minConfidence must be a number between 0 and 1, got "${minConfidence}".`
    );
  }

  if (minConfidence === 0.0) {
    return events; // no-op fast path
  }

  return events.filter((e) => (e.confidence ?? 0) >= minConfidence);
}

module.exports = { applyConfidenceRules };
