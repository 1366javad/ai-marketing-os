const assert = require("node:assert/strict");
const { runQualityChecks } = require("../../quality");
const {
  normalizeVideoPlanningOutput,
  toVideoMemoryEvent,
} = require("./index");

const output = normalizeVideoPlanningOutput(
  {
    provider: "smoke",
    text: JSON.stringify({
      title: "QuestApply Video Script",
      summary: "A short campaign video that turns application overwhelm into clarity.",
      hook: "Still tracking applications across five different tools?",
      scenes: Array.from({ length: 5 }, (_, index) => ({
        scene: index + 1,
        duration: "5 seconds",
        visual: `Campaign-specific visual direction for scene ${index + 1}.`,
        voiceover: `Voiceover line for scene ${index + 1}.`,
        onScreenText: `Scene ${index + 1}`,
      })),
      cta: "Get started with QuestApply.",
    }),
  },
  {
    brief: {
      task: "video_script",
      campaignName: "QuestApply",
      cta: "Get started",
    },
    task: "video_script",
  },
);
const event = toVideoMemoryEvent(output);
const plan = {
  module: "video",
  task: "video_script",
  riskLevel: "medium",
  needsApproval: true,
};
const quality = runQualityChecks(event, plan, {
  platforms: ["instagram"],
});

assert.equal(output.scenes.length, 5);
assert.equal(event.eventType, "video_script");
assert.equal(quality.passed, true);
assert.equal(quality.riskLevel, "medium");
assert.equal(quality.approvalRequired, true);
console.log("Video planning contract smoketest passed");
