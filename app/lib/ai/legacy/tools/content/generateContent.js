import { runGemini } from "../../providers/gemini";
import {
  buildContentPrompt,
  buildMarketingBrief,
  buildMarketingStrategy,
  checkMarketingOutput,
  formatMarketingOutput,
} from "../../marketing";

export async function generateContentTool({ campaign, plan, item }) {
  const briefResult = buildMarketingBrief({
    prompt: plan?.strategy?.coreMessage || campaign?.name || "",
    module: "content",
    campaign,
    overrides: {
      industry: campaign?.industry,
      goal: campaign?.goal,
      audience: plan?.targetAudience || campaign?.target_audience,
    },
  });
  const strategy = buildMarketingStrategy({
    brief: briefResult.brief,
    module: "content",
    mode: item?.type || "",
  });
  const { systemPrompt, userPrompt } = buildContentPrompt({
    campaign,
    plan,
    item,
    prompt: plan?.strategy?.coreMessage || "",
    brief: briefResult.brief,
    strategy,
  });

  const result = await runGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.7,
  });

  const quality = checkMarketingOutput({
    module: "content",
    output: result.text,
    brief: briefResult.brief,
    strategy,
  });
  const formatted = formatMarketingOutput({
    module: "content",
    output: result.text,
    title: item.title,
    type: item.type,
    brief: briefResult.brief,
    strategy,
    quality,
  });

  return {
    title: formatted.title,
    type: formatted.type,
    content: formatted.content,
    quality,
    metadata: formatted.metadata,
  };
}
