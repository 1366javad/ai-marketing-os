/**
 * getCampaignContextSlice.js
 *
 * THE single enforcement point for reading Campaign Memory (Rule 7,
 * campaign-memory-v1.md / ADR-002: "Direct memory access is not allowed").
 * No agent, orchestrator caller, or UI layer should read campaign context
 * or memory events through any other path.
 *
 * This file is intentionally a thin pipeline. It contains NO business logic
 * of its own — every rule it enforces is implemented in one of the imported
 * modules, each traceable to a specific doc:
 *
 *   loadCampaignContext   → campaign-context-schema.md
 *   loadCampaignEvents    → campaign-context-schema.md
 *   getModuleContextFields → context-slicing-matrix.md
 *   getModuleEventTypes    → context-slicing-matrix.md / context-slicing-examples.md
 *   applyApprovalRules     → campaign-memory-v1.md, Rule 3 + Rule 4
 *   applyRiskRules         → adr-003-risk-classification.md (defensive layer)
 *   applyConfidenceRules   → campaign-memory-v1.md, Section 3 (minConfidence)
 *   resolveSupersedes      → campaign-memory-v1.md, Rule 2
 *
 * Pipeline order (fixed — do not reorder without updating this comment
 * and context-slicing-examples.md):
 *
 *   load context → load events → filter by module's relevant event types
 *   → approval filter → risk filter → confidence filter → resolve supersedes
 *   → slice context fields → return
 *
 * Why approval filtering happens BEFORE supersedes resolution: a pending
 * event that superseded an approved one must not hide the still-valid
 * approved version. Only an event that survived approval filtering is
 * allowed to "win" a supersedes chain.
 */

const { loadCampaignContext } = require("./context/loadCampaignContext");
const { loadCampaignEvents } = require("./events/loadCampaignEvents");
const { applyApprovalRules } = require("./filters/applyApprovalRules");
const { applyRiskRules } = require("./filters/applyRiskRules");
const { applyConfidenceRules } = require("./filters/applyConfidenceRules");
const { resolveSupersedes } = require("./filters/resolveSupersedes");
const { getModuleContextFields } = require("./matrix/getModuleContextFields");
const {
  getModuleArtifactSelectors,
  getSeoPredecessorArtifacts,
} = require("./matrix/getModuleEventTypes");
const {
  canonicalizeMemoryEvent,
  matchesArtifactSelectors,
} = require("./memorySchema");

/**
 * @param {string} campaignId
 * @param {"research"|"seo"|"content"|"creative"|"ads"|"analytics"} module
 * @param {string} task - free-text description of what the agent is doing;
 *   currently used only for logging/traceability, not for further filtering.
 *   (Per-task field filtering, beyond per-module, is an Open Item — see
 *   orchestrator-design.md Section 7. Not implemented here; do not add
 *   task-based branching ad hoc if you hit this — extend the Matrix first.)
 * @param {Object} [options]
 * @param {boolean} [options.includePending=false] - Rule 4. Orchestrator must
 *   never set this true for agent-facing generation calls — only the human
 *   review UI may pass true.
 * @param {number} [options.minConfidence=0.0]
 * @param {"low"|"medium"|"high"|null} [options.maxRiskLevel=null]
 * @param {number} [options.asOfVersion] - historical replay; passed through to
 *   loadCampaignContext. Event-level "as of" filtering by date is NOT yet
 *   implemented — flagged here rather than silently approximated.
 * @param {Function} [options.contextDbAdapter] - injected adapter for loadCampaignContext
 * @param {Function} [options.eventsDbAdapter] - injected adapter for loadCampaignEvents
 *
 * @returns {Promise<{
 *   context: Object,
 *   relevantEvents: import("./events/loadCampaignEvents").CampaignMemoryEvent[],
 *   contextVersion: number
 * }>}
 */
