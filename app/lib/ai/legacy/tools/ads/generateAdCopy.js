import {
  buildAdsPrompt,
  buildMarketingBrief,
  buildMarketingStrategy,
  checkMarketingOutput,
  formatMarketingOutput,
} from "../../marketing";

export async function generateAdCopyTool({ campaign, plan, item }) {
  const briefResult = buildMarketingBrief({
    prompt: `${campaign?.name || ""} ${item?.platform || ""}`,
    platform: item?.platform || "",
    module: "ads",
    campaign,
    overrides: {
      industry: campaign?.industry,
      goal: item?.goal || campaign?.goal,
      audience: plan?.targetAudience || campaign?.target_audience,
    },
  });
  const strategy = buildMarketingStrategy({
    brief: briefResult.brief,
    module: "ads",
    mode: item?.platform || "",
  });
  const { userPrompt } = buildAdsPrompt({
    campaign,
    plan,
    item,
    brief: briefResult.brief,
    strategy,
    platform: item?.platform || "",
  });

  const copy = {
    platform: item.platform,
    headlines: [
      `Launch ${campaign.name}`,
      `Smarter Marketing Campaigns`,
      `Create Campaign Assets Faster`,
    ],
    descriptions: [
      `Turn one campaign brief into content, creatives, videos, and ads.`,
      `Plan and generate connected marketing assets in one workspace.`,
    ],
    ctas: ["Get Started", "Create Campaign", "Try Now"],
  };

  const quality = checkMarketingOutput({
    module: "ads",
    output: copy,
    brief: briefResult.brief,
    strategy,
  });
  const formatted = formatMarketingOutput({
    module: "ads",
    output: copy,
    title: `${campaign.name} ${item.platform} ad`,
    type: item.platform,
    brief: briefResult.brief,
    strategy,
    quality,
  });

  return {
    title: `${campaign.name} ${item.platform} ad`,
    prompt: userPrompt,
    copy,
    content: formatted.content,
    quality,
    metadata: formatted.metadata,
  };
}
