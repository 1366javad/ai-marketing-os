import { AGENT_TYPES } from "../../core/agentTypes";
import { createAgentResult } from "../../core/createAgentResult";
import { generateContentTool } from "../../tools/content/generateContent";
import { getProvider } from "../../core/getProvider";

export async function runContentAgent({ campaign, plan }) {
  const provider = getProvider("content");

  const items = plan.outputs.content || [];

  const outputs = [];

  for (const item of items) {
    const generated = await generateContentTool({
      campaign,
      plan,
      item,
    });

    outputs.push({
      category: "content",

      outputType: item.type,

      title: generated.title,

      content: generated.content,

      metadata: {
        goal: item.goal,
        provider,
      },
    });
  }

  return createAgentResult({
    agent: AGENT_TYPES.CONTENT,

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