async function getCampaignContextSlice(campaignId, module, task, options = {}) {
  if (!campaignId) throw new Error("getCampaignContextSlice: campaignId is required.");
  if (!module) throw new Error("getCampaignContextSlice: module is required.");
  if (!task) throw new Error("getCampaignContextSlice: task is required.");

  const {
    includePending = false,
    minConfidence = 0.0,
    maxRiskLevel = null,
    asOfVersion,
    contextDbAdapter,
    eventsDbAdapter,
  } = options;

  // 1. Load context (full object — field slicing happens later, step 7)
  const fullContext = await loadCampaignContext(campaignId, {
    asOfVersion,
    dbAdapter: contextDbAdapter,
  });

  // 2. Determine which event types this module is allowed to see (Matrix)
  const artifactSelectors = getModuleArtifactSelectors(module, task);

  // 3. Load raw events, pre-filtered by type at the query level where possible
  const rawEvents = await loadCampaignEvents(campaignId, {
    artifactSelectors,
    includePending,
    dbAdapter: eventsDbAdapter,
  });

  // 4. Defensively re-apply the type filter in-process — never trust the
  //    DB adapter to have honored the type hint from step 3.
  const canonicalEvents = rawEvents.map(canonicalizeMemoryEvent);
  const typeFiltered = canonicalEvents.filter((event) =>
    matchesArtifactSelectors(event, artifactSelectors),
  );

  // 5. Approval filter — Rule 3 / Rule 4. This MUST run before supersedes
  //    resolution (see file header comment for why).
  const approvalFiltered = applyApprovalRules(typeFiltered, { includePending });

  // 6. Risk filter — defensive layer on top of ADR-003 write-time enforcement
  const riskFiltered = applyRiskRules(approvalFiltered, { maxRiskLevel });

  // 7. Confidence filter
  const confidenceFiltered = applyConfidenceRules(riskFiltered, { minConfidence });

  // 8. Resolve supersedes chains — only events that survived filtering can win
  const resolvedEvents = resolveSupersedes(confidenceFiltered);
  const relevantEvents =
    module === "seo"
      ? boundSeoPredecessorHistory(resolvedEvents)
      : resolvedEvents;

  // 9. Slice the Context Object to the fields this module is allowed to see
  const allowedContextFields = getModuleContextFields(module); // string[] | null (null = full object)
  const context =
    allowedContextFields === null
      ? fullContext
      : pickFields(fullContext, allowedContextFields);

  const result = {
    context,
    relevantEvents,
    contextVersion: fullContext.contextVersion,
  };

  if (module === "seo") {
    result.dependencyDiagnostics = buildSeoDependencyDiagnostics(
      task,
      relevantEvents,
    );
  }

  return result;
}

function boundSeoPredecessorHistory(events) {
  const latestByArtifact = new Map();

  for (const event of [...events].sort(compareNewestFirst)) {
    const key = `${event.module}:${event.artifact}`;
    if (!latestByArtifact.has(key)) latestByArtifact.set(key, event);
  }

  return [...latestByArtifact.values()];
}

function buildSeoDependencyDiagnostics(task, events) {
  const allowedPredecessors = getSeoPredecessorArtifacts(task);
  const visiblePredecessors = allowedPredecessors.filter((artifact) =>
    events.some((event) => event.module === "seo" && event.artifact === artifact),
  );
  const missingPredecessors = allowedPredecessors.filter(
    (artifact) => !visiblePredecessors.includes(artifact),
  );

  return {
    allowedPredecessors,
    visiblePredecessors,
    missingPredecessors,
    reducedContext: missingPredecessors.length > 0,
  };
}

function compareNewestFirst(left, right) {
  const leftTime = Date.parse(left.createdAt || "") || 0;
  const rightTime = Date.parse(right.createdAt || "") || 0;
  if (leftTime !== rightTime) return rightTime - leftTime;
  return String(right.id || "").localeCompare(String(left.id || ""));
}

/**
 * Small local utility — intentionally not pulled in from a generic lodash-style
 * helper library, to keep this module dependency-free and easy to audit.
 * @param {Object} obj
 * @param {string[]} fields
 * @returns {Object}
 */
function pickFields(obj, fields) {
  const result = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

module.exports = { getCampaignContextSlice };
