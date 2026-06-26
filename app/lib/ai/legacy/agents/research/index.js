import { runProvider } from "../../providers";
import { createAgentResult } from "../../core/createAgentResult";
import { getProvider } from "../../core/getProvider";

export async function runResearchAgent({ campaign, plan }) {
  const query = `
${campaign.name}
${plan.targetAudience}
${plan.goal}
`;

  const provider = getProvider("research");

  const research = await runProvider(provider, {
    query,
    maxResults: 10,
  });

  return createAgentResult({
    agent: "research",

    input: {
      query,
    },

    output: {
      research,
    },
  });
}
