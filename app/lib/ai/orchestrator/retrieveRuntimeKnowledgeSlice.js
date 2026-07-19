const { createKnowledgeService } = require("../knowledge");

function isKnowledgeRuntimeEnabled(explicitValue) {
  if (typeof explicitValue === "boolean") return explicitValue;
  return process.env.KNOWLEDGE_RUNTIME_ENABLED === "true";
}

function reducedDiagnostics(reason, extra = {}) {
  return Object.freeze({
    enabled: true,
    status: "reduced",
    reduced: true,
    reason,
    ...extra,
  });
}

async function retrieveRuntimeKnowledgeSlice({ executionPlan, options = {} }) {
  const enabled = isKnowledgeRuntimeEnabled(options.enabled);
  if (!enabled) {
    return {
      knowledgeSlice: null,
      knowledgeDiagnostics: Object.freeze({
        enabled: false,
        status: "disabled",
        reduced: false,
        reason: "rollout_disabled",
      }),
    };
  }

  const businessId = String(options.businessId || "").trim();
  if (!businessId) {
    return {
      knowledgeSlice: null,
      knowledgeDiagnostics: reducedDiagnostics("business_scope_unavailable"),
    };
  }

  try {
    const service = options.service || createKnowledgeService({
      supabase: options.supabase,
      persistence: options.persistence,
      clock: options.clock,
    });
    const knowledgeSlice = await service.getKnowledgeSlice({
      businessId,
      module: executionPlan.module,
      task: executionPlan.task,
      campaignId: executionPlan.campaignId,
      scope: options.scope,
      asOf: options.asOf,
      maxItems: options.maxItems,
    });
    const reduced = knowledgeSlice.items.length === 0;
    return {
      knowledgeSlice,
      knowledgeDiagnostics: Object.freeze({
        enabled: true,
        status: reduced ? "reduced" : "available",
        reduced,
        reason: reduced ? "no_visible_knowledge" : null,
        slice: knowledgeSlice.diagnostics,
      }),
    };
  } catch (error) {
    return {
      knowledgeSlice: null,
      knowledgeDiagnostics: reducedDiagnostics("retrieval_failed", {
        errorCategory: error?.code || error?.name || "knowledge_retrieval_error",
      }),
    };
  }
}

module.exports = { isKnowledgeRuntimeEnabled, retrieveRuntimeKnowledgeSlice };
