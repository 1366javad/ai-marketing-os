import { AGENT_TYPES } from "../../core/agentTypes";
import { createAgentResult } from "../../core/createAgentResult";
import { generateAdCopyTool } from "../../tools/ads/generateAdCopy";
import { getProvider } from "../../core/getProvider";

export async function runAdsAgent({ campaign, plan }) {
  const provider = getProvider("ads");

  const items = plan.outputs.ads || [];

  const outputs = [];

  for (const item of items) {
    const generated = await generateAdCopyTool({
      campaign,
      plan,
      item,
    });

    outputs.push({
      category: "ads",

      outputType: item.type,

      title: generated.title,

      content: JSON.stringify(generated.copy, null, 2),

      metadata: {
        provider,
        platform: item.platform,
        goal: item.goal,
      },
    });
  }

  return createAgentResult({
    agent: AGENT_TYPES.ADS,

    input: {
      campaignId: campaign.id,
      provider,
      items,
    },

    output: {
      outputs,
    },
  });
}
