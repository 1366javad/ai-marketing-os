export async function generateVideoScriptTool({ campaign, plan, item }) {
  return {
    title: item.title,
    script: `
Title: ${item.title}

Hook:
Struggling to get results from your marketing campaigns?

Problem:
Most campaigns fail because content, creatives, videos, and ads are disconnected.

Solution:
${campaign.name} helps create a connected campaign system from one clear strategy.

CTA:
Start with one campaign brief and generate the assets you need.
`.trim(),
  };
}
