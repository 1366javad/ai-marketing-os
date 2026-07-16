/**
 * buildExecutionPlan.js
 *
 * Pure composition. Takes the outputs of detectMode, resolveModule, resolveTask,
 * and resolveRiskGate and assembles the single ExecutionPlan object that gets
 * handed to executeCanonicalPipeline(), which is then responsible for:
 *   - calling getCampaignContextSlice() if needsContext is true
 *   - invoking the right agent
 *   - running Quality Layer
 *   - writing memory
 *
 * This function does none of those things itself. It has no I/O.
 */

const AGENT_NAME_BY_MODULE = Object.freeze({
  research: "researchAgent",
  seo: "seoAgent",
  content: "contentAgent",
  creative: "creativeAgent",
  ads: "adsAgent",
  video: "videoPlanning",
  analytics: "analyticsAgent",
});

/**
 * @param {Object} params
 * @param {"tool"|"campaign"} params.mode
 * @param {string} params.module
 * @param {string} params.task
 * @param {"low"|"medium"|"high"} params.riskLevel
 * @param {boolean} params.needsApproval
 * @param {string} [params.campaignId] - present only in campaign mode
 *
 * @returns {{
 *   mode: "tool" | "campaign",
 *   module: string,
 *   task: string,
 *   campaignId: string | null,
 *   riskLevel: "low" | "medium" | "high",
 *   needsContext: boolean,
 *   needsApproval: boolean,
 *   agent: string
 * }}
 */
function buildExecutionPlan({ mode, module, task, riskLevel, needsApproval, campaignId = null }) {
  const agent = AGENT_NAME_BY_MODULE[module];

  if (!agent) {
    throw new Error(`buildExecutionPlan: no agent mapped for module "${module}".`);
  }

  return {
    mode,
    module,
    task,
    campaignId: mode === "campaign" ? campaignId : null,
    riskLevel,
    // needsContext mirrors mode: campaign mode always injects a context slice
    // (orchestrator-design.md, Section 4); tool mode never does.
    needsContext: mode === "campaign",
    needsApproval,
    agent,
  };
}

module.exports = { buildExecutionPlan, AGENT_NAME_BY_MODULE };
