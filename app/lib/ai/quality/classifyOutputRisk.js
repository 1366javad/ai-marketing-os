/**
 * classifyOutputRisk.js
 *
 * THE FINAL, AUTHORITATIVE risk classification — happens after the agent
 * produces real output. This is the "classifyRisk(agentOutput)" referenced
 * in orchestrator-design.md Section 3.
 *
 * resolveRiskGate.js (in Orchestrator) was a PREDICTION before generation.
 * This is the VERDICT after generation.
 *
 * Two-layer model (ADR-003):
 *   1. Agent's suggestedRiskLevel (informational, can be more cautious than floor)
 *   2. Floor from ADR-003 table (enforced here — agent cannot go below it)
 *
 * IMPORTANT: This file imports the floor table from resolveRiskGate.js
 * to ensure there is ONE source of truth. Do NOT redefine the floor table here.
 */

// Canonical event-identity floor.
// Source: adr-003-risk-classification.md Risk Floor Table.
const ARTIFACT_RISK_FLOOR = Object.freeze({
  "research+market_research": "low",
  "research+audience_analysis": "low",
  "research+competitor_analysis": "low",
  "research+trends_research": "low",
  "research+pain_points_research": "low",
  "research+opportunities_research": "low",
  "seo+keyword_research": "low",
  "seo+keyword_cluster": "low",
  "seo+topic_cluster": "medium",
  "seo+seo_strategy": "high",
  "seo+meta_description": "medium",
  "seo+faq_generation": "medium",
  "content+blog_draft": "medium",
  "content+email_draft": "medium",
  "creative+creative_concept": "medium",
  "creative+image_asset": "medium",
  "ads+ad_copy": "high",
  "analytics+campaign_learning": "low",
  "special+retroactive_attach": "medium",
  "special+context_change": "medium",
  "video+video_script": "medium",
  "video+storyboard": "medium",
});

const RISK_ORDER = Object.freeze({ low: 0, medium: 1, high: 2 });

/**
 * @param {Object} agentOutput
 * @param {string} agentOutput.eventType         - what the agent says it produced
 * @param {"low"|"medium"|"high"} [agentOutput.suggestedRiskLevel] - agent's own proposal
 * @param {Object} executionPlan
 * @param {string} executionPlan.module
 * @returns {{
 *   riskLevel: "low"|"medium"|"high",
 *   approvalRequired: boolean,
 *   floorSource: "event_type"|"module"|"agent_suggestion",
 *   note: string|null
 * }}
 * @throws {Error} if eventType has no defined floor — fail loudly (ADR-003 requirement)
 */
function classifyOutputRisk(agentOutput, executionPlan) {
  const identity = `${agentOutput?.module || ""}+${agentOutput?.artifact || ""}`;
  const suggestedRisk = agentOutput?.suggestedRiskLevel;
  const identityFloor = ARTIFACT_RISK_FLOOR[identity];

  if (!identityFloor) {
    throw new Error(
      `classifyOutputRisk: no risk floor defined for canonical identity "${identity}". ` +
        `Add it to adr-003-risk-classification.md and ARTIFACT_RISK_FLOOR before use. ` +
        `Refusing to default to "low" — that would silently under-classify output.`
    );
  }

  const floor = identityFloor;
  let floorSource = "module_artifact";

  // Agent suggestion can only raise risk, never lower it below floor
  let finalRisk = floor;
  let note = null;

  if (suggestedRisk && RISK_ORDER[suggestedRisk] > RISK_ORDER[floor]) {
    finalRisk = suggestedRisk;
    floorSource = "agent_suggestion";
    note = `agent flagged output as "${suggestedRisk}" (above floor "${floor}") — respecting agent's caution`;
  }

  const approvalRequired = RISK_ORDER[finalRisk] >= RISK_ORDER.medium;

  return { riskLevel: finalRisk, approvalRequired, floorSource, note };
}

module.exports = {
  classifyOutputRisk,
  ARTIFACT_RISK_FLOOR,
  RISK_ORDER,
};
