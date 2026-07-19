const CREATIVE_TASKS = Object.freeze({
  image_post: {
    label: "Image Post",
    type: "image_post",
    focus: ["single image concept", "caption", "CTA", "platform fit"],
  },
  carousel: {
    label: "Carousel",
    type: "carousel",
    focus: ["slide sequence", "message hierarchy", "visual rhythm", "CTA"],
  },
  ad_creative: {
    label: "Ad Creative",
    type: "ad_creative",
    focus: ["conversion hook", "offer framing", "visual contrast", "CTA"],
  },
  banner: {
    label: "Banner",
    type: "banner",
    focus: ["headline", "supporting message", "layout", "CTA"],
  },
  product_mockup: {
    label: "Product Mockup",
    type: "product_mockup",
    focus: ["product presentation", "environment", "use case", "brand polish"],
  },
  campaign_package: {
    label: "Campaign Package",
    type: "campaign_package",
    focus: ["multi-asset direction", "channel fit", "message system", "asset list"],
  },
});

const TASK_ALIASES = Object.freeze({
  image: "image_post",
  post: "image_post",
  image_post: "image_post",
  carousel: "carousel",
  ad: "ad_creative",
  ad_creative: "ad_creative",
  banner: "banner",
  product: "product_mockup",
  product_mockup: "product_mockup",
  package: "campaign_package",
  campaign_package: "campaign_package",
});

function buildCreativePrompt({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("buildCreativePrompt: brief is required.");
  }

  const taskKey = normalizeCreativeTask(brief.task || executionPlan?.task);
  const task = CREATIVE_TASKS[taskKey] || CREATIVE_TASKS.image_post;
  const relevantEvents = Array.isArray(brief.relevantEvents)
    ? brief.relevantEvents
    : [];

  const systemPrompt = [
    "You are Creative Agent V2 for AI Marketing OS.",
    "You create provider-neutral Creative Strategy.",
    "You do not direct scenes, choose props, write image prompts, or call image providers.",
    "Define the campaign idea, message, audience insight, desired response, and brand direction.",
    "",
    "Rules:",
    "- Produce one clear creative concept for the selected task.",
    "- Return a structured strategy, never scene directions or image prompts.",
    "- Do not invent unsupported product features.",
    "- Return only valid JSON.",
    "",
    "Return JSON with this exact shape:",
    JSON.stringify({
      type: task.type,
      title: "",
      concept: "",
      strategy: {
        campaignType: "",
        visualGoal: "",
        marketingAngle: "",
        audienceInsight: "",
        keyMessage: "",
        desiredResponse: "",
        brandDirection: "",
      },
      caption: "",
      designDirection: "",
      visualNotes: [""],
      cta: "",
      platform: "",
      tone: "",
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    }),
  ].join("\n");

  const userPrompt = [
    `Creative task: ${task.label}`,
    `Output type: ${task.type}`,
    "",
    "Campaign context:",
    `- Campaign: ${brief.campaignName || "Not specified"}`,
    `- Offer: ${brief.offer || "Not specified"}`,
    `- Audience: ${brief.audience || "Not specified"}`,
    `- Goal: ${brief.goal || "Not specified"}`,
    `- Positioning: ${brief.positioning || brief.valueProposition || "Not specified"}`,
    `- Tone: ${brief.tone || "professional"}`,
    `- Platform: ${brief.platform || "instagram"}`,
    brief.visualDirection
      ? `- Visual direction: ${brief.visualDirection}`
      : "",
    brief.normalizedPrompt
      ? `\nAdditional direction from user: ${brief.normalizedPrompt}`
      : "",
    relevantEvents.length
      ? `\nApproved campaign memory:\n${formatRelevantEvents(relevantEvents)}`
      : "\nApproved campaign memory: none yet.",
    brief.knowledgeEnabled
      ? `\nApproved durable business knowledge:\n${brief.knowledgeContext}`
      : "",
    "",
    "Task-specific focus:",
    ...task.focus.map((item) => `- ${item}`),
    "",
    "Output requirements:",
    "- concept: 2-4 sentences explaining the creative idea.",
    "- strategy.visualGoal: the single communication outcome.",
    "- strategy.marketingAngle: the campaign promise or contrast.",
    "- strategy.audienceInsight: the audience tension or motivation.",
    "- strategy.keyMessage: the one message the asset must communicate.",
    "- strategy.desiredResponse: what the viewer should feel or do.",
    "- strategy.brandDirection: brand character without scene or camera instructions.",
    "- designDirection: visual style, composition, color, hierarchy, and asset format.",
    "- visualNotes: 4-7 concrete notes a designer could act on.",
    "- caption and CTA must fit the selected platform and campaign.",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}

function formatRelevantEvents(events) {
  return events
    .slice(0, 6)
    .map(
      (event) =>
        `- ${event.module}/${event.artifact || event.type}: ${event.summary}`,
    )
    .join("\n");
}

function normalizeCreativeTask(task) {
  const key = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return TASK_ALIASES[key] || "image_post";
}

module.exports = {
  buildCreativePrompt,
  normalizeCreativeTask,
  CREATIVE_TASKS,
  TASK_ALIASES,
};
