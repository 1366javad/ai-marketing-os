/**
 * index.js — Orchestrator entry point
 *
 * THIS FILE IS A COORDINATOR, NOT AN AGENT. Per the locked decision for this
 * sprint: the orchestrator's only job is to produce an ExecutionPlan. It does
 * NOT:
 *   ❌ build prompts
 *   ❌ call providers
 *   ❌ run quality checks
 *   ❌ filter memory (that's getCampaignContextSlice's job, called by the
 *      CALLER of this orchestrator, not from inside it)
 *   ❌ do final risk calculation (that happens after the agent produces
 *      output — see resolveRiskGate.js header comment)
 *
 * Pipeline this file implements (orchestrator-design.md, Section 2, the
 * "decision" portion only — Input Guard and Brief Builder run BEFORE this
 * is called, by the caller, not by this file):
 *
 *   brief (already validated + normalized by Input Guard + Brief Builder)
 *     ↓
 *   detectMode()        → tool | campaign
 *     ↓
 *   resolveModule()      → which of the 6 modules
 *     ↓
 *   resolveTask()         → validated task string
 *     ↓
 *   resolveRiskGate()      → predicted riskLevel + needsApproval
 *     ↓
 *   buildExecutionPlan()    → the single output object
 *
 * The caller (not this file) is responsible for the steps AFTER the plan:
 * calling getCampaignContextSlice() if plan.needsContext, invoking
 * plan.agent, running Quality Layer, and writing memory.
 */

const { detectMode } = require("./detectMode");
const { resolveModule } = require("./resolveModule");
const { resolveTask } = require("./resolveTask");
const { resolveRiskGate } = require("./resolveRiskGate");
const { buildExecutionPlan } = require("./buildExecutionPlan");

/**
 * @param {Object} brief - output of Marketing Input Guard + Brief Builder (steps 7-8).
 *   Until those modules exist, callers/tests may construct this shape directly.
 * @param {string} [brief.campaignId]
 * @param {string} brief.requestedModule
 * @param {string} brief.normalizedTask
 * @param {Object} [campaignLookup] - result of an upstream existence/status check
 *   on brief.campaignId, performed by the CALLER (e.g. via a try/catch around
 *   loadCampaignContext) — this orchestrator does not perform that lookup itself,
 *   to keep this module free of DB/I/O concerns. See detectMode.js for the
 *   expected shape: { exists: boolean, status: string }.
 *
 * @returns {{
 *   mode: "tool" | "campaign",
 *   module: string,
 *   task: string,
 *   campaignId: string | null,
 *   riskLevel: "low" | "medium" | "high",
 *   needsContext: boolean,
 *   needsApproval: boolean,
 *   agent: string,
 *   fallbackReason: string | null
 * }}
 */
function runOrchestrator(brief, campaignLookup = null) {
  const { mode, fallbackReason } = detectMode(brief, campaignLookup);

  const module = resolveModule(brief);
  const task = resolveTask(brief);
  const { riskLevel, needsApproval } = resolveRiskGate(module);

  const plan = buildExecutionPlan({
    mode,
    module,
    task,
    riskLevel,
    needsApproval,
    campaignId: brief.campaignId,
  });

  return { ...plan, fallbackReason };
}

module.exports = { runOrchestrator };
