const ADS_TASKS = Object.freeze({
  google_ads: {
    label: "Google Ads",
    platform: "google",
    focus: [
      "responsive search ad headlines",
      "90-character descriptions",
      "sitelinks and callouts",
      "high-intent keyword alignment",
    ],
  },
  meta_ads: {
    label: "Meta Ads",
    platform: "facebook",
    focus: [
      "scroll-stopping primary text",
      "clear headline and CTA",
      "creative angles",
      "audience and offer fit",
    ],
  },
  linkedin_ads: {
    label: "LinkedIn Ads",
    platform: "linkedin",
    focus: [
      "professional value proposition",
      "role-aware messaging",
      "sponsored content copy",
      "credible business CTA",
    ],
  },
  tiktok_ads: {
    label: "TikTok Ads",
    platform: "tiktok",
    focus: [
      "fast hooks",
      "native short-form language",
      "script ideas",
      "direct response CTA",
    ],
  },
  campaign_package: {
    label: "Campaign Package",
    platform: "multi-platform",
    focus: [
      "cross-platform message system",
      "channel-specific adaptations",
      "consistent offer framing",
      "launch recommendations",
    ],
  },
});

const TASK_ALIASES = Object.freeze({
  google: "google_ads",
  google_ads: "google_ads",
  meta: "meta_ads",
  facebook: "meta_ads",
  meta_ads: "meta_ads",
  linkedin: "linkedin_ads",
  linkedin_ads: "linkedin_ads",
  tiktok: "tiktok_ads",
  tiktok_ads: "tiktok_ads",
  package: "campaign_package",
  campaign: "campaign_package",
  campaign_package: "campaign_package",
});

function buildAdsPrompt({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("buildAdsPrompt: brief is required.");
  }

  const taskKey = normalizeAdsTask(brief.task || executionPlan?.task);
  const task = ADS_TASKS[taskKey] || ADS_TASKS.google_ads;
  const relevantEvents = Array.isArray(brief.relevantEvents)
    ? brief.relevantEvents
    : [];

  const systemPrompt = [
    "You are Ads Agent V2 for AI Marketing OS.",
    "You create campaign-specific advertising copy, not generic templates.",
    "Use only the supplied campaign context and approved memory.",
    "Do not invent product claims, guarantees, prices, or performance results.",
    "Respect the selected platform's format and character constraints.",
    "Return only valid JSON.",
    "",
    "Return JSON with this exact shape:",
    JSON.stringify({
      type: taskKey,
      title: "",
      summary: "",
      headlines: [""],
      primaryTexts: [""],
      descriptions: [""],
      ctas: [""],
      extensions: [""],
      hooks: [""],
      scriptIdeas: [""],
      recommendations: [""],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    }),
  ].join("\n");

  const userPrompt = [
    `Ads task: ${task.label}`,
    `Platform: ${task.platform}`,
    "",
    "Campaign context:",
    `- Campaign: ${brief.campaignName || "Not specified"}`,
    `- Goal: ${brief.goal || "Not specified"}`,
    `- Audience: ${brief.audience || "Not specified"}`,
    `- Offer: ${brief.offer || "Not specified"}`,
    `- Positioning: ${brief.positioning || "Not specified"}`,
    `- Value proposition: ${brief.valueProposition || "Not specified"}`,
    `- Budget: ${brief.budget || "Not specified"}`,
    brief.normalizedPrompt
      ? `- Additional direction: ${brief.normalizedPrompt}`
      : "",
    relevantEvents.length
      ? `\nApproved campaign memory:\n${formatRelevantEvents(relevantEvents)}`
      : "\nApproved campaign memory: none yet.",
    "",
    "Task-specific focus:",
    ...task.focus.map((item) => `- ${item}`),
    "",
    "Minimum output depth:",
    "- 5 headlines",
    "- 3 primary text or body variants",
    "- 3 descriptions",
    "- 3 CTAs",
    "- 3 actionable recommendations",
    "- Include extensions for Google Ads.",
    "- Include hooks and script ideas for TikTok Ads.",
    "- For Campaign Package, provide useful variants across all four platforms.",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}

function normalizeAdsTask(task) {
  const key = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return TASK_ALIASES[key] || "google_ads";
}

function formatRelevantEvents(events) {
  return events
    .slice(0, 8)
    .map(
      (event) =>
        `- ${event.module}/${event.artifact || event.type}: ${event.summary}`,
    )
    .join("\n");
}

module.exports = {
  ADS_TASKS,
  TASK_ALIASES,
  buildAdsPrompt,
  normalizeAdsTask,
};
