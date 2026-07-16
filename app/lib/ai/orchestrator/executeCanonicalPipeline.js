const { getCampaignContextSlice } = require("../campaign/getCampaignContextSlice");
const { writeMemoryEvent } = require("../campaign/events/writeMemoryEvent");
const { buildBrief } = require("../brief-builder");
const { runQualityChecks } = require("../quality");
const {
  runResearchAgent,
  repairResearchOutput,
  toResearchMemoryEvent,
} = require("../agents/research");
const { runSeoAgent, toSeoMemoryEvent } = require("../agents/seo");
const { runContentAgent, toContentMemoryEvent } = require("../agents/content");

const AGENT_DEFINITIONS = Object.freeze({
  research: Object.freeze({
    run: runResearchAgent,
    repair: repairResearchOutput,
    toMemoryEvent: toResearchMemoryEvent,
  }),
  seo: Object.freeze({
    run: runSeoAgent,
    toMemoryEvent: toSeoMemoryEvent,
  }),
  content: Object.freeze({
    run: runContentAgent,
    toMemoryEvent: toContentMemoryEvent,
  }),
});

async function executeCanonicalPipeline(options = {}) {
  const {
    normalizedPrompt,
    executionPlan,
    contextOptions = {},
    briefExtensions = {},
    memoryOptions = {},
  } = options;

  if (!normalizedPrompt) {
    throw new Error("executeCanonicalPipeline: normalizedPrompt is required.");
  }
  if (!executionPlan?.module) {
    throw new Error("executeCanonicalPipeline: executionPlan is required.");
  }

  const agentDefinition = AGENT_DEFINITIONS[executionPlan.module];
  if (!agentDefinition) {
    throw new Error(
      `executeCanonicalPipeline: no canonical agent registered for module "${executionPlan.module}".`,
    );
  }

  const contextSlice = executionPlan.needsContext
    ? await getCampaignContextSlice(
        executionPlan.campaignId,
        executionPlan.module,
        executionPlan.task,
        { includePending: false, ...contextOptions },
      )
    : null;

  const brief = {
    ...buildBrief(normalizedPrompt, executionPlan, contextSlice),
    requestedModule: executionPlan.module,
    normalizedTask: executionPlan.task,
    normalizedPrompt,
    relevantEvents: contextSlice?.relevantEvents || [],
    ...(contextSlice?.dependencyDiagnostics
      ? { dependencyDiagnostics: contextSlice.dependencyDiagnostics }
      : {}),
    ...briefExtensions,
  };

  let agentOutput = await agentDefinition.run({ brief, executionPlan });
  let memoryEvent = agentDefinition.toMemoryEvent(agentOutput, {
    brief,
    executionPlan,
  });
  let quality = runQualityChecks(memoryEvent, executionPlan, brief);

  if (!quality.passed && agentDefinition.repair) {
    agentOutput = await agentDefinition.repair({
      brief,
      executionPlan,
      previousOutput: agentOutput,
      issues: quality.issues,
    });
    memoryEvent = agentDefinition.toMemoryEvent(agentOutput, {
      brief,
      executionPlan,
    });
    quality = runQualityChecks(memoryEvent, executionPlan, brief);
  }

  let memoryWrite = null;
  if (quality.passed) {
    memoryWrite = await persistPipelineOutput({
      executionPlan,
      memoryEvent,
      quality,
      agentOutput,
      memoryOptions,
    });
  }

  return {
    executionPlan,
    contextSlice,
    brief,
    agentOutput,
    memoryEvent,
    quality,
    memoryWrite,
  };
}

async function persistPipelineOutput({
  executionPlan,
  memoryEvent,
  quality,
  agentOutput,
  memoryOptions,
}) {
  if (executionPlan.mode !== "campaign") {
    return typeof memoryOptions.onToolMode === "function"
      ? memoryOptions.onToolMode({ agentOutput, memoryEvent, quality })
      : { output: agentOutput, memory: { skipped: true, reason: "tool_mode" } };
  }

  const canonicalEvent = {
    campaignId: executionPlan.campaignId,
    module: memoryEvent.module,
    artifact: memoryEvent.artifact,
    approvalStatus: quality.approvalRequired ? "pending" : "auto_saved",
    confidence: quality.score,
    riskLevel: quality.riskLevel,
    task: executionPlan.task,
    summary: memoryEvent.summary,
    payload: memoryEvent.payload,
    supersedes: memoryOptions.supersedes || null,
    createdBy: memoryOptions.createdBy,
  };

  try {
    const event = await writeMemoryEvent(canonicalEvent, {
      dbAdapter: memoryOptions.dbAdapter,
    });
    const output =
      typeof memoryOptions.onWriteSuccess === "function"
        ? await memoryOptions.onWriteSuccess({
            event,
            canonicalEvent,
            agentOutput,
            memoryEvent,
            quality,
          })
        : agentOutput;
    return {
      output,
      memory: { saved: true, storage: "campaign_memory_events", event },
    };
  } catch (error) {
    if (typeof memoryOptions.onWriteFailure !== "function") throw error;
    return memoryOptions.onWriteFailure({
      error,
      canonicalEvent,
      agentOutput,
      memoryEvent,
      quality,
    });
  }
}

module.exports = { executeCanonicalPipeline, AGENT_DEFINITIONS };
