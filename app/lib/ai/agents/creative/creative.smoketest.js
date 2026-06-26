const assert = require("node:assert/strict");
const {
  buildCreativePrompt,
  normalizeCreativeOutput,
  toCreativeMemoryEvent,
  toImageAssetMemoryEvent,
} = require("./index");

const brief = {
  task: "image_post",
  campaignName: "AI Marketing OS",
  offer: "AI Marketing OS",
  audience: "B2B marketing teams",
  goal: "lead generation",
  tone: "confident",
  platform: "linkedin",
  visualDirection: "clean campaign operations visual",
};
const executionPlan = {
  mode: "campaign",
  module: "creative",
  task: "image_post",
  campaignId: "camp_123",
};

const prompt = buildCreativePrompt({ brief, executionPlan });
assert.equal(prompt.systemPrompt.includes("Creative Agent V2"), true);
assert.equal(prompt.systemPrompt.includes("provider-neutral"), true);
assert.equal(prompt.systemPrompt.includes('"imagePrompt"'), false);
assert.equal(prompt.systemPrompt.includes('"strategy"'), true);

const output = normalizeCreativeOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      type: "image_post",
      title: "Campaign clarity visual",
      concept:
        "A campaign operations lead moves from fragmented planning to a calm, connected workflow. The creative emphasizes control, speed, and confidence.",
      strategy: {
        campaignType: "LinkedIn image post",
        visualGoal: "Show campaign clarity without rendering software UI",
        marketingAngle: "Replace fragmented execution with one campaign system",
        audienceInsight:
          "Marketing teams feel overwhelmed when campaign work is fragmented.",
        keyMessage: "One campaign system creates clarity and control.",
        desiredResponse: "Feel confident and ready to organize campaign work.",
        brandDirection: "Premium, credible, modern, and calm.",
      },
      caption: "Turn scattered outputs into one campaign system.",
      designDirection: "Premium editorial layout with restrained brand color.",
      visualNotes: [
        "Keep one focal subject",
        "Use physical campaign artifacts",
        "Reserve clean copy space",
      ],
      cta: "Build your campaign system",
      platform: "linkedin",
      tone: "confident",
    }),
  },
  { brief, executionPlan },
);

assert.equal(output.type, "image_post");
assert.equal(output.visualNotes.length, 3);
assert.equal(output.imagePrompt, "");
assert.equal(output.strategy.keyMessage.includes("clarity"), true);
assert.equal(output.visualDirection, null);

const conceptEvent = toCreativeMemoryEvent(output, { brief, executionPlan });
assert.equal(conceptEvent.eventType, "creative_concept");
assert.equal(conceptEvent.payload.strategy.audienceInsight.includes("overwhelmed"), true);
assert.equal("imagePrompt" in conceptEvent.payload, false);

const imageOutput = {
  ...output,
  imagePrompt: "Short provider-aware prompt",
  visualDirection: {
    scene: {
      primarySubject: "A B2B marketing lead",
      action: "organizing printed campaign cards",
      setting: "a clean strategy desk",
    },
    hero: "printed campaign brief",
  },
  asset: { provider: "pollinations", imageUrl: "data:image/jpeg;base64,test" },
  review: { score: 82, passed: true, mode: "heuristic" },
};
const imageEvent = toImageAssetMemoryEvent(imageOutput, {
  brief,
  executionPlan,
});
assert.equal(imageEvent.eventType, "image_asset");
assert.equal(imageEvent.payload.review.score, 82);

console.log("Creative Agent V2 smoketest passed");
