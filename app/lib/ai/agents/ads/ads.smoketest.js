const assert = require("node:assert/strict");
const {
  buildAdsPrompt,
  normalizeAdsOutput,
  toAdsMemoryEvent,
} = require("./index");

const brief = {
  campaignName: "QuestApply Launch",
  task: "google_ads",
  goal: "Generate qualified applications",
  audience: "International students",
  offer: "AI-assisted graduate application platform",
  positioning: "Reduce application overwhelm",
  valueProposition: "Organize every application step",
  budget: "$2,000/month",
  normalizedPrompt: "Focus on high-intent applicants.",
  relevantEvents: [],
};
const executionPlan = {
  module: "ads",
  task: "google_ads",
  riskLevel: "high",
  needsApproval: true,
};
const prompts = buildAdsPrompt({ brief, executionPlan });

assert.match(prompts.userPrompt, /International students/);
assert.match(prompts.userPrompt, /responsive search ad headlines/);

const output = normalizeAdsOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      type: "google_ads",
      title: "QuestApply Google Ads",
      summary: "High-intent search campaign for international applicants.",
      headlines: [
        "Plan Your Grad Application",
        "Apply With More Clarity",
        "Your Application OS",
        "Organize Every Deadline",
        "Start Your Grad Journey",
      ],
      primaryTexts: [
        "Organize deadlines, documents, and next steps in one place.",
        "Move from application overwhelm to a clear plan.",
        "Build your graduate application with confidence.",
      ],
      descriptions: [
        "Keep every graduate application deadline and task organized.",
        "Create a clearer path from school search to submission.",
        "Start organizing your graduate application today.",
      ],
      ctas: ["Get Started", "Learn More", "Start Your Plan"],
      extensions: ["Application Planner", "Deadline Tracker", "School Search"],
      recommendations: [
        "Separate brand and non-brand campaigns.",
        "Test deadline-focused landing pages.",
        "Review search terms weekly.",
      ],
    }),
  },
  { brief },
);

assert.equal(output.headlines.length, 5);
assert.equal(output.recommendations.length, 3);

const memoryEvent = toAdsMemoryEvent(output, { brief, executionPlan });
assert.equal(memoryEvent.eventType, "ad_copy");
assert.equal(memoryEvent.suggestedRiskLevel, "high");
assert.ok(memoryEvent.payload.headline);
assert.ok(memoryEvent.payload.body);
assert.ok(memoryEvent.payload.cta);

console.log("Ads Agent V2 smoketest passed");
