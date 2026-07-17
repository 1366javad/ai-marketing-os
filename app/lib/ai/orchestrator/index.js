/**
 * index.js — Orchestrator entry point
 *
 * THIS FILE IS A COORDINATOR, NOT AN AGENT. It exposes the two phases of the
 * frozen OrchestratorService contract:
 *   1. runOrchestrator() creates the ExecutionPlan needed by route-level
 *      credit and usage gates.
 *   2. executeCanonicalPipeline() owns Context Slice, Brief Builder, Agent,
 *      Quality/Risk Gate, and Memory Write.
 *
 * Planning phase:
 *
 *   validated orchestration input
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
 * The API route remains responsible only for HTTP/auth, Input Guard,
 * campaign lookup, credit/usage accounting, and response formatting.
 */

const { detectMode } = require("./detectMode");
const { resolveModule } = require("./resolveModule");
const { resolveTask } = require("./resolveTask");
const { resolveRiskGate } = require("./resolveRiskGate");
const { buildExecutionPlan } = require("./buildExecutionPlan");
const {
  executeCanonicalPipeline,
  executeCreativeImageStage,
} = require("./executeCanonicalPipeline");

/**
 * @param {Object} brief - validated orchestration input from the API route.
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

  const requestedModule = resolveModule(brief);
  const task = resolveTask(brief);
  const { riskLevel, needsApproval } = resolveRiskGate(requestedModule);

  const plan = buildExecutionPlan({
    mode,
    module: requestedModule,
    task,
    riskLevel,
    needsApproval,
    campaignId: brief.campaignId,
  });

  return { ...plan, fallbackReason };
}

module.exports = {
  runOrchestrator,
  executeCanonicalPipeline,
  executeCreativeImageStage,
};
