/**
 * resolveRiskGate.js
 *
 * IMPORTANT — what this file is NOT:
 * This is NOT classifyRisk() from orchestrator-design.md Section 3. Final risk
 * classification can only happen AFTER an agent produces actual output (it
 * depends on the agent's own suggestedRiskLevel plus the ADR-003 floor for
 * that output's event type). That final classification + the actual Risk Gate
 * enforcement (blocking high-risk output, writing pending vs auto_saved events)
 * happens later in the pipeline — in Quality Layer / Memory Write (steps 9, and
 * the write-path this orchestrator hands off to), NOT here.
 *
 * What this file IS: a PREDICTION, used only to populate the ExecutionPlan's
 * `riskLevel` / `needsApproval` fields so the caller (UI, queueing system, etc.)
 * can set expectations before the agent even runs — e.g. show the user
 * "this will need your approval" before generation starts, not as a surprise
 * after. It is read-only lookup against the ADR-003 floor table, keyed by
 * the EXPECTED primary output type for a given module (per Context Slicing
 * Matrix's "Writes" column). If an agent ends up producing a different/higher
 * risk type than expected, the real enforcement step downstream is the
 * authority, not this prediction.
 *
 * Source of truth: adr-003-risk-classification.md
 */

// Module -> its primary write type, per context-slicing-matrix.md "Writes" sections.
// Modules with multiple write types (e.g. Content: blog_draft + email_draft) use
// the HIGHER of the two floors as the prediction, to avoid under-promising approval needs.
const MODULE_PRIMARY_RISK_FLOOR = Object.freeze({
  research: "low", // canonical Research artifacts
  seo: "low", // canonical SEO task artifact; final floor is artifact-specific
  content: "medium", // blog_draft / email_draft (both medium — no conflict)
  creative: "medium", // creative_concept / image_asset (both medium)
  ads: "high", // ad_copy
  video: "medium", // video_script / storyboard
  analytics: "low", // campaign_learning
});

const RISK_ORDER = Object.freeze({ low: 0, medium: 1, high: 2 });

/**
 * @param {string} module - one of the 6 valid modules (already validated by resolveModule)
 * @returns {{ riskLevel: "low"|"medium"|"high", needsApproval: boolean }}
 * @throws {Error} if module has no known floor — fail loudly rather than defaulting to "low"
 */
function resolveRiskGate(module) {
  const riskLevel = MODULE_PRIMARY_RISK_FLOOR[module];

  if (!riskLevel) {
    throw new Error(
      `resolveRiskGate: no risk floor defined for module "${module}". ` +
        `Add it to adr-003-risk-classification.md and MODULE_PRIMARY_RISK_FLOOR before use. ` +
        `Refusing to default to "low" — that would silently under-classify a new module.`
    );
  }

  // medium and high both require approval before the output is usable by other
  // modules (Rule 3/4, campaign-memory-v1.md); only low is auto-saved.
  const needsApproval = RISK_ORDER[riskLevel] >= RISK_ORDER.medium;

  return { riskLevel, needsApproval };
}

module.exports = { resolveRiskGate, MODULE_PRIMARY_RISK_FLOOR };
