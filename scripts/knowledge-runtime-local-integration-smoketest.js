require("dotenv").config({ path: ".env.local", quiet: true });

const { validateInput } = require("../app/lib/ai/input-guard");
const {
  executeCanonicalPipeline,
  runOrchestrator,
} = require("../app/lib/ai/orchestrator");

const businessId = "11111111-1111-4111-8111-111111111111";
const campaignId = "p2f-runtime-integration";
let knowledgeReads = 0;
let knowledgeWrites = 0;
let passed = 0;

function verify(name, condition, details = {}) {
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  passed += 1;
  console.log(`PASS: ${name}`, details);
}

const knowledgePersistence = {
  async loadKnowledgeSliceInputs(requestedBusinessId) {
    knowledgeReads += 1;
    return {
      versions: [
        version("knowledge-constraint", "constraint", "Never describe the product as autonomous."),
        version("knowledge-positioning", "positioning", "A shared marketing brain for small B2B teams."),
        version("knowledge-learning", "validated_learning", "This Phase 4 learning must remain hidden."),
      ].filter((item) => item.business_id === requestedBusinessId),
      evidence: [
        { version_id: "knowledge-constraint", source_id: "source-brand-guide" },
        { version_id: "knowledge-positioning", source_id: "source-sales-deck" },
        { version_id: "knowledge-learning", source_id: "source-analytics" },
      ],
      conflicts: [],
      unapprovedCount: 0,
    };
  },
};

function version(id, domain, value) {
  return {
    id,
    business_id: businessId,
    identity_key: `${domain}:${id}`,
    domain,
    value,
    version: 1,
    status: "approved",
    confidence: 0.95,
    scope: { businessId },
    valid_from: null,
    valid_until: null,
    supersedes: null,
    approved_at: "2026-07-19T00:00:00.000Z",
  };
}

async function run() {
  const prompt = "Write a concise B2B blog post about coordinated marketing execution for small teams.";
  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid", { status: guard.status });

  const executionPlan = runOrchestrator(
    { campaignId, requestedModule: "content", normalizedTask: "blog_post" },
    { exists: true, status: "active" },
  );
  verify("Orchestrator plan", executionPlan.module === "content" && executionPlan.mode === "campaign");

  const pipeline = await executeCanonicalPipeline({
    normalizedPrompt: guard.normalizedPrompt,
    executionPlan,
    contextOptions: {
      contextDbAdapter: async () => ({
        campaignId,
        campaignName: "P2-F Runtime Integration",
        contextVersion: 3,
        offer: "AI Marketing OS",
        audience: "Small B2B marketing teams",
        goal: "Education",
        tone: "Professional",
        status: "active",
      }),
      eventsDbAdapter: async () => [{
        id: "campaign-event-1",
        campaignId,
        module: "research",
        artifact: "audience_analysis",
        approvalStatus: "approved",
        summary: "Small teams need coordinated execution.",
        payload: {},
        createdAt: "2026-07-19T00:00:00.000Z",
      }],
    },
    knowledgeOptions: {
      enabled: true,
      businessId,
      persistence: knowledgePersistence,
      asOf: "2026-07-19T12:00:00.000Z",
    },
    memoryOptions: {
      createdBy: "p2f-smoketest",
      dbAdapter: async (event) => event,
    },
  });

  verify("Knowledge retrieval owned by runtime", knowledgeReads === 1 && knowledgeWrites === 0);
  verify("Allowed Knowledge Slice", pipeline.knowledgeSlice.items.length === 2 &&
    !pipeline.knowledgeSlice.items.some((item) => item.domain === "validated_learning"));
  verify("Separate provenance", pipeline.brief.campaignProvenance.sourceEventIds[0] === "campaign-event-1" &&
    pipeline.brief.knowledgeProvenance.knowledgeIds.includes("knowledge-positioning"));
  verify("Knowledge-enriched Brief", pipeline.brief.knowledgeContext.includes("shared marketing brain") &&
    pipeline.brief.knowledgeContext.includes("Never describe the product as autonomous"));
  verify("Explicit diagnostics", pipeline.knowledgeDiagnostics.status === "available" &&
    pipeline.knowledgeDiagnostics.slice.excludedByDomain === 1);
  verify("Real provider Agent execution", Boolean(pipeline.agentOutput.metadata?.provider), {
    provider: pipeline.agentOutput.metadata?.provider,
    model: pipeline.agentOutput.metadata?.model,
  });
  verify("Quality and Memory", pipeline.quality.passed && pipeline.memoryWrite.memory.saved);
  const storedPayload = pipeline.memoryWrite.memory.event.payload;
  verify("Knowledge provenance written separately", storedPayload.knowledgeVersionIds.length === 2 &&
    storedPayload.knowledgeSourceIds.includes("source-brand-guide") &&
    storedPayload.sourceEventIds.includes("campaign-event-1"));
  verify("No durable Knowledge mutation", knowledgeWrites === 0);

  console.log(`\nP2-F LOCAL INTEGRATION: ${passed}/${passed} PASSED`);
}

run().catch((error) => {
  console.error("P2-F LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
