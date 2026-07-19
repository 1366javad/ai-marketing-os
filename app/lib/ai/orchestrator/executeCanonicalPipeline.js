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
const {
  runCreativeTextPipeline,
  runCreativeImagePipeline,
  toCreativeMemoryEvent,
  toImageAssetMemoryEvent,
} = require("../agents/creative");
const { runAdsAgent, toAdsMemoryEvent } = require("../agents/ads");
const {
  runAnalyticsAgent,
  toAnalyticsMemoryEvent,
} = require("../agents/analytics");
const { runVideoPlanning, toVideoMemoryEvent } = require("../agents/video");
const { retrieveRuntimeKnowledgeSlice } = require("./retrieveRuntimeKnowledgeSlice");

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
  creative: Object.freeze({
    run: runCreativeTextPipeline,
    toMemoryEvent: toCreativeMemoryEvent,
  }),
  ads: Object.freeze({
    run: runAdsAgent,
    toMemoryEvent: toAdsMemoryEvent,
  }),
  analytics: Object.freeze({
    run: runAnalyticsAgent,
    toMemoryEvent: toAnalyticsMemoryEvent,
  }),
  video: Object.freeze({
    run: runVideoPlanning,
    toMemoryEvent: toVideoMemoryEvent,
  }),
});

async function executeCanonicalPipeline(options = {}) {
  const {
    normalizedPrompt,
    executionPlan,
    contextOptions = {},
    knowledgeOptions = {},
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

  const { knowledgeSlice, knowledgeDiagnostics } =
    await retrieveRuntimeKnowledgeSlice({
      executionPlan,
      options: knowledgeOptions,
    });

  const brief = {
    ...buildBrief(
      normalizedPrompt,
      executionPlan,
      contextSlice,
      knowledgeSlice,
      knowledgeDiagnostics,
    ),
    requestedModule: executionPlan.module,
    normalizedTask: executionPlan.task,
    normalizedPrompt,
    context: contextSlice?.context || {},
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
      memoryOptions: {
        ...memoryOptions,
        payloadExtensions: {
          ...memoryOptions.payloadExtensions,
          contextVersion: contextSlice?.contextVersion ?? null,
          sourceEventIds: (contextSlice?.relevantEvents || [])
            .map((event) => event.id)
            .filter(Boolean),
          knowledgeVersionIds: (knowledgeSlice?.items || [])
            .map((item) => item.knowledgeId)
            .filter(Boolean),
          knowledgeSourceIds: [...new Set((knowledgeSlice?.items || [])
            .flatMap((item) => item.sourceIds || []))],
        },
      },
    });
  }

  return {
    executionPlan,
    contextSlice,
    knowledgeSlice,
    knowledgeDiagnostics,
    brief,
    agentOutput,
    memoryEvent,
    quality,
    riskGate: buildRiskGateResult(quality),
    memoryWrite,
  };
}

function buildRiskGateResult(quality) {
  const blocked = quality.riskLevel === "high";

  return {
    blocked,
    publishable: !quality.approvalRequired,
    requiresExplicitApproval: blocked,
    reason: blocked
      ? "High-risk output requires explicit human approval before publish or spend."
      : null,
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
    payload: {
      ...memoryEvent.payload,
      ...memoryOptions.payloadExtensions,
    },
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

async function executeCreativeImageStage(options = {}) {
  const {
    creativeOutput,
    executionPlan,
    brief,
    memoryOptions = {},
  } = options;

  if (!creativeOutput || executionPlan?.module !== "creative" || !brief) {
    throw new Error(
      "executeCreativeImageStage: creativeOutput, Creative executionPlan, and brief are required.",
    );
  }

  try {
    const agentOutput = await runCreativeImagePipeline({ creativeOutput });
    const memoryEvent = toImageAssetMemoryEvent(agentOutput, {
      brief,
      executionPlan,
    });
    const quality = runQualityChecks(memoryEvent, executionPlan, brief);
    const reviewPassed = agentOutput.review?.passed === true;
    const approvalStatus =
      reviewPassed && quality.passed
        ? quality.approvalRequired
          ? "pending"
          : "auto_saved"
        : "rejected";
    const memoryWrite = await persistCreativeImageEvent({
      executionPlan,
      memoryEvent,
      quality,
      approvalStatus,
      memoryOptions,
    });

    return {
      agentOutput,
      memoryEvent,
      quality,
      reviewPassed,
      memoryWrite,
      imageStatus: approvalStatus === "rejected" ? "failed" : "ready",
    };
  } catch (error) {
    const failureEvent = {
      module: "creative",
      artifact: "image_asset",
      summary: `${creativeOutput.title} image generation failed`,
      payload: {
        type: creativeOutput.type,
        title: creativeOutput.title,
        task: executionPlan.task,
        imageStatus: "failed",
        error: error.message,
        metadata: creativeOutput.metadata || {},
        generatedAt: new Date().toISOString(),
      },
    };
    const memoryWrite = await persistCreativeImageEvent({
      executionPlan,
      memoryEvent: failureEvent,
      quality: { score: 0, riskLevel: "medium" },
      approvalStatus: "rejected",
      memoryOptions,
    });
    return {
      agentOutput: creativeOutput,
      memoryEvent: failureEvent,
      quality: null,
      reviewPassed: false,
      memoryWrite,
      imageStatus: "failed",
      error,
    };
  }
}

async function persistCreativeImageEvent({
  executionPlan,
  memoryEvent,
  quality,
  approvalStatus,
  memoryOptions,
}) {
  if (executionPlan.mode !== "campaign") {
    return { memory: { skipped: true, reason: "tool_mode" } };
  }

  const canonicalEvent = {
    campaignId: executionPlan.campaignId,
    module: "creative",
    artifact: "image_asset",
    approvalStatus,
    confidence: quality.score,
    riskLevel: quality.riskLevel,
    task: executionPlan.task,
    summary: memoryEvent.summary,
    payload: {
      ...memoryEvent.payload,
      ...memoryOptions.payloadExtensions,
    },
    supersedes: memoryOptions.supersedes || null,
    createdBy: memoryOptions.createdBy,
  };
  const event = await writeMemoryEvent(canonicalEvent, {
    dbAdapter: memoryOptions.dbAdapter,
  });
  return {
    memory: {
      saved: true,
      storage: "campaign_memory_events",
      event,
    },
  };
}

module.exports = {
  executeCanonicalPipeline,
  executeCreativeImageStage,
  AGENT_DEFINITIONS,
  buildRiskGateResult,
};
