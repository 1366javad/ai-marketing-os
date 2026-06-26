const { runTextProvider } = require("../../providers");
const { runImagePipeline } = require("../../image-pipeline");
const { runVisualDirector } = require("../../visual-director");
const { buildCreativePrompt } = require("./buildCreativePrompt");
const {
  attachCreativeAsset,
  normalizeCreativeOutput,
} = require("./normalizeCreativeOutput");

async function runCreativeAgent({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("runCreativeAgent: brief is required.");
  }
  if (!executionPlan) {
    throw new Error("runCreativeAgent: executionPlan is required.");
  }

  const { systemPrompt, userPrompt } = buildCreativePrompt({
    brief,
    executionPlan,
  });

  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.65,
  });

  const creativeOutput = normalizeCreativeOutput(providerResult, {
    brief,
    executionPlan,
  });
  const visualDirection = await runVisualDirector({
    creativeStrategy: creativeOutput,
    brief,
  });
  const imagePipelineResult = await runImagePipeline({
    visualDirection,
    provider: "pollinations",
    width: 1024,
    height: 1024,
  });
  logCreativeImageDebug({
    visualDirection,
    providerPrompt: imagePipelineResult.prompt,
    imageUrl:
      imagePipelineResult.asset?.remoteUrl ||
      imagePipelineResult.asset?.imageUrl ||
      "",
  });

  return attachCreativeAsset(creativeOutput, imagePipelineResult);
}

function toCreativeMemoryEvent(creativeOutput, { brief, executionPlan }) {
  return {
    eventType: "creative_concept",
    module: "creative",
    artifact: "creative_concept",
    summary: creativeOutput.concept,
    payload: {
      type: creativeOutput.type,
      title: creativeOutput.title,
      concept: creativeOutput.concept,
      strategy: creativeOutput.strategy,
      visualDirection: creativeOutput.visualDirection,
      caption: creativeOutput.caption,
      designDirection: creativeOutput.designDirection,
      visualNotes: creativeOutput.visualNotes,
      cta: creativeOutput.cta,
      platform: creativeOutput.platform,
      tone: creativeOutput.tone,
      task: brief?.task || executionPlan?.task || creativeOutput.type,
      confidence: creativeOutput.metadata?.confidence || 0,
      provider: creativeOutput.metadata?.provider || "unknown",
      generatedAt: creativeOutput.metadata?.generatedAt || "",
    },
    suggestedRiskLevel: "medium",
  };
}

function toImageAssetMemoryEvent(creativeOutput, { brief, executionPlan }) {
  return {
    eventType: "image_asset",
    module: "creative",
    artifact: "image_asset",
    summary: `${creativeOutput.title} generated image`,
    payload: {
      type: creativeOutput.type,
      title: creativeOutput.title,
      imagePrompt: creativeOutput.imagePrompt,
      providerPrompt: creativeOutput.metadata?.creativeImageDebug?.providerPrompt,
      imageUrl:
        creativeOutput.asset?.remoteUrl ||
        creativeOutput.metadata?.creativeImageDebug?.imageUrl ||
        "",
      strategy: creativeOutput.strategy,
      visualDirection: creativeOutput.visualDirection,
      asset: creativeOutput.asset,
      review: creativeOutput.review,
      task: brief?.task || executionPlan?.task || creativeOutput.type,
      provider: creativeOutput.asset?.provider || "unknown",
      generatedAt: creativeOutput.metadata?.generatedAt || "",
    },
    suggestedRiskLevel: "medium",
  };
}

function logCreativeImageDebug({ visualDirection, providerPrompt, imageUrl }) {
  console.info("Creative image generation debug:", {
    visualDirection,
    providerPrompt,
    imageUrl,
  });
}

function formatCreativeMarkdown(creativeOutput) {
  const strategy = creativeOutput.strategy || {};
  const direction = creativeOutput.visualDirection || {};
  const scene = direction.scene || {};
  return [
    `# ${creativeOutput.title}`,
    "",
    "## Concept",
    creativeOutput.concept,
    "",
    "## Visual Goal",
    strategy.visualGoal,
    "",
    "## Marketing Angle",
    strategy.marketingAngle,
    "",
    "## Hero",
    direction.hero,
    "",
    "## Subject",
    scene.primarySubject,
    "",
    "## Action",
    scene.action,
    "",
    "## Environment",
    scene.setting,
    "",
    "## Mood",
    direction.mood,
    "",
    "## Lighting",
    [direction.lighting?.type, direction.lighting?.accent]
      .filter(Boolean)
      .join(" / "),
    "",
    "## Camera",
    [
      direction.camera?.angle,
      direction.camera?.shot,
      direction.camera?.focus,
    ]
      .filter(Boolean)
      .join(" / "),
    "",
    "## Image Prompt",
    creativeOutput.imagePrompt,
    "",
    "## Caption",
    creativeOutput.caption,
    "",
    "## Design Direction",
    creativeOutput.designDirection,
    "",
    "## Visual Notes",
    ...creativeOutput.visualNotes.map((item) => `- ${item}`),
    "",
    "## CTA",
    creativeOutput.cta,
    "",
    "## Image Review",
    creativeOutput.review?.mode === "heuristic"
      ? "Heuristic Review"
      : "Review unavailable",
    `Mode: ${creativeOutput.review?.mode || "not reviewed"}`,
  ]
    .join("\n")
    .trim();
}

module.exports = {
  runCreativeAgent,
  buildCreativePrompt,
  normalizeCreativeOutput,
  toCreativeMemoryEvent,
  toImageAssetMemoryEvent,
  formatCreativeMarkdown,
};
