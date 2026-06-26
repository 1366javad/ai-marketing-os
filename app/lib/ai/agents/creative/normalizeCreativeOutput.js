const {
  CREATIVE_TASKS,
  normalizeCreativeTask,
} = require("./buildCreativePrompt");
const { getProviderMetadata } = require("../../providers/providerMetadata");

function normalizeCreativeOutput(providerResult, { brief } = {}) {
  const text = providerResult?.text || "";
  const parsed = parseJsonFromText(text);
  const task = normalizeCreativeTask(brief?.task);
  const expectedType = CREATIVE_TASKS[task]?.type || "image_post";
  const concept = sanitizeString(parsed?.concept) || buildConceptFallback(text);
  const strategy = normalizeCreativeStrategy(parsed?.strategy || parsed, {
    brief,
    concept,
  });
  const visualNotes = normalizeStringList(
    parsed?.visualNotes || parsed?.visual_notes,
  );

  return {
    type: normalizeType(parsed?.type, expectedType),
    title: sanitizeString(parsed?.title) || buildFallbackTitle({ task, brief }),
    concept,
    strategy,
    specification: null,
    visualDirection: null,
    caption: sanitizeString(parsed?.caption),
    designDirection: sanitizeString(
      parsed?.designDirection || parsed?.design_direction,
    ),
    visualNotes,
    cta: sanitizeString(parsed?.cta) || "Learn more",
    platform: sanitizeString(parsed?.platform) || brief?.platform || "instagram",
    tone: sanitizeString(parsed?.tone) || brief?.tone || "professional",
    imagePrompt: "",
    asset: null,
    review: null,
    metadata: {
      ...getProviderMetadata(providerResult),
      provider: providerResult?.provider || "unknown",
      warning: providerResult?.warning || "",
      lowConfidenceProvider:
        providerResult?.lowConfidenceProvider ||
        providerResult?.provider === "pollinations",
      confidence: normalizeConfidence({ concept, strategy, visualNotes }),
      generatedAt: new Date().toISOString(),
    },
  };
}

function normalizeCreativeStrategy(value, { brief, concept }) {
  const source = value && typeof value === "object" ? value : {};

  return {
    campaignType:
      sanitizeString(source.campaignType || source.campaign_type) ||
      brief?.platform ||
      "campaign creative",
    visualGoal:
      sanitizeString(source.visualGoal || source.visual_goal) ||
      brief?.goal ||
      "Communicate the campaign value clearly",
    marketingAngle:
      sanitizeString(source.marketingAngle || source.marketing_angle) ||
      concept,
    audienceInsight:
      sanitizeString(source.audienceInsight || source.audience_insight) ||
      `${brief?.audience || "The audience"} needs a clearer path to the campaign goal.`,
    keyMessage:
      sanitizeString(source.keyMessage || source.key_message) ||
      concept,
    desiredResponse:
      sanitizeString(source.desiredResponse || source.desired_response) ||
      `Feel confident and take the next step toward ${brief?.goal || "the goal"}.`,
    brandDirection:
      sanitizeString(source.brandDirection || source.brand_direction) ||
      `${brief?.tone || "professional"}, clear, credible, and campaign-specific`,
  };
}

function attachCreativeAsset(creativeOutput, imagePipelineResult) {
  if (!imagePipelineResult) return creativeOutput;

  const providerPrompt = imagePipelineResult.prompt || null;
  const asset = imagePipelineResult.asset || null;

  return {
    ...creativeOutput,
    imagePrompt: providerPrompt?.text || "",
    visualDirection: imagePipelineResult.visualDirection || null,
    specification: imagePipelineResult.visualDirection || null,
    asset,
    review: imagePipelineResult.review || null,
    metadata: {
      ...creativeOutput.metadata,
      imageProvider: imagePipelineResult.provider || "",
      imagePromptVersion: providerPrompt?.version || "",
      imageAttempts: imagePipelineResult.attempts || 1,
      creativeImageDebug: {
        visualDirection: imagePipelineResult.visualDirection || null,
        providerPrompt,
        imageUrl: asset?.remoteUrl || asset?.imageUrl || "",
        review: imagePipelineResult.review || null,
      },
    },
  };
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stringifyCreativeItem(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function stringifyCreativeItem(item) {
  if (typeof item === "string") return item.trim();
  if (item == null) return "";
  if (typeof item !== "object") return String(item).trim();
  return Object.values(item)
    .flatMap((value) =>
      Array.isArray(value)
        ? value.map(stringifyCreativeItem)
        : stringifyCreativeItem(value),
    )
    .filter(Boolean)
    .join(" - ");
}

function normalizeConfidence({ concept, strategy, visualNotes }) {
  const checks = [
    concept.length >= 80,
    strategy.visualGoal.length >= 20,
    strategy.audienceInsight.length >= 20,
    strategy.keyMessage.length >= 20,
    strategy.desiredResponse.length >= 20,
    visualNotes.length >= 3,
  ];
  return Number((checks.filter(Boolean).length / checks.length).toFixed(2));
}

function parseJsonFromText(text) {
  if (!text || typeof text !== "string") return {};
  const trimmed = text.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    extractJsonObject(trimmed),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return {};
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start, end + 1);
}

function sanitizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildConceptFallback(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 500);
}

function buildFallbackTitle({ task, brief }) {
  const offer = brief?.offer || "Campaign";
  const label = CREATIVE_TASKS[task]?.label || "Creative";
  return `${offer} ${label}`;
}

function normalizeType(value, fallbackType) {
  const type = sanitizeString(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return type || fallbackType;
}

module.exports = {
  attachCreativeAsset,
  normalizeCreativeOutput,
  normalizeCreativeStrategy,
  stringifyCreativeItem,
};
