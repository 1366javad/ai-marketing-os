require("dotenv").config({ path: ".env.local", quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { validateInput } = require("../app/lib/ai/input-guard");
const {
  executeCanonicalPipeline,
  executeCreativeImageStage,
  runOrchestrator,
} = require("../app/lib/ai/orchestrator");

const campaignId = "local_sprint_d_campaign";
const storedEvents = [
  event("research_approved", "research", "audience_analysis", "approved"),
  event("blog_approved", "content", "blog_draft", "approved"),
  event("blog_pending", "content", "blog_draft", "pending"),
];
const writtenEvents = [];
const context = {
  campaignId,
  campaignName: "Sprint D Local Integration",
  contextVersion: 4,
  audience: "Small B2B business owners",
  offer: "AI Marketing OS",
  tone: "professional",
  positioning: "The marketing brain of a business",
  platforms: ["Instagram"],
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
    riskLevel: "medium",
    task: artifact,
    summary: `${module} ${artifact}`,
    payload: { title: `${artifact} source`, body: "Approved campaign direction." },
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
  const stored = { ...value, id: `creative_${writtenEvents.length + 1}` };
  writtenEvents.push(stored);
  return stored;
}

async function run() {
  const prompt = "Create a professional Instagram image concept showing coordinated marketing decisions for a small B2B team.";
  const guard = validateInput(prompt);
  verify("Input Guard", guard.status === "valid");

  const executionPlan = runOrchestrator(
    { campaignId, requestedModule: "creative", normalizedTask: "image_post" },
    { exists: true, status: "active" },
  );
  verify("Orchestrator", executionPlan.module === "creative" && executionPlan.mode === "campaign");

  const conceptStage = await executeCanonicalPipeline({
    normalizedPrompt: guard.normalizedPrompt,
    executionPlan,
    contextOptions: {
      contextDbAdapter: async () => context,
      eventsDbAdapter: async () => storedEvents,
    },
    briefExtensions: { platform: "instagram", tone: "professional" },
    memoryOptions: { createdBy: "smoketest", dbAdapter },
  });
  const identities = conceptStage.contextSlice.relevantEvents.map(
    ({ module, artifact }) => `${module}+${artifact}`,
  );
  verify(
    "Context visibility",
    identities.includes("content+blog_draft") &&
      !conceptStage.contextSlice.relevantEvents.some((item) => item.id === "blog_pending"),
    { identities },
  );
  verify(
    "Creative Strategy and Visual Director",
    conceptStage.quality.passed &&
      conceptStage.agentOutput.strategy &&
      conceptStage.agentOutput.visualDirection,
  );

  const imageStage = await executeCreativeImageStage({
    creativeOutput: conceptStage.agentOutput,
    executionPlan,
    brief: conceptStage.brief,
    memoryOptions: { createdBy: "smoketest", dbAdapter },
  });
  const review = imageStage.agentOutput.review;
  verify(
    "Image Reviewer contract",
    Number.isFinite(review?.score) &&
      typeof review?.passed === "boolean" &&
      ["vision", "heuristic"].includes(review?.mode) &&
      review?.checks &&
      Array.isArray(review?.issues) &&
      Array.isArray(review?.limitations) &&
      Boolean(review?.reviewedAt),
    { score: review?.score, mode: review?.mode },
  );
  verify(
    "Independent canonical persistence",
    writtenEvents.length === 2 &&
      writtenEvents[0].module === "creative" &&
      writtenEvents[0].artifact === "creative_concept" &&
      writtenEvents[1].module === "creative" &&
      writtenEvents[1].artifact === "image_asset" &&
      writtenEvents[0].id !== writtenEvents[1].id,
    { artifacts: writtenEvents.map((item) => item.artifact) },
  );
  verify(
    "Quality, Risk, and Memory gates",
    writtenEvents.every(
      (item) =>
        item.riskLevel === "medium" &&
        ["pending", "rejected"].includes(item.approvalStatus),
    ),
  );

  const routeSource = fs.readFileSync(
    path.resolve("app/api/creative/generate/route.js"),
    "utf8",
  );
  verify(
    "No route bypass",
    ![
      "getCampaignContextSlice(",
      "runCreativeTextPipeline(",
      "runCreativeImagePipeline(",
      "runQualityChecks(",
      '.from("campaign_memory_events")',
    ].some((value) => routeSource.includes(value)),
  );
  verify(
    "No Legacy execution",
    !Object.keys(require.cache).some((file) =>
      file.replaceAll("\\", "/").includes("/app/lib/ai/legacy/agents/creative/"),
    ),
  );

  console.log(`\nSPRINT D LOCAL INTEGRATION: ${passed}/${passed} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT D LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
