require("dotenv").config({ path: ".env.local", quiet: true });

const fs = require("node:fs");
const path = require("node:path");
const { validateInput } = require("../app/lib/ai/input-guard");
const {
  executeCanonicalPipeline,
  runOrchestrator,
} = require("../app/lib/ai/orchestrator");
const {
  ACTIVE_VIDEO_TASKS,
  normalizeVideoTask,
} = require("../app/lib/ai/agents/video");

const campaignId = "local_sprint_g_campaign";
const context = {
  campaignId,
  campaignName: "Sprint G Local Integration",
  contextVersion: 7,
  audience: "Small B2B business owners",
  offer: "AI Marketing OS",
  tone: "professional",
  positioning: "The marketing brain of a business",
  platforms: ["Instagram"],
  status: "active",
};
const storedEvents = [
  event("blog", "content", "blog_draft", "approved"),
  event("email", "content", "email_draft", "auto_saved"),
  event("creative", "creative", "creative_concept", "approved"),
  event("image", "creative", "image_asset", "approved"),
  event("pending", "creative", "image_asset", "pending"),
  event("research", "research", "audience_analysis", "approved"),
];
const writtenEvents = [];
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
    summary: `${module} ${artifact} campaign direction`,
    payload: { body: "Approved campaign-specific planning evidence." },
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
  const stored = { ...value, id: `video_${writtenEvents.length + 1}` };
  writtenEvents.push(stored);
  return stored;
}

async function executeTask(task) {
  const prompt = `Create a campaign-specific ${task.replace(/_/g, " ")} for AI Marketing OS with five scenes and a clear get started CTA.`;
  const guard = validateInput(prompt);
  verify(`${task} Input Guard`, guard.status === "valid");
  const executionPlan = runOrchestrator(
    { campaignId, requestedModule: "video", normalizedTask: task },
    { exists: true, status: "active" },
  );
  verify(
    `${task} Orchestrator`,
    executionPlan.module === "video" &&
      executionPlan.mode === "campaign" &&
      executionPlan.riskLevel === "medium",
  );
  return executeCanonicalPipeline({
    normalizedPrompt: guard.normalizedPrompt,
    executionPlan,
    contextOptions: {
      contextDbAdapter: async () => context,
      eventsDbAdapter: async () => storedEvents,
    },
    briefExtensions: {
      campaignName: context.campaignName,
      platform: "Instagram",
      duration: "30 seconds",
      cta: "Get started",
    },
    memoryOptions: { createdBy: "smoketest", dbAdapter },
  });
}

async function run() {
  const scriptStage = await executeTask("video_script");
  const identities = scriptStage.contextSlice.relevantEvents.map(
    ({ module, artifact }) => `${module}+${artifact}`,
  );
  verify(
    "Approved bounded Video Context",
    identities.length === 4 &&
      identities.includes("content+blog_draft") &&
      identities.includes("content+email_draft") &&
      identities.includes("creative+creative_concept") &&
      identities.includes("creative+image_asset") &&
      !scriptStage.contextSlice.relevantEvents.some((item) => item.id === "pending") &&
      !identities.includes("research+audience_analysis"),
    { identities },
  );
  verify(
    "video_script Agent, Quality, and Risk",
    scriptStage.quality.passed &&
      scriptStage.quality.riskLevel === "medium" &&
      scriptStage.quality.approvalRequired === true &&
      scriptStage.agentOutput.metadata?.provider &&
      scriptStage.agentOutput.scenes.length >= 5,
    { provider: scriptStage.agentOutput.metadata?.provider },
  );

  const storyboardStage = await executeTask("storyboard");
  verify(
    "storyboard Agent, Quality, and Risk",
    storyboardStage.quality.passed &&
      storyboardStage.quality.riskLevel === "medium" &&
      storyboardStage.quality.approvalRequired === true &&
      storyboardStage.agentOutput.metadata?.provider &&
      storyboardStage.agentOutput.scenes.length >= 5,
    { provider: storyboardStage.agentOutput.metadata?.provider },
  );
  verify(
    "Separate canonical Memory Events",
    writtenEvents.length === 2 &&
      writtenEvents[0].module === "video" &&
      writtenEvents[0].artifact === "video_script" &&
      writtenEvents[0].approvalStatus === "pending" &&
      writtenEvents[1].module === "video" &&
      writtenEvents[1].artifact === "storyboard" &&
      writtenEvents[1].approvalStatus === "pending" &&
      writtenEvents[0].id !== writtenEvents[1].id,
    { artifacts: writtenEvents.map((item) => item.artifact) },
  );
  verify(
    "Phase 2 tasks remain unavailable",
    !ACTIVE_VIDEO_TASKS.has(normalizeVideoTask("reel_package")) &&
      !ACTIVE_VIDEO_TASKS.has(normalizeVideoTask("tiktok_video")) &&
      !ACTIVE_VIDEO_TASKS.has(normalizeVideoTask("youtube_short")) &&
      !ACTIVE_VIDEO_TASKS.has(normalizeVideoTask("campaign_package")),
  );

  const routeSource = fs.readFileSync(
    path.resolve("app/api/video/planning/generate/route.js"),
    "utf8",
  );
  verify(
    "No Planning Route bypass",
    ![
      "getCampaignContextSlice(",
      "buildBrief(",
      "runVideoPlanning(",
      "runQualityChecks(",
      '.from("campaign_memory_events")',
    ].some((value) => routeSource.includes(value)),
  );
  verify(
    "Legacy final-video routes retained and excluded",
    [
      "app/api/video/generate/route.js",
      "app/api/video/pollinations/generate/route.js",
      "app/api/video/script/generate/route.js",
    ].every((file) => fs.existsSync(path.resolve(file))) &&
      !Object.keys(require.cache).some((file) =>
        file.replaceAll("\\", "/").includes("/app/lib/ai/legacy/agents/video/"),
      ),
  );

  console.log(`\nSPRINT G LOCAL INTEGRATION: ${passed}/${passed} PASSED`);
}

run().catch((error) => {
  console.error("SPRINT G LOCAL INTEGRATION: FAILED");
  console.error(error);
  process.exitCode = 1;
});
