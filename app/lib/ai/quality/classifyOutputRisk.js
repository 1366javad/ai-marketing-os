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

const { MODULE_PRIMARY_RISK_FLOOR } = require("../orchestrator/resolveRiskGate");

// Event-type-level floor (more granular than module-level floor).
// Source: adr-003-risk-classification.md Risk Floor Table.
const EVENT_TYPE_RISK_FLOOR = Object.freeze({
  research_insight:   "low",
  keyword_idea:       "low",
  blog_draft:         "medium",
  email_draft:        "medium",
  creative_concept:   "medium",
  image_asset:        "medium",
  ad_copy:            "high",
  video_script:       "medium",
  storyboard:         "medium",
  campaign_learning:  "low",
  retroactive_attach: "medium",
  context_change:     "medium",
});

const ARTIFACT_RISK_FLOOR = Object.freeze({
  market_research: "low",
  audience_analysis: "low",
  competitor_analysis: "low",
  trends_research: "low",
  pain_points_research: "low",
  opportunities_research: "low",
  keyword_research: "low",
  keyword_cluster: "low",
  topic_cluster: "medium",
  seo_strategy: "high",
  meta_description: "medium",
  faq_generation: "medium",
  blog_draft: "medium",
  email_draft: "medium",
  blog_post: "medium",
  email: "medium",
  newsletter: "medium",
  landing_page: "medium",
  case_study: "medium",
  linkedin_post: "medium",
  instagram_caption: "medium",
  creative_concept: "medium",
  image_asset: "medium",
  ad_copy: "high",
  campaign_learning: "low",
  retroactive_attach: "medium",
  context_change: "medium",
  video_script: "medium",
  storyboard: "medium",
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
  const eventType = agentOutput?.eventType;
  const artifact = agentOutput?.artifact;
  const suggestedRisk = agentOutput?.suggestedRiskLevel;
  const requestedModule = executionPlan?.module;

  const eventTypeFloor =
    ARTIFACT_RISK_FLOOR[artifact] || EVENT_TYPE_RISK_FLOOR[eventType];

  if (!eventTypeFloor) {
    throw new Error(
      `classifyOutputRisk: no risk floor defined for artifact "${artifact}" / event type "${eventType}". ` +
        `Add it to adr-003-risk-classification.md and ARTIFACT_RISK_FLOOR before use. ` +
        `Refusing to default to "low" — that would silently under-classify output.`
    );
  }

  // Module-level floor as a secondary check (catches mismatch between
  // what module we routed to and what event type the agent claims to produce)
  const moduleFloor = requestedModule
    ? MODULE_PRIMARY_RISK_FLOOR[requestedModule]
    : null;

  // Final floor = max(eventTypeFloor, moduleFloor)
  let floor = eventTypeFloor;
  let floorSource = "event_type";

  if (moduleFloor && RISK_ORDER[moduleFloor] > RISK_ORDER[floor]) {
    floor = moduleFloor;
    floorSource = "module";
  }

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
  EVENT_TYPE_RISK_FLOOR,
  RISK_ORDER,
};
