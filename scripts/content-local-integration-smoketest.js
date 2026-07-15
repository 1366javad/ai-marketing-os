require("dotenv").config({ path: ".env.local", quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { validateInput } = require("../app/lib/ai/input-guard");
const { runOrchestrator } = require("../app/lib/ai/orchestrator");
const { getCampaignContextSlice } = require("../app/lib/ai/campaign/getCampaignContextSlice");
const { buildBrief } = require("../app/lib/ai/brief-builder");
const { runContentAgent, toContentMemoryEvent } = require("../app/lib/ai/agents/content");
const { runQualityChecks } = require("../app/lib/ai/quality");
const { writeMemoryEvent } = require("../app/lib/ai/campaign/events/writeMemoryEvent");

const campaignId = "local_sprint_c_campaign";
const storedEvents = [
  event("research_approved", "research", "audience_analysis", "approved"),
  event("seo_approved", "seo", "keyword_cluster", "auto_saved"),
  event("seo_pending", "seo", "seo_strategy", "pending"),
];
const context = {
  campaignId,
  campaignName: "Sprint C Local Integration",
  contextVersion: 1,
  industry: "B2B SaaS",
  offer: "AI Marketing OS",
  goal: "Lead generation",
  audience: "Small B2B business owners",
  positioning: "The marketing brain of a business",
  valueProposition: "Shared intelligence across marketing workflows",
  tone: "Professional",
  platforms: ["Blog"],
  competitors: [],
  status: "active",
};
let passed = 0;

function event(id, module, artifact, approvalStatus) {
  return {
    id,
    campaignId,
    module,
    artifact,
    type: artifact,
    approvalStatus,
    confidence: 0.9,
    riskLevel: "low",
    task: artifact,
    summary: `${module} ${artifact}`,
    payload: { insights: [`Approved ${artifact} context.`] },
    supersedes: null,
    createdAt: "2026-07-15T00:00:00Z",
    createdBy: "local-integration-smoketest",
  };
}

function verify(name, condition, details = {}) {
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  passed += 1;
  console.log(`PASS: ${name}`, details);
}

async function run() {
  const prompt = "Write a practical blog post explaining how a shared marketing brain helps small B2B teams.";
  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid", { status: guard.status });

  const executionPlan = runOrchestrator(
    { campaignId, requestedModule: "content", normalizedTask: "blog_post" },
    { exists: true, status: "active" },
  );
  verify("Orchestrator", executionPlan.mode === "campaign" && executionPlan.module === "content", {
    task: executionPlan.task,
  });

  const contextSlice = await getCampaignContextSlice(campaignId, "content", "blog_post", {
    includePending: false,
    contextDbAdapter: async () => context,
    eventsDbAdapter: async () => storedEvents,
  });
  const identities = contextSlice.relevantEvents.map(({ module, artifact }) => `${module}+${artifact}`);
  verify(
    "Context Slice",
    identities.includes("research+audience_analysis") &&
      identities.includes("seo+keyword_cluster") &&
      !identities.includes("seo+seo_strategy"),
    { identities },
  );

  const brief = {
    ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
    requestedModule: "content",
    normalizedTask: "blog_post",
    normalizedPrompt: guard.normalizedPrompt,
    relevantEvents: contextSlice.relevantEvents,
  };
  verify("Brief Builder", brief.relevantEvents.length === 2, {
    relevantEventCount: brief.relevantEvents.length,
  });

  const contentOutput = await runContentAgent({ brief, executionPlan });
  const memoryEvent = toContentMemoryEvent(contentOutput, { brief, executionPlan });
  verify("Content Agent", memoryEvent.module === "content" && memoryEvent.artifact === "blog_draft", {
    provider: contentOutput.metadata?.provider,
    model: contentOutput.metadata?.model,
  });

  const quality = runQualityChecks(memoryEvent, executionPlan, brief);
  verify("Quality Layer", quality.passed && quality.riskLevel === "medium" && quality.approvalRequired, {
    score: quality.score,
  });

  const written = await writeMemoryEvent(
    {
      campaignId,
      module: memoryEvent.module,
      artifact: memoryEvent.artifact,
      approvalStatus: "pending",
      confidence: quality.score,
      riskLevel: quality.riskLevel,
      task: executionPlan.task,
      summary: memoryEvent.summary,
      payload: memoryEvent.payload,
      supersedes: null,
      createdBy: "local-integration-smoketest",
    },
    { dbAdapter: async (value) => value },
  );
  verify("Memory Write", written.module === "content" && written.artifact === "blog_draft");

  const canonicalFiles = [
    "app/api/content/generate/route.js",
    "app/lib/ai/agents/content/index.js",
    "app/lib/ai/campaign/getCampaignContextSlice.js",
  ];
  const legacyReference = canonicalFiles.find((file) =>
    fs.readFileSync(path.resolve(file), "utf8").includes("/legacy/"),
  );
  const loadedLegacyModule = Object.keys(require.cache).find((file) =>
    file.replaceAll("\\", "/").includes("/app/lib/ai/legacy/"),
  );
  verify("No Legacy Execution", !legacyReference && !loadedLegacyModule, {
    legacyReference: legacyReference || null,
    loadedLegacyModule: loadedLegacyModule || null,
  });

  console.log(`\nSPRINT C LOCAL INTEGRATION: ${passed}/${passed} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT C LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
