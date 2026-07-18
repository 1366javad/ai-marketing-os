const fs = require("node:fs");
const path = require("node:path");

const routeFiles = [
  "app/api/research/generate/route.js",
  "app/api/seo/generate/route.js",
  "app/api/content/generate/route.js",
  "app/api/creative/generate/route.js",
  "app/api/ads/generate/route.js",
  "app/api/analytics/generate/route.js",
];
const forbiddenDirectCalls = [
  "getCampaignContextSlice(",
  "buildBrief(",
  "runResearchAgent(",
  "runSeoAgent(",
  "runContentAgent(",
  "runCreativeTextPipeline(",
  "runCreativeImagePipeline(",
  "runAdsAgent(",
  "runAnalyticsAgent(",
  "runQualityChecks(",
  "writeMemoryEvent(",
  '.from("campaign_memory_events")',
];

let passed = 0;

for (const file of routeFiles) {
  const source = fs.readFileSync(path.resolve(file), "utf8");
  const directCall = forbiddenDirectCalls.find((value) => source.includes(value));
  if (directCall) {
    throw new Error(`${file} directly calls ${directCall}`);
  }
  if (!source.includes("executeCanonicalPipeline(")) {
    throw new Error(`${file} does not delegate to executeCanonicalPipeline().`);
  }
  passed += 1;
  console.log(`PASS: ${file} delegates canonical execution to OrchestratorService`);
}

const creativeRoute = fs.readFileSync(
  path.resolve("app/api/creative/generate/route.js"),
  "utf8",
);
if (!creativeRoute.includes("executeCreativeImageStage(")) {
  throw new Error("Creative background image stage is not owned by OrchestratorService.");
}
passed += 1;
console.log("PASS: Creative background image delegates to OrchestratorService");

const orchestratorSource = fs.readFileSync(
  path.resolve("app/lib/ai/orchestrator/executeCanonicalPipeline.js"),
  "utf8",
);
for (const requiredCall of [
  "getCampaignContextSlice(",
  "buildBrief(",
  "agentDefinition.run(",
  "runQualityChecks(",
  "writeMemoryEvent(",
]) {
  if (!orchestratorSource.includes(requiredCall)) {
    throw new Error(`OrchestratorService is missing ${requiredCall}`);
  }
}
passed += 1;
console.log("PASS: OrchestratorService owns every canonical pipeline stage");

console.log(`\nOrchestrator ownership smoke: ${passed}/${passed} passed.`);
