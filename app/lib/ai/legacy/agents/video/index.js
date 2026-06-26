import { runProvider } from "../../providers";
import { createAgentResult } from "../../core/createAgentResult";
import { getProvider } from "../../core/getProvider";

export async function runVideoAgent({ campaign }) {
  const script = `
Video for ${campaign.name}
`;

  const provider = getProvider("video");
  const video = await runProvider(provider, {
    title: campaign.name,
    script,
  });

  return createAgentResult({
    agent: "video",

    input: {
      title: campaign.name,
    },

    output: {
      video,
    },
  });
}
