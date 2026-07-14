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
  runResearchAgent,
  repairResearchOutput,
  toResearchMemoryEvent,
} = require("../app/lib/ai/agents/research");
const { runQualityChecks } = require("../app/lib/ai/quality");
const {
  writeMemoryEvent,
} = require("../app/lib/ai/campaign/events/writeMemoryEvent");

const campaignId = "local_sprint_a_campaign";
const storedEvents = [];
const results = [];

function verify(name, condition, details = {}) {
  if (!condition) {
    throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  }
  results.push({ name, status: "PASS", ...details });
  console.log(`PASS: ${name}`, details);
}

async function run() {
  const prompt =
    "Research the market for an AI marketing operating system for small B2B businesses. Identify audience needs, competitive pressure, risks, and actionable opportunities for a campaign.";

  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid", { status: guard.status });

  const executionPlan = runOrchestrator(
    {
      campaignId,
      requestedModule: "research",
      normalizedTask: "market",
    },
    { exists: true, status: "active" },
  );
  verify(
    "Orchestrator",
    executionPlan.mode === "campaign" &&
      executionPlan.module === "research" &&
      executionPlan.needsContext === true,
    { mode: executionPlan.mode, task: executionPlan.task },
  );

  const contextSlice = await getCampaignContextSlice(
    campaignId,
    executionPlan.module,
    executionPlan.task,
    {
      includePending: false,
      contextDbAdapter: async () => ({
        campaignId,
        campaignName: "Sprint A Local Integration",
        contextVersion: 1,
        industry: "B2B SaaS",
        offer: "AI Marketing OS",
        goal: "Lead generation",
        audience: "Small B2B business owners",
        positioning: "The marketing brain of a business",
        valueProposition: "Shared intelligence across marketing workflows",
        tone: "Professional",
        platforms: ["LinkedIn"],
        competitors: [],
        status: "active",
      }),
      eventsDbAdapter: async () => storedEvents,
    },
  );
  verify(
    "Context Slice",
    contextSlice.contextVersion === 1 &&
      contextSlice.context.industry === "B2B SaaS",
    { contextVersion: contextSlice.contextVersion },
  );

  const brief = {
    ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
    requestedModule: "research",
    normalizedTask: "market",
    normalizedPrompt: guard.normalizedPrompt,
    relevantEvents: contextSlice.relevantEvents,
  };
  verify(
    "Brief Builder",
    brief.mode === "campaign" && brief.industry === "B2B SaaS",
    { confidence: brief.confidence },
  );

  let researchOutput = await runResearchAgent({ brief, executionPlan });
  verify(
    "Research Agent",
    researchOutput.type === "market_research" &&
      researchOutput.insights.length >= 3,
    {
      artifact: researchOutput.type,
      provider: researchOutput.metadata?.provider,
      model: researchOutput.metadata?.model,
    },
  );

  let memoryEvent = toResearchMemoryEvent(researchOutput, {
    brief,
    executionPlan,
  });
  let quality = runQualityChecks(memoryEvent, executionPlan, brief);
  if (!quality.passed) {
    researchOutput = await repairResearchOutput({
      brief,
      executionPlan,
      previousOutput: researchOutput,
      issues: quality.issues,
    });
    memoryEvent = toResearchMemoryEvent(researchOutput, {
      brief,
      executionPlan,
    });
    quality = runQualityChecks(memoryEvent, executionPlan, brief);
  }
  verify(
    "Quality Layer",
    quality.passed &&
      quality.riskLevel === "low" &&
      quality.approvalRequired === false,
    { score: quality.score, riskLevel: quality.riskLevel },
  );

  const writtenEvent = await writeMemoryEvent(
    {
      campaignId,
      module: memoryEvent.module,
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
          id: `evt_${storedEvents.length + 1}`,
          type: event.artifact,
          createdAt: new Date().toISOString(),
        };
        storedEvents.push(stored);
        return stored;
      },
    },
  );
  verify(
    "Memory Write",
    writtenEvent.approvalStatus === "auto_saved" && storedEvents.length === 1,
    { eventId: writtenEvent.id, artifact: writtenEvent.artifact },
  );

  const downstreamSlice = await getCampaignContextSlice(
    campaignId,
    "seo",
    "keyword_research",
    {
      includePending: false,
      contextDbAdapter: async () => ({
        campaignId,
        campaignName: "Sprint A Local Integration",
        contextVersion: 1,
        industry: "B2B SaaS",
        offer: "AI Marketing OS",
        goal: "Lead generation",
        audience: "Small B2B business owners",
        positioning: "The marketing brain of a business",
        valueProposition: "Shared intelligence across marketing workflows",
        tone: "Professional",
        platforms: ["LinkedIn"],
        competitors: [],
        status: "active",
      }),
      eventsDbAdapter: async () => storedEvents,
    },
  );
  verify(
    "Downstream Context Read",
    downstreamSlice.relevantEvents.some(
      (event) =>
        event.module === "research" &&
        event.artifact === "market_research" &&
        event.approvalStatus === "auto_saved",
    ),
    { readerModule: "seo" },
  );

  const canonicalFiles = [
    "app/api/research/generate/route.js",
    "app/lib/ai/agents/research/index.js",
    "app/lib/ai/providers/index.js",
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

  console.log(`\nSPRINT A LOCAL INTEGRATION: ${results.length}/${results.length} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT A LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
