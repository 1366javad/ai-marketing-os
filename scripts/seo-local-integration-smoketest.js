require("dotenv").config({ path: ".env.local", quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { validateInput } = require("../app/lib/ai/input-guard");
const { runOrchestrator } = require("../app/lib/ai/orchestrator");
const {
  getCampaignContextSlice,
} = require("../app/lib/ai/campaign/getCampaignContextSlice");
const { buildBrief } = require("../app/lib/ai/brief-builder");
const {
  runSeoAgent,
  toSeoMemoryEvent,
} = require("../app/lib/ai/agents/seo");
const { runQualityChecks } = require("../app/lib/ai/quality");
const {
  writeMemoryEvent,
} = require("../app/lib/ai/campaign/events/writeMemoryEvent");

const campaignId = "local_sprint_b_campaign";
const storedEvents = [
  {
    id: "research_1",
    campaignId,
    module: "research",
    artifact: "market_research",
    type: "market_research",
    approvalStatus: "auto_saved",
    confidence: 0.95,
    riskLevel: "low",
    task: "market",
    summary: "Small B2B teams need coordinated marketing execution.",
    payload: { insights: ["Fragmented tools create inconsistent campaigns."] },
    supersedes: null,
    createdAt: "2026-07-14T00:00:00Z",
    createdBy: "local-integration-smoketest",
  },
];

const context = {
  campaignId,
  campaignName: "Sprint B Local Integration",
  contextVersion: 1,
  industry: "B2B SaaS",
  offer: "AI Marketing OS",
  goal: "Lead generation",
  audience: "Small B2B business owners",
  positioning: "The marketing brain of a business",
  valueProposition: "Shared intelligence across marketing workflows",
  tone: "Professional",
  platforms: ["Google"],
  competitors: [],
  status: "active",
};

const results = [];

function verify(name, condition, details = {}) {
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  results.push({ name, status: "PASS", ...details });
  console.log(`PASS: ${name}`, details);
}

async function getSlice(module, task) {
  return getCampaignContextSlice(campaignId, module, task, {
    includePending: false,
    contextDbAdapter: async () => context,
    eventsDbAdapter: async () => storedEvents,
  });
}

async function run() {
  const prompt =
    "Create focused keyword clusters for an AI marketing operating system serving small B2B businesses.";
  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid", { status: guard.status });

  const executionPlan = runOrchestrator(
    {
      campaignId,
      requestedModule: "seo",
      normalizedTask: "clusters",
    },
    { exists: true, status: "active" },
  );
  verify("Orchestrator", executionPlan.mode === "campaign", {
    task: executionPlan.task,
  });

  const contextSlice = await getSlice("seo", "clusters");
  verify(
    "Bounded Context Slice",
    contextSlice.relevantEvents.every((event) => event.module === "research") &&
      contextSlice.dependencyDiagnostics.missingPredecessors.includes(
        "keyword_research",
      ),
    contextSlice.dependencyDiagnostics,
  );

  const brief = {
    ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
    requestedModule: "seo",
    normalizedTask: "clusters",
    normalizedPrompt: guard.normalizedPrompt,
    relevantEvents: contextSlice.relevantEvents,
    dependencyDiagnostics: contextSlice.dependencyDiagnostics,
  };
  verify(
    "Brief Builder",
    brief.relevantEvents.length === 1 &&
      brief.dependencyDiagnostics.reducedContext === true,
    { relevantEventCount: brief.relevantEvents.length },
  );

  const seoOutput = await runSeoAgent({ brief, executionPlan });
  const memoryEvent = toSeoMemoryEvent(seoOutput, { brief, executionPlan });
  verify(
    "SEO Agent Without Optional Predecessor",
    memoryEvent.artifact === "keyword_cluster" &&
      seoOutput.metadata?.dependencyDiagnostics?.reducedContext === true,
    {
      artifact: memoryEvent.artifact,
      provider: seoOutput.metadata?.provider,
      model: seoOutput.metadata?.model,
    },
  );

  const quality = runQualityChecks(memoryEvent, executionPlan, brief);
  verify(
    "Quality and Risk Floor",
    quality.passed &&
      quality.riskLevel === "low" &&
      quality.approvalRequired === false,
    { score: quality.score, riskLevel: quality.riskLevel },
  );

  const written = await writeMemoryEvent(
    {
      campaignId,
      module: "seo",
      artifact: memoryEvent.artifact,
      approvalStatus: "auto_saved",
      confidence: quality.score,
      riskLevel: quality.riskLevel,
      task: executionPlan.task,
      summary: memoryEvent.summary,
      payload: memoryEvent.payload,
      supersedes: null,
      createdBy: "local-integration-smoketest",
    },
    {
      dbAdapter: async (event) => {
        const stored = {
          ...event,
          id: "seo_cluster_1",
          type: event.artifact,
          createdAt: new Date().toISOString(),
        };
        storedEvents.push(stored);
        return stored;
      },
    },
  );
  verify("Memory Write", written.approvalStatus === "auto_saved", {
    artifact: written.artifact,
  });

  const contentSlice = await getSlice("content", "blog_post");
  verify(
    "Content Reads Keyword Cluster",
    contentSlice.relevantEvents.some(
      (event) =>
        event.module === "seo" &&
        event.artifact === "keyword_cluster" &&
        event.approvalStatus === "auto_saved",
    ),
    { relevantEventCount: contentSlice.relevantEvents.length },
  );

  const canonicalFiles = [
    "app/api/seo/generate/route.js",
    "app/lib/ai/agents/seo/index.js",
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

  console.log(`\nSPRINT B LOCAL INTEGRATION: ${results.length}/${results.length} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT B LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
