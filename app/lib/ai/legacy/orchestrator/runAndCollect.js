import { runCampaignWorkflow } from "./runCampaignWorkflow";
import { flattenOutputs } from "./flattenOutputs";

export async function runAndCollect({ campaign, brief }) {
  const workflow = await runCampaignWorkflow({
    campaign,
    brief,
  });

  const outputs = flattenOutputs(workflow.results);

  return {
    workflow,
    outputs,
  };
}
