require("dotenv").config({ path: ".env.local", quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { validateInput } = require("../app/lib/ai/input-guard");
const {
  executeCanonicalPipeline,
  runOrchestrator,
} = require("../app/lib/ai/orchestrator");

const campaignId = "local_sprint_e_campaign";
const storedEvents = [
  event("research_audience", "research", "audience_analysis", "approved"),
  event("seo_strategy", "seo", "seo_strategy", "approved"),
  event("creative_concept", "creative", "creative_concept", "approved"),
  event("image_approved", "creative", "image_asset", "approved"),
  event("image_pending", "creative", "image_asset", "pending"),
  event("blog_approved", "content", "blog_draft", "approved"),
];
const writtenEvents = [];
const context = {
  campaignId,
  campaignName: "Sprint E Local Integration",
  contextVersion: 5,
  audience: "Small B2B business owners",
  offer: "AI Marketing OS",
  positioning: "The marketing brain of a business",
  valueProposition: "Coordinate marketing decisions across specialized agents",
  platforms: ["google"],
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
    riskLevel: artifact === "seo_strategy" ? "high" : "medium",
    task: artifact,
    summary: `${module} ${artifact}`,
    payload: { body: "Approved strategic campaign direction." },
    supersedes: null,
    createdAt: `2026-07-17T00:00:0${id.length % 10}Z`,
    createdBy: "local-integration-smoketest",
  };
}

function verify(name, condition, details = {}) {
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
  passed += 1;
  console.log(`PASS: ${name}`, details);
}

async function dbAdapter(value) {
  const stored = { ...value, id: `ads_${writtenEvents.length + 1}` };
  writtenEvents.push(stored);
  return stored;
}

async function run() {
  const prompt =
    "Create a Google search advertising campaign for AI Marketing OS aimed at small B2B business owners, with clear calls to action.";
  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid");

  const executionPlan = runOrchestrator(
    { campaignId, requestedModule: "ads", normalizedTask: "google_ads" },
    { exists: true, status: "active" },
  );
  verify(
    "Orchestrator",
    executionPlan.module === "ads" &&
      executionPlan.mode === "campaign" &&
      executionPlan.riskLevel === "high",
  );

  const pipeline = await executeCanonicalPipeline({
    normalizedPrompt: guard.normalizedPrompt,
    executionPlan,
    contextOptions: {
      contextDbAdapter: async () => context,
      eventsDbAdapter: async () => storedEvents,
    },
    briefExtensions: { platforms: ["google"], budget: "$2,000/month" },
    memoryOptions: { createdBy: "smoketest", dbAdapter },
  });
  const identities = pipeline.contextSlice.relevantEvents.map(
    ({ module, artifact }) => `${module}+${artifact}`,
  );
  verify(
    "Bounded Ads Context",
    identities.includes("seo+seo_strategy") &&
      identities.includes("creative+creative_concept") &&
      identities.includes("creative+image_asset") &&
      !identities.includes("content+blog_draft") &&
      !pipeline.contextSlice.relevantEvents.some((item) => item.id === "image_pending"),
    { identities },
  );
  verify(
    "Ads Agent and real provider",
    pipeline.quality.passed &&
      pipeline.agentOutput.metadata?.provider &&
      pipeline.agentOutput.headlines.length >= 5,
    {
      provider: pipeline.agentOutput.metadata?.provider,
      headlines: pipeline.agentOutput.headlines.length,
      primaryTexts: pipeline.agentOutput.primaryTexts.length,
      descriptions: pipeline.agentOutput.descriptions.length,
      ctas: pipeline.agentOutput.ctas.length,
      qualityPassed: pipeline.quality.passed,
      qualityIssues: pipeline.quality.issues,
    },
  );
  verify(
    "Canonical ad_copy persistence",
    writtenEvents.length === 1 &&
      writtenEvents[0].module === "ads" &&
      writtenEvents[0].artifact === "ad_copy" &&
      writtenEvents[0].approvalStatus === "pending" &&
      writtenEvents[0].riskLevel === "high",
  );
  verify(
    "Hard approval gate",
    pipeline.riskGate.blocked === true &&
      pipeline.riskGate.publishable === false &&
      pipeline.riskGate.requiresExplicitApproval === true,
    pipeline.riskGate,
  );

  const routeSource = fs.readFileSync(
    path.resolve("app/api/ads/generate/route.js"),
    "utf8",
  );
  verify(
    "No route bypass",
    ![
      "getCampaignContextSlice(",
      "buildBrief(",
      "runAdsAgent(",
      "runQualityChecks(",
      '.from("campaign_memory_events")',
    ].some((value) => routeSource.includes(value)),
  );
  verify(
    "No Legacy execution",
    !Object.keys(require.cache).some((file) =>
      file.replaceAll("\\", "/").includes("/app/lib/ai/legacy/agents/ads/"),
    ),
  );

  console.log(`\nSPRINT E LOCAL INTEGRATION: ${passed}/${passed} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT E LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
