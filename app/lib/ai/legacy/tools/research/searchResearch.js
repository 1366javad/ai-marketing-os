import { runGemini } from "../../providers/gemini";
import {
  buildMarketingBrief,
  buildMarketingStrategy,
  buildResearchPrompt,
  checkMarketingOutput,
  formatMarketingOutput,
} from "../../marketing";

const SECTION_PROMPTS = {
  market: `
Generate a detailed Market Research report.

Include:
- Market size
- Market growth
- Industry overview
- Key insights
`,

  competitor: `
Generate a Competitor Analysis.

Include:
- Main competitors
- Strengths
- Weaknesses
- Positioning
`,

  audience: `
Generate an Audience Analysis.

Include:
- Demographics
- Psychographics
- Motivations
- Buying behavior
`,

  trends: `
Generate a Trend Analysis.

Include:
- Current trends
- Emerging trends
- Opportunities
- Threats
`,

  painpoints: `
Generate a Pain Point Analysis.

Include:
- Main customer problems
- Frustrations
- Objections
- Risks
`,

  opportunities: `
Generate an Opportunity Analysis.

Include:
- Market gaps
- Growth opportunities
- Differentiation ideas
- Strategic recommendations
`,
};

export async function generateResearchTool({ campaign, section }) {
  const briefResult = buildMarketingBrief({
    prompt: campaign?.name || "",
    module: "research",
    campaign,
    overrides: {
      industry: campaign?.industry,
      offer: campaign?.product_name || campaign?.name,
      audience: campaign?.target_audience,
      valueProposition: campaign?.brand_description,
    },
  });
  const strategy = buildMarketingStrategy({
    brief: briefResult.brief,
    module: "research",
    mode: section,
  });
  const { systemPrompt, userPrompt } = buildResearchPrompt({
    campaign,
    section,
    brief: briefResult.brief,
    strategy,
    sectionInstructions: SECTION_PROMPTS[section] || "",
  });

  const result = await runGemini({
    systemPrompt,
    userPrompt,
  });

  const quality = checkMarketingOutput({
    module: "research",
    output: result.text,
    brief: briefResult.brief,
    strategy,
  });
  const formatted = formatMarketingOutput({
    module: "research",
    output: result.text,
    title: section,
    type: section,
    brief: briefResult.brief,
    strategy,
    quality,
  });

  return {
    title: formatted.title,
    type: formatted.type,
    prompt: userPrompt,
    content: formatted.content,
    quality,
    metadata: formatted.metadata,
  };
}
