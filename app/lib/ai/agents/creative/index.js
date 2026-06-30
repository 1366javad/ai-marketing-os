const { runTextProvider } = require("../../providers");
const { runImagePipeline } = require("../../image-pipeline");
const { runVisualDirector } = require("../../visual-director");
const { buildCreativePrompt } = require("./buildCreativePrompt");
const {
  attachCreativeAsset,
  normalizeCreativeOutput,
} = require("./normalizeCreativeOutput");

async function runCreativeAgent({ brief, executionPlan }) {
  const creativeOutput = await runCreativeTextPipeline({ brief, executionPlan });
  return runCreativeImagePipeline({ creativeOutput });
}

async function runCreativeTextPipeline({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("runCreativeTextPipeline: brief is required.");
  }
  if (!executionPlan) {
    throw new Error("runCreativeTextPipeline: executionPlan is required.");
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

  return {
    ...creativeOutput,
    visualDirection,
    specification: visualDirection,
  };
}

async function runCreativeImagePipeline({ creativeOutput }) {
  if (!creativeOutput) {
    throw new Error("runCreativeImagePipeline: creativeOutput is required.");
  }

  const visualDirection =
    creativeOutput.visualDirection || creativeOutput.specification;

  if (!visualDirection) {
    throw new Error("runCreativeImagePipeline: visualDirection is required.");
  }

  const imagePipelineResult = await runImagePipeline({
    visualDirection,
    provider: "openai",
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
      textProvider: creativeOutput.metadata?.textProvider || "unknown",
      imageProvider: creativeOutput.metadata?.imageProvider || "",
      imageFallbackUsed: Boolean(creativeOutput.metadata?.imageFallbackUsed),
      imageFallbackProvider: creativeOutput.metadata?.imageFallbackProvider || "",
      metadata: creativeOutput.metadata || {},
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
      textProvider: creativeOutput.metadata?.textProvider || "unknown",
      imageProvider:
        creativeOutput.asset?.provider ||
        creativeOutput.metadata?.imageProvider ||
        "unknown",
      imageFallbackUsed: Boolean(creativeOutput.metadata?.imageFallbackUsed),
      imageFallbackProvider: creativeOutput.metadata?.imageFallbackProvider || "",
      metadata: creativeOutput.metadata || {},
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
  runCreativeImagePipeline,
  runCreativeTextPipeline,
  buildCreativePrompt,
  normalizeCreativeOutput,
  toCreativeMemoryEvent,
  toImageAssetMemoryEvent,
  formatCreativeMarkdown,
};
