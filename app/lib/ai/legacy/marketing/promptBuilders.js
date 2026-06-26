const MODULE_PERSONAS = {
  creative: "You are a senior social media creative strategist.",
  content: "You are a senior marketing strategist and copywriter.",
  seo: "You are a senior SEO strategist.",
  ads: "You are a senior performance marketing copywriter.",
  research: "You are an expert market research analyst.",
};

const MARKDOWN_OUTPUT_RULES = `
Return clean Markdown only.
Use headings, bullet points, short paragraphs, and clear spacing.
Do not return HTML.
Do not wrap the response inside code blocks.
Do not explain what you are doing.
Output only the final content.
`;

const JSON_OUTPUT_RULES = `
Return valid JSON only.
Do not use markdown fences.
Do not include commentary outside JSON.
`;

export function buildModulePrompt({
  module,
  mode = "",
  prompt = "",
  campaign = null,
  plan = null,
  item = null,
  section = "",
  platform = "",
  brief = null,
  strategy = null,
  schema = "",
  sectionInstructions = "",
}) {
  if (module === "creative") {
    return buildCreativePrompt({
      mode,
      prompt,
      platform,
      brief,
      strategy,
      schema,
    });
  }

  if (module === "content") {
    return buildContentPrompt({
      campaign,
      plan,
      item,
      prompt,
      brief,
      strategy,
    });
  }

  if (module === "seo") {
    return buildSeoPrompt({
      campaign,
      section,
      brief,
      strategy,
      sectionInstructions,
    });
  }

  if (module === "research") {
    return buildResearchPrompt({
      campaign,
      section,
      brief,
      strategy,
      sectionInstructions,
    });
  }

  if (module === "ads") {
    return buildAdsPrompt({
      campaign,
      plan,
      item,
      brief,
      strategy,
      platform,
    });
  }

  throw new Error(`Unknown prompt module: ${module}`);
}

export function buildCreativePrompt({
  mode,
  prompt,
  platform,
  brief,
  strategy,
  schema,
}) {
  return {
    systemPrompt: `
${MODULE_PERSONAS.creative}

Create ready-to-use marketing creative assets.
${JSON_OUTPUT_RULES}
`,
    userPrompt: `
Mode:
${mode}

Platform:
${platform}

User Request:
${prompt}

${buildMarketingContext({ brief, strategy })}

Return JSON in this exact shape:
${schema}

Guidelines:
- Keep copy concise and conversion-focused.
- Use the canonical brief for audience, offer, CTA, tone, and positioning.
- Follow the marketing strategy for framework, hook style, funnel stage, and success criteria.
- Image prompts must be visual, specific, and suitable for image generation.
- Use modern marketing visuals, clear composition, and platform-friendly framing.
`,
  };
}

export function buildContentPrompt({
  campaign,
  plan,
  item,
  prompt,
  brief,
  strategy,
}) {
  return {
    systemPrompt: `
${MODULE_PERSONAS.content}

Write professional, high-converting marketing content.
Be persuasive, clear, actionable, and conversion-focused.
${MARKDOWN_OUTPUT_RULES}
The content should be ready to publish with minimal editing.
`,
    userPrompt: `
Campaign Name:
${campaign?.name || ""}

Content Type:
${item?.type || ""}

Title:
${item?.title || ""}

Core Message:
${prompt || plan?.strategy?.coreMessage || ""}

${buildMarketingContext({ brief, strategy })}

Please generate the content.

CTA rules:
- Do not add a generic CTA such as "Learn more" unless the user explicitly asked for a CTA or provided a destination.
- Do not create fake links, fake buttons, or standalone action text.
- If no CTA is provided, end with a useful conclusion instead of a clickable action.
`,
  };
}

export function buildSeoPrompt({
  campaign,
  section,
  brief,
  strategy,
  sectionInstructions,
}) {
  return {
    systemPrompt: `
${MODULE_PERSONAS.seo}
${MARKDOWN_OUTPUT_RULES}
`,
    userPrompt: `
Campaign Name:
${campaign?.name || ""}

Product:
${campaign?.product_name || ""}

SEO Section:
${section || ""}

${buildMarketingContext({ brief, strategy })}

${sectionInstructions || ""}
`,
  };
}

export function buildResearchPrompt({
  campaign,
  section,
  brief,
  strategy,
  sectionInstructions,
}) {
  return {
    systemPrompt: `
${MODULE_PERSONAS.research}
${MARKDOWN_OUTPUT_RULES}
`,
    userPrompt: `
Campaign Name:
${campaign?.name || ""}

Research Section:
${section || ""}

${buildMarketingContext({ brief, strategy })}

${sectionInstructions || ""}
`,
  };
}

export function buildAdsPrompt({
  campaign,
  plan,
  item,
  brief,
  strategy,
  platform,
}) {
  return {
    systemPrompt: `
${MODULE_PERSONAS.ads}

Generate conversion-ready ad copy.
${JSON_OUTPUT_RULES}
`,
    userPrompt: `
Campaign Name:
${campaign?.name || ""}

Platform:
${platform || item?.platform || ""}

Goal:
${item?.goal || plan?.goal || ""}

${buildMarketingContext({ brief, strategy })}

Return concise ad copy with headlines, descriptions, and CTAs.
`,
  };
}

function buildMarketingContext({ brief, strategy }) {
  return `
Canonical Marketing Brief:
${brief ? JSON.stringify(brief, null, 2) : "Not provided"}

Marketing Strategy:
${strategy ? JSON.stringify(strategy, null, 2) : "Not provided"}
`;
}
