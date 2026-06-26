const { runTextProvider } = require("../../providers");
const { buildContentPrompt } = require("./buildContentPrompt");
const { buildContentStrategy } = require("./buildContentStrategy");
const { normalizeContentOutput } = require("./normalizeContentOutput");

async function runContentAgent({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("runContentAgent: brief is required.");
  }
  if (!executionPlan) {
    throw new Error("runContentAgent: executionPlan is required.");
  }

  const { systemPrompt, userPrompt } = buildContentPrompt({
    brief,
    executionPlan,
  });

  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.65,
    maxTokens: 2400,
  });

  return normalizeContentOutput(providerResult, { brief, executionPlan });
}

function toContentMemoryEvent(contentOutput, { brief, executionPlan }) {
  const eventType = resolveContentEventType(contentOutput.type);
  const artifact = resolveContentArtifact(contentOutput.type);
  const bodyKey = eventType === "email_draft" ? "body" : "body";

  return {
    eventType,
    module: "content",
    artifact,
    summary: `${contentOutput.title} (${contentOutput.type})`,
    payload: {
      type: contentOutput.type,
      title: contentOutput.title,
      subject: contentOutput.title,
      [bodyKey]: contentOutput.content,
      cta: contentOutput.cta,
      structured: contentOutput.structured || {},
      wordCount: contentOutput.metadata?.wordCount || 0,
      task: brief?.task || executionPlan?.task || contentOutput.type,
    },
    suggestedRiskLevel: "medium",
  };
}

function resolveContentEventType(type) {
  if (type === "email" || type === "newsletter") {
    return "email_draft";
  }

  return "blog_draft";
}

function resolveContentArtifact(type) {
  const normalized = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map = {
    blog: "blog_post",
    blog_post: "blog_post",
    email: "email",
    newsletter: "newsletter",
    landing: "landing_page",
    landing_page: "landing_page",
    case_study: "case_study",
    linkedin: "linkedin_post",
    linkedin_post: "linkedin_post",
    instagram: "instagram_caption",
    instagram_caption: "instagram_caption",
  };

  return map[normalized] || normalized || "blog_post";
}

module.exports = {
  runContentAgent,
  buildContentPrompt,
  buildContentStrategy,
  normalizeContentOutput,
  toContentMemoryEvent,
  resolveContentEventType,
  resolveContentArtifact,
};
