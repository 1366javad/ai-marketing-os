/**
 * brief-builder.smoketest.js
 *
 * Tests three core scenarios from the architecture discussion:
 *   1. Tool Mode — "Summer Sale" (signal-only, no context)
 *   2. Campaign Mode — "Generate Instagram ad" (enriched from context)
 *   3. SEO module — tone is null (Matrix gives SEO no tone field)
 *
 * Run: node app/lib/brief-builder/brief-builder.smoketest.js
 */

const { buildBrief } = require("./index");

let passed = 0, failed = 0;
function assert(label, condition) {
  if (condition) { passed++; console.log(`  PASS: ${label}`); }
  else { failed++; console.log(`  FAIL: ${label}`); }
}

// --- Scenario 1: Tool Mode — "Summer Sale" ---
console.log("\nScenario 1 — Tool Mode: 'Summer Sale'");
const toolPlan = { mode: "tool", module: "content", task: "ad_copy", campaignId: null, riskLevel: "medium", needsContext: false, needsApproval: true, agent: "contentAgent", fallbackReason: null };
const toolBrief = buildBrief("Summer Sale discount offer limited time", toolPlan, null);

assert("mode is tool", toolBrief.mode === "tool");
assert("campaignId is null", toolBrief.campaignId === null);
assert("signal extracts campaignType: promotion", toolBrief.campaignType === "promotion");
assert("signal extracts goal: sales", toolBrief.goal === "sales");
assert("signal extracts tone: urgent", toolBrief.tone === "urgent");
assert("industry is null (no signal, no context)", toolBrief.industry === null);
assert("audience is null (no signal extractor in v1)", toolBrief.audience === null);
assert("confidence is low (mostly null fields)", toolBrief.confidence <= 0.5);

// --- Scenario 2: Campaign Mode — "Generate Instagram ad" with rich context ---
console.log("\nScenario 2 — Campaign Mode: context wins over signals");
const campaignPlan = { mode: "campaign", module: "ads", task: "ad_copy", campaignId: "camp_123", riskLevel: "high", needsContext: true, needsApproval: true, agent: "adsAgent", fallbackReason: null };
const contextSlice = {
  context: {
    audience: "International Students 18-24",
    offer: "1:1 application coaching",
    positioning: "The coach that actually answers your questions",
    valueProposition: "Personal guidance, not generic templates",
    platforms: ["Instagram", "TikTok"],
  },
  relevantEvents: [],
  contextVersion: 3,
};
const campaignBrief = buildBrief("Generate Instagram ad for lead generation", campaignPlan, contextSlice);

assert("mode is campaign", campaignBrief.mode === "campaign");
assert("campaignId preserved", campaignBrief.campaignId === "camp_123");
assert("audience comes from context (not guessed)", campaignBrief.audience === "International Students 18-24");
assert("offer comes from context", campaignBrief.offer === "1:1 application coaching");
assert("platforms: context ['Instagram','TikTok'] union signal ['instagram']", 
  campaignBrief.platforms && campaignBrief.platforms.includes("Instagram") && campaignBrief.platforms.includes("TikTok"));
assert("goal extracted from prompt signal (not in context)", campaignBrief.goal === "lead_generation");
assert("confidence is high (context filled key fields)", campaignBrief.confidence >= 0.5);

// --- Scenario 3: SEO module — tone is null (Matrix gives SEO no tone field) ---
console.log("\nScenario 3 — SEO module: tone must be null");
const seoPlan = { mode: "campaign", module: "seo", task: "keyword_research", campaignId: "camp_123", riskLevel: "low", needsContext: true, needsApproval: false, agent: "seoAgent", fallbackReason: null };
// Context slice for SEO: only fields SEO is allowed to see per Matrix
// (goal, audience, offer, competitors, industry) — tone is NOT included
const seoContextSlice = {
  context: {
    goal: "Lead generation",
    audience: "International Students 18-24",
    offer: "1:1 application coaching",
    competitors: ["Shorelight", "Studocu"],
    industry: "EdTech",
    // tone intentionally absent — getCampaignContextSlice would not include it for SEO
  },
  relevantEvents: [],
  contextVersion: 3,
};
const seoBrief = buildBrief("generate keyword ideas for QuestApply", seoPlan, seoContextSlice);

assert("SEO brief: industry from context", seoBrief.industry === "EdTech");
assert("SEO brief: audience from context", seoBrief.audience === "International Students 18-24");
assert("SEO brief: tone is null — SEO Matrix gives no tone field", seoBrief.tone === null);
assert("SEO brief: positioning is null — not in SEO's context slice", seoBrief.positioning === null);
assert("SEO brief: competitors from context", Array.isArray(seoBrief.competitors) && seoBrief.competitors.includes("Shorelight"));

// --- Contract: throws on missing required args ---
console.log("\nContract enforcement");
try { buildBrief("", campaignPlan, null); assert("throws on empty prompt", false); }
catch (e) { assert("throws on empty prompt", /normalizedPrompt is required/.test(e.message)); }

try { buildBrief("some text", null, null); assert("throws on missing executionPlan", false); }
catch (e) { assert("throws on missing executionPlan", /executionPlan is required/.test(e.message)); }

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
