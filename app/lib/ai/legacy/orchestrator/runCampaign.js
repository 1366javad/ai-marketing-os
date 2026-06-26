import { runAndCollect } from "./runAndCollect";
import { saveOutputs } from "./saveOutputs";

import {
  createAiRun,
  completeAiRun,
  failAiRun,
  updateAiRun,
} from "@/app/lib/db/aiRuns";

export async function runCampaign({ campaign, brief, userId }) {
  let run = null;

  try {
    run = await createAiRun({
      userId,
      campaignId: campaign.id,
      workflow: "campaign_generation",
      input: {
        campaign,
        brief,
      },
      model: "multi-agent",
    });

    await updateAiRun({
      runId: run.id,
      updates: {
        current_step: "workflow",
      },
    });

    const { workflow, outputs } = await runAndCollect({
      campaign,
      brief,
    });

    await updateAiRun({
      runId: run.id,
      updates: {
        current_step: "save_outputs",
      },
    });

    const saved = await saveOutputs({
      campaignId: campaign.id,
      outputs,
    });

    await completeAiRun({
      runId: run.id,
      output: {
        workflow,
        outputsCount: outputs.length,
        savedCount: saved.length,
      },
    });

    return {
      runId: run.id,
      workflow,
      outputs,
      saved,
    };
  } catch (error) {
    console.error(error);

    if (run?.id) {
      await failAiRun({
        runId: run.id,
        errorMessage: error?.message || "Unknown campaign error",
      });
    }

    throw error;
  }
}
