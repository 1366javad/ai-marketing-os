import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";

export async function saveOutputs({ campaignId, outputs }) {
  const saved = [];

  for (const output of outputs) {
    const row = await createCampaignOutput({
      campaignId,

      module: output.category,

      type: output.outputType,

      title: output.title,

      prompt: output.prompt || null,

      content: output.content,

      metadata: output.metadata || {},
    });

    saved.push(row);
  }

  return saved;
}
