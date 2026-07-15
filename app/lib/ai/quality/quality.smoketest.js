/**
 * quality.smoketest.js
 *
 * Tests four scenarios:
 *   1. Valid ad_copy — passes all checks, high risk, approval required
 *   2. ad_copy with missing headline — fails required fields
 *   3. ad_copy with no CTA — fails CTA check
 *   4. blog_draft with placeholder text — fails generic check
 *   5. Twitter ad over char limit — fails platform fit
 *   6. research_insight — passes, low risk, no approval needed
 *   7. unknown event type — throws loudly
 *
 * Run: node app/lib/quality/quality.smoketest.js
 */

const { runQualityChecks } = require("./index");

let passed = 0, failed = 0;
function assert(label, condition) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else           { failed++; console.log(`  FAIL: ${label}`); }
}

const basePlan = { mode: "campaign", module: "ads", task: "ad_copy", campaignId: "camp_123", riskLevel: "high", needsContext: true, needsApproval: true, agent: "adsAgent" };
const baseBrief = { module: "ads", platforms: ["Instagram"], goal: "lead_generation", audience: "International Students" };

// --- 1. Valid ad_copy ---
console.log("\n1. Valid ad_copy");
const validAd = {
  eventType: "ad_copy",
  module: "ads",
  artifact: "ad_copy",
  summary: "Instagram ad for QuestApply targeting international students",
  payload: {
    headline: "Your Visa Journey Starts Here",
    body: "Confused about the application process? QuestApply connects you with a personal coach who has helped 500+ students. Get answers, not templates.",
    cta: "Apply Now",
  },
};
const r1 = runQualityChecks(validAd, basePlan, baseBrief);
assert("passes all checks", r1.passed === true);
assert("riskLevel is high (ad_copy floor)", r1.riskLevel === "high");
assert("approvalRequired is true", r1.approvalRequired === true);
assert("no issues", r1.issues.length === 0);
assert("score is 1.0", r1.score === 1.0);

// --- 2. Missing required field ---
console.log("\n2. ad_copy missing headline");
const missingHeadline = {
  eventType: "ad_copy",
  module: "ads",
  artifact: "ad_copy",
  summary: "An ad",
  payload: { body: "Some body text with a clear call to action. Sign up now!", cta: "Sign up" },
};
const r2 = runQualityChecks(missingHeadline, basePlan, baseBrief);
assert("fails (missing headline)", r2.passed === false);
assert("issue mentions missing field", r2.issues.some((i) => i.includes("headline")));
assert("score is below 1.0", r2.score < 1.0);
assert("recommendations present", r2.recommendations.length > 0);

// --- 3. No CTA in ad_copy ---
console.log("\n3. ad_copy with no CTA");
const noCta = {
  eventType: "ad_copy",
  module: "ads",
  artifact: "ad_copy",
  summary: "An ad with no call to action",
  payload: {
    headline: "Great Product Available",
    body: "This is a long enough body text about our amazing product for international students who want guidance.",
  },
};
const r3 = runQualityChecks(noCta, basePlan, baseBrief);
assert("fails (no CTA)", r3.passed === false);
assert("issue mentions CTA", r3.issues.some((i) => /cta/i.test(i)));

// --- 4. Placeholder text in blog_draft ---
console.log("\n4. blog_draft with placeholder text");
const contentPlan = { ...basePlan, module: "content", task: "blog_post", riskLevel: "medium", agent: "contentAgent" };
const contentBrief = { ...baseBrief, module: "content", platforms: [] };
const placeholder = {
  eventType: "blog_draft",
  module: "content",
  artifact: "blog_draft",
  summary: "A blog post",
  payload: {
    title: "Your Complete Guide",
    body: "[Insert your content here] Lorem ipsum dolor sit amet. Add your main points and conclusion. This is placeholder text for the body of the blog post that needs to be written by the content team.",
  },
};
const r4 = runQualityChecks(placeholder, contentPlan, contentBrief);
assert("generic check detects placeholder", !r4.passed || r4.warnings.length > 0 || r4.issues.length > 0);
assert("riskLevel is medium (blog_draft floor)", r4.riskLevel === "medium");

// --- 5. Twitter ad over character limit ---
console.log("\n5. Twitter ad over char limit");
const twitterBrief = { ...baseBrief, platforms: ["Twitter"] };
const longTwitterAd = {
  eventType: "ad_copy",
  module: "ads",
  artifact: "ad_copy",
  summary: "Twitter ad",
  payload: {
    headline: "Short",
    body: "A".repeat(300),
    cta: "Sign up now",
  },
};
const r5 = runQualityChecks(longTwitterAd, basePlan, twitterBrief);
assert("platform fit fails for Twitter body > 280 chars", !r5.passed || r5.warnings.some((w) => /twitter/i.test(w)));

// --- 6. research_insight — low risk, no approval ---
console.log("\n6. research_insight — low risk");
const researchPlan = { ...basePlan, module: "research", task: "audience_research", riskLevel: "low", needsApproval: false, agent: "researchAgent" };
const researchBrief = { ...baseBrief, module: "research", platforms: [] };
const insight = {
  eventType: "research_insight",
  module: "research",
  artifact: "audience_analysis",
  summary: "Key audience insight: international students struggle most with document preparation and understanding admission timelines for North American universities.",
  payload: {
    summary: "International students struggle most with document preparation and understanding admission timelines for North American universities.",
    insights: [
      "Document preparation is a major source of anxiety before submission.",
      "Timeline uncertainty can delay decisions and reduce application confidence.",
      "Students value guidance that connects program fit with readiness.",
    ],
    recommendations: [
      "Create messaging that focuses on application confidence and clarity.",
      "Separate guidance by stage: discovery, fit, documents, and submission.",
      "Use educational research outputs to support later content and SEO work.",
    ],
  },
};
const r6 = runQualityChecks(insight, researchPlan, researchBrief);
assert("research_insight passes", r6.passed === true);
assert("riskLevel is low", r6.riskLevel === "low");
assert("approvalRequired is false", r6.approvalRequired === false);

// --- 7. Unknown event type throws ---
console.log("\n7. Unknown event type — must throw");
try {
  runQualityChecks({ eventType: "magic_output", summary: "x", payload: {} }, basePlan, baseBrief);
  assert("throws on unknown event type", false);
} catch (e) {
  assert("throws on unknown event type", /no risk floor defined/.test(e.message));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
