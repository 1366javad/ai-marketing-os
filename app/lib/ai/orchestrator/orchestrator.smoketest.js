/**
 * orchestrator.smoketest.js
 *
 * Verifies:
 *  1. Tool mode plan when no campaignId is given.
 *  2. Campaign mode plan when a valid, active campaign is given.
 *  3. Fallback to tool mode when campaignId points to a non-existent/archived campaign.
 *  4. riskLevel/needsApproval match the ADR-003 floor table per module.
 *  5. The orchestrator truly does zero I/O — it's given mock campaignLookup
 *     data directly, never fetches anything itself.
 *
 * Run: node app/lib/orchestrator/orchestrator.smoketest.js
 */

const { runOrchestrator } = require("./index");

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.log(`  FAIL: ${label}`);
  }
}

function run() {
  // --- Tool mode: no campaignId at all ---
  console.log("\nTool mode — no campaignId");
  const toolPlan = runOrchestrator({
    requestedModule: "content",
    normalizedTask: "write an Instagram caption",
  });
  assert("mode is tool", toolPlan.mode === "tool");
  assert("campaignId is null", toolPlan.campaignId === null);
  assert("needsContext is false", toolPlan.needsContext === false);
  assert("agent is contentAgent", toolPlan.agent === "contentAgent");
  assert("no fallbackReason (nothing to fall back from)", toolPlan.fallbackReason === null);

  // --- Campaign mode: valid, active campaign ---
  console.log("\nCampaign mode — valid active campaign");
  const campaignPlan = runOrchestrator(
    {
      campaignId: "camp_123",
      requestedModule: "seo",
      normalizedTask: "generate keyword list",
    },
    { exists: true, status: "active" }
  );
  assert("mode is campaign", campaignPlan.mode === "campaign");
  assert("campaignId preserved", campaignPlan.campaignId === "camp_123");
  assert("needsContext is true", campaignPlan.needsContext === true);
  assert("riskLevel is low for seo", campaignPlan.riskLevel === "low");
  assert("needsApproval is false for low risk", campaignPlan.needsApproval === false);

  // --- Fallback: campaignId given but campaign doesn't exist ---
  console.log("\nFallback — campaignId not found");
  const fallbackPlan = runOrchestrator(
    {
      campaignId: "camp_does_not_exist",
      requestedModule: "ads",
      normalizedTask: "write ad copy",
    },
    { exists: false }
  );
  assert("falls back to tool mode", fallbackPlan.mode === "tool");
  assert("fallbackReason is populated", typeof fallbackPlan.fallbackReason === "string" && fallbackPlan.fallbackReason.length > 0);
  assert("campaignId nulled out in tool mode", fallbackPlan.campaignId === null);

  // --- Fallback: archived campaign ---
  console.log("\nFallback — archived campaign");
  const archivedPlan = runOrchestrator(
    { campaignId: "camp_old", requestedModule: "research", normalizedTask: "audience research" },
    { exists: true, status: "archived" }
  );
  assert("falls back to tool mode for archived campaign", archivedPlan.mode === "tool");

  // --- Risk floor sanity across all modules ---
  console.log("\nRisk floor — ads is high / needs approval");
  const adsPlan = runOrchestrator(
    { campaignId: "camp_123", requestedModule: "ads", normalizedTask: "write ad copy" },
    { exists: true, status: "active" }
  );
  assert("ads riskLevel is high", adsPlan.riskLevel === "high");
  assert("ads needsApproval is true", adsPlan.needsApproval === true);

  console.log("\nRisk floor — content is medium / needs approval");
  const contentPlan = runOrchestrator(
    { campaignId: "camp_123", requestedModule: "content", normalizedTask: "write blog post" },
    { exists: true, status: "active" }
  );
  assert("content riskLevel is medium", contentPlan.riskLevel === "medium");
  assert("content needsApproval is true", contentPlan.needsApproval === true);

  console.log("\nVideo planning contract - medium / needs approval");
  const videoPlan = runOrchestrator(
    {
      campaignId: "camp_123",
      requestedModule: "video",
      normalizedTask: "video_script",
    },
    { exists: true, status: "active" },
  );
  assert("video riskLevel is medium", videoPlan.riskLevel === "medium");
  assert("video needsApproval is true", videoPlan.needsApproval === true);
  assert("video maps to planning capability", videoPlan.agent === "videoPlanning");

  // --- Missing requestedModule fails loudly, doesn't guess ---
  console.log("\nMissing requestedModule");
  try {
    runOrchestrator({ normalizedTask: "do something" });
    assert("throws instead of guessing a default module", false);
  } catch (err) {
    assert("throws instead of guessing a default module", /requestedModule is required/.test(err.message));
  }

  // --- Confirm orchestrator output is JUST a plan — no nested provider/agent calls happened ---
  console.log("\nPlan shape — orchestrator did not execute anything");
  const planKeys = Object.keys(toolPlan).sort();
  const expectedKeys = ["agent", "campaignId", "fallbackReason", "mode", "module", "needsApproval", "needsContext", "riskLevel", "task"].sort();
  assert("plan has exactly the documented ExecutionPlan shape, nothing extra (no output/result/response fields)", JSON.stringify(planKeys) === JSON.stringify(expectedKeys));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
