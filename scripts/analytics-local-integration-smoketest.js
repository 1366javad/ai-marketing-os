require("dotenv").config({ path: ".env.local", quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { validateInput } = require("../app/lib/ai/input-guard");
const {
  executeCanonicalPipeline,
  runOrchestrator,
} = require("../app/lib/ai/orchestrator");

const campaignId = "local_sprint_f_campaign";
const context = {
  campaignId,
  campaignName: "Sprint F Local Integration",
  contextVersion: 6,
  industry: "B2B SaaS",
  offer: "AI Marketing OS",
  goal: "Generate qualified product demos",
  audience: "Small B2B business owners",
  positioning: "The marketing brain of a business",
  valueProposition: "Coordinate marketing decisions across specialized agents",
  tone: "clear and professional",
  platforms: ["LinkedIn", "Google"],
  competitors: ["Jasper", "HubSpot"],
  status: "active",
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-18T00:00:00Z",
};
const storedEvents = [
  event("research", "research", "audience_analysis", "approved", "low"),
  event("seo", "seo", "seo_strategy", "approved", "high"),
  event("content", "content", "blog_draft", "approved", "medium"),
  event("creative", "creative", "creative_concept", "approved", "medium"),
  event("ads", "ads", "ad_copy", "approved", "high"),
  event("pending", "creative", "image_asset", "pending", "medium"),
  event("rejected", "content", "email_draft", "rejected", "medium"),
];
const writtenEvents = [];
let passed = 0;

function event(id, module, artifact, approvalStatus, riskLevel) {
  return {
    id,
    campaignId,
    module,
    artifact,
    type: artifact,
    approvalStatus,
    confidence: 0.9,
    riskLevel,
    task: artifact,
    summary: `${module} ${artifact} approved campaign evidence`,
    payload: { body: "Campaign-specific evidence for Analytics evaluation." },
    supersedes: null,
    createdAt: `2026-07-18T00:00:0${id.length % 10}Z`,
    createdBy: "local-integration-smoketest",
  };
}

function verify(name, condition, details = {}) {
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  passed += 1;
  console.log(`PASS: ${name}`, details);
}

async function dbAdapter(value) {
  const stored = { ...value, id: `analytics_${writtenEvents.length + 1}` };
  writtenEvents.push(stored);
  return stored;
}

async function run() {
  const prompt =
    "Evaluate this campaign's approved intelligence and identify evidence-based learning, risks, and next recommendations without initiating any action.";
  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid");

  const executionPlan = runOrchestrator(
    { campaignId, requestedModule: "analytics", normalizedTask: "evaluate_campaign" },
    { exists: true, status: "active" },
  );
  verify(
    "Orchestrator",
    executionPlan.module === "analytics" &&
      executionPlan.mode === "campaign" &&
      executionPlan.riskLevel === "low",
  );

  const pipeline = await executeCanonicalPipeline({
    normalizedPrompt: guard.normalizedPrompt,
    executionPlan,
    contextOptions: {
      contextDbAdapter: async () => context,
      eventsDbAdapter: async () => storedEvents,
    },
    memoryOptions: { createdBy: "smoketest", dbAdapter },
  });
  const identities = pipeline.contextSlice.relevantEvents.map(
    ({ module, artifact }) => `${module}+${artifact}`,
  );
  verify(
    "Full Context Object exception",
    Object.keys(pipeline.contextSlice.context).length === Object.keys(context).length &&
      pipeline.contextSlice.context.competitors[0] === "Jasper" &&
      pipeline.contextSlice.context.createdAt === context.createdAt,
  );
  verify(
    "All approved event types and approval filtering",
    identities.length === 5 &&
      identities.includes("research+audience_analysis") &&
      identities.includes("seo+seo_strategy") &&
      identities.includes("content+blog_draft") &&
      identities.includes("creative+creative_concept") &&
      identities.includes("ads+ad_copy") &&
      !pipeline.contextSlice.relevantEvents.some((item) => item.id === "pending") &&
      !pipeline.contextSlice.relevantEvents.some((item) => item.id === "rejected"),
    { identities },
  );
  verify(
    "Analytics Agent and real provider",
    pipeline.quality.passed &&
      pipeline.agentOutput.metadata?.provider &&
      pipeline.agentOutput.insight.length >= 80,
    {
      provider: pipeline.agentOutput.metadata?.provider,
      quality: pipeline.quality,
    },
  );
  verify(
    "campaign_learning Memory Write",
    writtenEvents.length === 1 &&
      writtenEvents[0].module === "analytics" &&
      writtenEvents[0].artifact === "campaign_learning" &&
      writtenEvents[0].approvalStatus === "auto_saved" &&
      writtenEvents[0].riskLevel === "low",
  );
  verify(
    "No Learning propagation or Agent Loop",
    !pipeline.agentOutput.actions &&
      !pipeline.agentOutput.agentLoop &&
      !pipeline.agentOutput.learningPropagation,
  );

  const routeSource = fs.readFileSync(
    path.resolve("app/api/analytics/generate/route.js"),
    "utf8",
  );
  verify(
    "No route bypass",
    ![
      "getCampaignContextSlice(",
      "buildBrief(",
      "runAnalyticsAgent(",
      "runQualityChecks(",
      '.from("campaign_memory_events")',
    ].some((value) => routeSource.includes(value)),
  );
  verify(
    "No Legacy Analytics execution",
    !Object.keys(require.cache).some((file) =>
      file.replaceAll("\\", "/").includes("/app/lib/ai/legacy/agents/analytics/"),
    ),
  );

  console.log(`\nSPRINT F LOCAL INTEGRATION: ${passed}/${passed} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT F LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
