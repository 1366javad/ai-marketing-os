import { runGemini } from "../../providers/gemini";
import {
  buildMarketingBrief,
  buildMarketingStrategy,
  buildSeoPrompt,
  checkMarketingOutput,
  formatMarketingOutput,
} from "../../marketing";

const SECTION_PROMPTS = {
  keywords: `
Generate Keyword Research.

Include:
- Primary keywords
- Secondary keywords
- Long-tail keywords
- Search intent
`,

  clusters: `
Generate Keyword Clusters.

Group keywords by:
- Topic
- Intent
- Funnel stage
`,

  topics: `
Generate Topic Clusters.

Include:
- Pillar pages
- Supporting content
- Internal linking ideas
`,

  strategy: `
Generate an SEO Strategy.

Include:
- Quick wins
- Medium-term actions
- Long-term actions
- Priorities
`,

  meta: `
Generate SEO Meta Content.

Include:
- Meta titles
- Meta descriptions
- CTR optimization ideas
`,

  faq: `
Generate SEO FAQs.

Include:
- Common questions
- Search intent
- Featured snippet opportunities
`,
};

export async function searchSeoTool({ campaign, section }) {
  const briefResult = buildMarketingBrief({
    prompt: campaign?.name || "",
    module: "seo",
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
    module: "seo",
    mode: section,
  });
  const { systemPrompt, userPrompt } = buildSeoPrompt({
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
    module: "seo",
    output: result.text,
    brief: briefResult.brief,
    strategy,
  });
  const formatted = formatMarketingOutput({
    module: "seo",
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
