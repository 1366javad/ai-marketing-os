const { buildContentStrategy } = require("./buildContentStrategy");

const TASK_LABELS = Object.freeze({
  blog_post: "blog post",
  email: "email",
  newsletter: "newsletter",
  landing_page: "landing page copy",
  case_study: "case study",
  linkedin_post: "LinkedIn post",
  instagram_caption: "Instagram caption",
});

function buildContentPrompt({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("buildContentPrompt: brief is required.");
  }

  const taskLabel = TASK_LABELS[brief.task] || brief.task || "content";
  const strategy = buildContentStrategy(brief);
  const relevantEvents = Array.isArray(brief.relevantEvents)
    ? brief.relevantEvents
    : [];

  const systemPrompt = [
    "You are Content Agent V2 for AI Marketing OS.",
    "Create practical marketing content from a structured MarketingBrief and the task-specific Content Strategy.",
    "Different content types must produce fundamentally different structures.",
    "Blog posts are educational articles, not landing pages, emails, or ad copy.",
    "Never ignore the user task. Do not invent fake links, buttons, or unsupported claims.",
    "Return only valid JSON. Do not return markdown outside JSON.",
    "Return exactly the task-specific JSON shape below:",
    JSON.stringify(strategy.outputShape),
  ].join("\n");

  const userPrompt = [
    `Task: ${taskLabel}`,
    `Content format: ${strategy.format}`,
    `Content intent: ${strategy.intent}`,
    `Approximate length: ${strategy.approximateLength}`,
    `CTA style: ${strategy.ctaStyle}`,
    `Mode: ${executionPlan?.mode || brief.mode || "tool"}`,
    `Offer: ${brief.offer || "Not specified"}`,
    `Audience: ${brief.audience || "Not specified"}`,
    `Goal: ${brief.goal || "Not specified"}`,
    `Tone: ${brief.tone || "professional"}`,
    `Industry: ${brief.industry || "Not specified"}`,
    `Positioning: ${brief.positioning || "Not specified"}`,
    `Value proposition: ${brief.valueProposition || "Not specified"}`,
    `CTA preference: ${brief.cta || "clear next step"}`,
    `Platforms: ${Array.isArray(brief.platforms) ? brief.platforms.join(", ") : "Not specified"}`,
    `Optional user direction: ${brief.normalizedPrompt || "None. Build from Campaign Context and Approved Memory."}`,
    relevantEvents.length
      ? `Approved context signals:\n${formatRelevantEvents(relevantEvents)}`
      : "Approved context signals: none",
    "",
    "Required content structure:",
    ...strategy.structure.map((item) => `- ${item}`),
    "",
    "Avoid:",
    ...strategy.avoid.map((item) => `- ${item}`),
    "",
    "Quality rules:",
    "- Make the content specific to the offer and audience.",
    "- Match the content structure to the selected content type.",
    "- Populate every required field in the task-specific JSON shape.",
    "- Blog posts must use named sections with descriptive H2 headings. Never use generic headings such as '1)', '2)', or 'Step 1' unless the topic explicitly requires a numbered process.",
    "- Keep internal writing instructions out of the user-facing output.",
    "- Include a CTA with the requested CTA style, not a generic hard sell.",
    "- Keep the structure readable with short sections.",
    "- Do not collapse every content type into the same promotional template.",
  ].join("\n");

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

module.exports = { buildContentPrompt };
