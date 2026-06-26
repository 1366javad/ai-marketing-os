import { AGENT_TYPES } from "../../core/agentTypes";
import { createAgentResult } from "../../core/createAgentResult";
import { getProvider } from "../../core/getProvider";

export async function runPlannerAgent({ campaign, brief }) {
  const provider = getProvider("planner");

  const plan = {
    campaignId: campaign.id,
    campaignName: campaign.name,
    goal: campaign.goal || brief?.goal || "Generate marketing assets",

    targetAudience:
      campaign.target_audience || brief?.targetAudience || "Target customers",

    strategy: {
      coreMessage:
        brief?.coreMessage ||
        `Create a focused marketing campaign for ${campaign.name}.`,

      positioning:
        brief?.positioning ||
        "Clear, useful, benefit-driven, and conversion-focused.",

      tone: brief?.tone || "professional, clear, persuasive",
    },

    outputs: {
      content: [
        {
          type: "blog_post",
          title: `Why ${campaign.name} matters`,
          goal: "educate and convert",
        },
        {
          type: "email",
          title: `${campaign.name} campaign email`,
          goal: "drive action",
        },
      ],

      creative: [
        {
          type: "social_image",
          title: `${campaign.name} social creative`,
          goal: "visual attention",
        },
      ],

      video: [
        {
          type: "short_video_script",
          title: `${campaign.name} short video`,
          goal: "hook and explain quickly",
        },
      ],

      ads: [
        {
          platform: "meta",
          type: "ad_copy",
          goal: "lead generation",
        },
        {
          platform: "google",
          type: "search_ad",
          goal: "high-intent traffic",
        },
      ],
    },
  };

  return createAgentResult({
    agent: AGENT_TYPES.PLANNER,

    input: {
      campaign,
      brief,
      provider,
    },

    output: plan,
  });
}
