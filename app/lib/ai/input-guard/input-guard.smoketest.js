/**
 * input-guard.smoketest.js
 *
 * Verifies Rules 1-5, and critically: the worked example from the discussion
 * where the SAME raw input ("QuestApply") produces different results depending
 * on the execution plan's mode/task — this is the core of the task-aware upgrade.
 *
 * Run: node app/lib/input-guard/input-guard.smoketest.js
 */

const { validateInput } = require("./index");

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
  // --- Rule 1: Gibberish ---
  console.log("\nRule 1 — Gibberish");
  const r1 = validateInput("%%##@@@3322");
  assert('"%%##@@@3322" → invalid', r1.status === "invalid");
  assert("reason is gibberish", r1.reason === "gibberish");

  const malformedContentPrompt = validateInput("Create $%6^ for my post blog");
  assert(
    '"Create $%6^ for my post blog" → invalid before Brief Builder',
    malformedContentPrompt.status === "invalid"
  );
  assert(
    "malformed content prompt reason is semantic",
    malformedContentPrompt.reason === "malformed_without_subject"
  );

  // --- Rule 2: Empty ---
  console.log("\nRule 2 — Empty");
  const r2 = validateInput("");
  assert('"" → invalid', r2.status === "invalid");
  assert("reason is empty_input", r2.reason === "empty_input");

  const r2b = validateInput("   ");
  assert("whitespace-only → invalid", r2b.status === "invalid");

  // --- Rule 3: Too short (no execution plan = old generic behavior) ---
  console.log("\nRule 3 — Too short, no plan (generic fallback)");
  const r3 = validateInput("a");
  assert('"a" with no plan → needs_clarification', r3.status === "needs_clarification");

  // --- Rule 4: Generic off-topic ---
  console.log("\nRule 4 — Generic off-topic question");
  const r4 = validateInput("What is the capital of France?");
  assert('"capital of France" → blocked', r4.status === "blocked");
  assert("reason is off_topic", r4.reason === "off_topic");

  // --- THE KEY EXAMPLE: "QuestApply" — same text, different plan, different result ---
  console.log("\nTask-aware core example — 'QuestApply'");

  const blogPlan = { mode: "campaign", module: "content", task: "blog_post" };
  const questApplyAsBlogTask = validateInput("QuestApply", blogPlan);
  assert(
    '"QuestApply" for a blog_post task → needs_clarification (too vague for THIS task)... ' +
      "BUT campaign mode softens it per Rule 5",
    questApplyAsBlogTask.status === "valid" && questApplyAsBlogTask.reason === "short_input_accepted_in_campaign_mode"
  );

  const genericOnlyCampaignPrompt = validateInput("Create blog post content", blogPlan);
  assert(
    "generic generation words only → needs_clarification even in campaign mode",
    genericOnlyCampaignPrompt.status === "needs_clarification"
  );

  const toolBlogPlan = { mode: "tool", module: "content", task: "blog_post" };
  const questApplyToolMode = validateInput("QuestApply", toolBlogPlan);
  assert(
    '"QuestApply" for blog_post task in TOOL mode (no campaign leniency) → needs_clarification',
    toolBlogMode_isNeedsClarification(questApplyToolMode)
  );

  const namePlan = { mode: "campaign", module: "research", task: "campaign_name" };
  const questApplyAsName = validateInput("QuestApply", namePlan);
  assert(
    '"QuestApply" for a campaign_name task → valid (short input is fine for this task type)',
    questApplyAsName.status === "valid"
  );

  function toolBlogMode_isNeedsClarification(result) {
    return result.status === "needs_clarification";
  }

  // --- Rule 5: Campaign mode softening does NOT bypass gibberish/off-topic ---
  console.log("\nRule 5 — campaign mode does not soften structural problems");
  const gibberishInCampaignMode = validateInput("%%##@@@3322", { mode: "campaign", module: "content", task: "blog_post" });
  assert("gibberish stays invalid even in campaign mode", gibberishInCampaignMode.status === "invalid");

  const offTopicInCampaignMode = validateInput("What is the capital of France?", { mode: "campaign", module: "content", task: "blog_post" });
  assert("off-topic stays blocked even in campaign mode", offTopicInCampaignMode.status === "blocked");

  // --- Valid, normal-length marketing input ---
  console.log("\nNormal valid input");
  const validInput = validateInput("Create an Instagram campaign for QuestApply targeting international students.");
  assert("normal descriptive input → valid", validInput.status === "valid");
  assert("normalizedPrompt is populated for valid input", validInput.normalizedPrompt.length > 0);
  assert("normalizedPrompt is empty for non-valid statuses", r1.normalizedPrompt === "" && r4.normalizedPrompt === "");

  // --- Spam pattern ---
  console.log("\nSpam pattern");
  const spamInput = validateInput("buy buy buy buy buy buy buy buy now now now");
  assert("repeated-word spam → invalid", spamInput.status === "invalid");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
