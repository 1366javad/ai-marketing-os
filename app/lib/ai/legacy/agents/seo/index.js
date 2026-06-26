import { runProvider } from "../../providers";
import { createAgentResult } from "../../core/createAgentResult";
import { getProvider } from "../../core/getProvider";

export async function runSeoAgent({ campaign }) {
  const provider = getProvider("seo");

  const serpData = await runProvider(provider, {
    query: campaign.name,
  });

  return createAgentResult({
    agent: "seo",

    input: {
      query: campaign.name,
    },

    output: {
      serpData,
    },
  });
}
