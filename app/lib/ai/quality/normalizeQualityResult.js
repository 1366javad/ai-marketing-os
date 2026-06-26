/**
 * normalizeQualityResult.js
 *
 * Assembles the final QualityResult from all individual check outputs.
 * Computes the overall `passed` flag, `score`, and merges issues/warnings.
 *
 * Score is a heuristic (0.0–1.0):
 *   - Starts at 1.0
 *   - Each hard issue (passed: false on a required check) deducts 0.25
 *   - Each warning deducts 0.05
 *   - Floored at 0.0
 *
 * `passed` is false if ANY required check failed (not score-based) —
 * score is for human readability, passed/failed is for pipeline gating.
 */

/**
 * @param {Object} params
 * @param {{ passed: boolean, missing: string[] }} params.requiredFields
 * @param {{ passed: boolean, warnings: string[] }} params.genericOutput
 * @param {{ passed: boolean, warnings: string[] }} params.platformFit
 * @param {{ passed: boolean, hasCtaSignal: boolean, issues: string[], warnings: string[] }} params.cta
 * @param {{ riskLevel: string, approvalRequired: boolean, floorSource: string, note: string|null }} params.riskResult
 * @returns {QualityResult}
 */
function normalizeQualityResult({ requiredFields, genericOutput, platformFit, cta, riskResult }) {
  const hardIssues = [
    ...requiredFields.missing.map((f) => `missing required field: ${f}`),
    ...(genericOutput.passed ? [] : genericOutput.warnings),
    ...cta.issues,
  ];

  const warnings = [
    ...(genericOutput.passed ? genericOutput.warnings : []),
    ...platformFit.warnings,
    ...cta.warnings,
    ...(riskResult.note ? [riskResult.note] : []),
  ];

  const passed =
    requiredFields.passed &&
    platformFit.passed &&
    cta.passed;

  // Score: start at 1.0, deduct per problem
  let score = 1.0;
  score -= hardIssues.length * 0.25;
  score -= warnings.length * 0.05;
  score = Math.max(0, parseFloat(score.toFixed(2)));

  return {
    passed,
    score,
    issues: hardIssues,
    warnings,
    recommendations: buildRecommendations(requiredFields, genericOutput, cta),
    riskLevel: riskResult.riskLevel,
    approvalRequired: riskResult.approvalRequired,
  };
}

function buildRecommendations(requiredFields, genericOutput, cta) {
  const recs = [];
  if (!requiredFields.passed) {
    recs.push(`Add the missing fields before publishing: ${requiredFields.missing.join(", ")}`);
  }
  if (!genericOutput.passed) {
    recs.push("Review output for placeholder text or insufficient content length.");
  }
  if (!cta.passed) {
    recs.push("Add a clear Call to Action (e.g. 'Sign up', 'Learn more', 'Get started').");
  }
  return recs;
}

module.exports = { normalizeQualityResult };
