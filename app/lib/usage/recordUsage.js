import { logUsageEvent } from "@/app/lib/ai/usage/logUsageEvent";

export async function safeRecordGenerationUsage({
  supabase,
  userId,
  campaign,
  runId,
  module,
  artifact,
  metadata,
  creditsUsed = 1,
  status,
  requestType = "agent_generation",
}) {
  return logUsageEvent({
    supabase,
    userId,
    campaign,
    runId,
    module,
    artifact,
    requestType,
    status,
    metadata,
    creditsUsed,
    source: "agent_v2",
  });
}
