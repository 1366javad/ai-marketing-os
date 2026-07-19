const fs = require("node:fs");
const path = require("node:path");

const routeFiles = [
  "app/api/research/generate/route.js",
  "app/api/seo/generate/route.js",
  "app/api/content/generate/route.js",
  "app/api/creative/generate/route.js",
  "app/api/ads/generate/route.js",
  "app/api/analytics/generate/route.js",
  "app/api/video/planning/generate/route.js",
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
  "runVideoPlanning(",
  "runQualityChecks(",
  "writeMemoryEvent(",
  '.from("campaign_memory_events")',
  "createKnowledgeService(",
  "getKnowledgeSlice(",
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
  if (!source.includes("knowledgeOptions:") || !source.includes("knowledgeDiagnostics:")) {
    throw new Error(`${file} does not pass scope or surface Knowledge diagnostics.`);
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
  "retrieveRuntimeKnowledgeSlice(",
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

const knowledgeRetrieverSource = fs.readFileSync(
  path.resolve("app/lib/ai/orchestrator/retrieveRuntimeKnowledgeSlice.js"),
  "utf8",
);
if (!knowledgeRetrieverSource.includes("service.getKnowledgeSlice(")) {
  throw new Error("Orchestrator does not own Runtime Knowledge Slice retrieval.");
}
passed += 1;
console.log("PASS: Orchestrator is the only Runtime caller of Knowledge Slice");

const agentFiles = fs.readdirSync(path.resolve("app/lib/ai/agents"), { recursive: true })
  .filter((file) => /\.js$/.test(file));
const agentKnowledgeDependency = agentFiles.find((file) => {
  const source = fs.readFileSync(path.resolve("app/lib/ai/agents", file), "utf8");
  return source.includes("createKnowledgeService") || source.includes("getKnowledgeSlice(");
});
if (agentKnowledgeDependency) {
  throw new Error(`Agent directly depends on Knowledge Engine: ${agentKnowledgeDependency}`);
}
passed += 1;
console.log("PASS: Agents consume Knowledge only through the approved Brief");

console.log(`\nOrchestrator ownership smoke: ${passed}/${passed} passed.`);
