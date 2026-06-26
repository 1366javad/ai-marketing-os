import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import { runOrchestrator } from "@/app/lib/ai/orchestrator";
import { getCampaignContextSlice } from "@/app/lib/ai/campaign/getCampaignContextSlice";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { buildBrief } from "@/app/lib/ai/brief-builder";
import {
  formatResearchMarkdown,
  runResearchAgent,
  repairResearchOutput,
  toResearchMemoryEvent,
} from "@/app/lib/ai/agents/research";
import { runQualityChecks } from "@/app/lib/ai/quality";
import {
  getAiErrorMessage,
  getAiErrorStatus,
} from "@/app/lib/utils/aiErrorMessage";
import {
  checkCreditLimit,
  completeUsageEvent,
  createCreditLimitResponse,
  failUsageEvent,
  startUsageEvent,
} from "@/app/lib/ai/usage/usageManager";

export async function POST(request) {
  let supabase;
  let usage;
  try {
    supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const normalizedTask = normalizeResearchTask(body.section || body.task);
    const guard = validateInput(body.prompt);

    if (guard.status !== "valid") {
      const statusCode = guard.status === "blocked" ? 403 : 422;

      return Response.json(
        {
          success: false,
          error: guard.userMessage,
          guard,
        },
        { status: statusCode },
      );
    }

    const campaign = body.campaignId
      ? await getCampaignById(body.campaignId)
      : null;

    const orchestrationInput = {
      campaignId: body.campaignId || null,
      requestedModule: "research",
      normalizedTask,
    };

    const executionPlan = runOrchestrator(orchestrationInput, {
      exists: !!campaign,
      status: campaign?.status || null,
    });
    const operationId = body.operationId || crypto.randomUUID();
    const creditCheck = await checkCreditLimit({
      supabase,
      userId: user.id,
      module: executionPlan.module,
      artifact: executionPlan.task,
    });

    if (!creditCheck.allowed) {
      return createCreditLimitResponse(creditCheck);
    }

    usage = await startUsageEvent({
      supabase,
      userId: user.id,
      campaignId: campaign?.id || body.campaignId || null,
      runId: operationId,
      module: executionPlan.module,
      artifact: executionPlan.task,
      requestType: "generation",
      creditsUsed: creditCheck.requiredCredits,
      source: "agent_v2",
      metadata: {
        operationId,
        campaignName: campaign?.name || "",
        promptPreview: guard.normalizedPrompt?.slice(0, 240) || "",
      },
    });

    const contextSlice = executionPlan.needsContext
      ? await getCampaignContextSlice(
          executionPlan.campaignId,
          executionPlan.module,
          executionPlan.task,
          {
            includePending: false,
            contextDbAdapter: createContextDbAdapter(campaign),
            eventsDbAdapter: createSupabaseEventsAdapter(supabase),
          },
        )
      : null;

    const brief = {
      ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
      requestedModule: "research",
      normalizedTask,
      normalizedPrompt: guard.normalizedPrompt,
      relevantEvents: contextSlice?.relevantEvents || [],
    };

    let researchOutput = await runResearchAgent({
      brief,
      executionPlan,
    });
    let memoryEvent = toResearchMemoryEvent(researchOutput, {
      brief,
      executionPlan,
    });
    let quality = runQualityChecks(memoryEvent, executionPlan, brief);

    if (!quality.passed) {
      console.warn("Research quality repair started:", {
        provider: researchOutput.metadata?.provider,
        issues: quality.issues,
        counts: summarizeResearchCounts(researchOutput),
      });
      researchOutput = await repairResearchOutput({
        brief,
        executionPlan,
        previousOutput: researchOutput,
        issues: quality.issues,
      });
      memoryEvent = toResearchMemoryEvent(researchOutput, {
        brief,
        executionPlan,
      });
      quality = runQualityChecks(memoryEvent, executionPlan, brief);
    }

    if (!quality.passed) {
      console.error("Research quality repair failed:", {
        provider: researchOutput.metadata?.provider,
        issues: quality.issues,
        counts: summarizeResearchCounts(researchOutput),
      });
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated research did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated research did not pass quality checks.",
          output: researchOutput,
          quality,
        },
        { status: 422 },
      );
    }

    const markdown = formatResearchMarkdown(researchOutput);
    const memoryWrite = await safeWriteResearchMemory({
      supabase,
      user,
      campaign,
      prompt: guard.normalizedPrompt,
      markdown,
      researchOutput,
      memoryEvent,
      executionPlan,
      quality,
    });

    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: researchOutput.metadata?.provider,
      model: researchOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.requiredCredits,
      cost: researchOutput.metadata?.cost || 0,
      metadata: {
        ...researchOutput.metadata,
        memorySaved: Boolean(memoryWrite.memory),
        outputId: memoryWrite.output?.id || null,
      },
    });

    return Response.json({
      success: true,
      output: memoryWrite.output || {
        type: normalizedTask,
        title: researchOutput.title,
        prompt: guard.normalizedPrompt,
        content: markdown,
        metadata: researchOutput.metadata,
      },
      researchOutput,
      executionPlan,
      quality,
      memory: memoryWrite.memory,
    });
  } catch (error) {
    await failUsageEvent({
      supabase,
      usageId: usage?.id,
      error: error.message,
      metadata: {
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    });
    console.error("Research Agent V2 route error:", error);

    return Response.json(
      {
        success: false,
        error: getAiErrorMessage(error),
      },
      {
        status: getAiErrorStatus(error),
      },
    );
  }
}

function summarizeResearchCounts(output) {
  return {
    summaryLength: String(output?.summary || "").length,
    insights: output?.insights?.length || 0,
    recommendations: output?.recommendations?.length || 0,
    risks: output?.risks?.length || 0,
    nextActions: output?.nextActions?.length || 0,
  };
}

function normalizeResearchTask(task) {
  const map = {
    market: "market",
    audience: "audience",
    competitor: "competitor",
    competitors: "competitor",
    trend: "trends",
    trends: "trends",
    painpoint: "pain_points",
    painpoints: "pain_points",
    pain_points: "pain_points",
    opportunities: "opportunities",
    opportunity: "opportunities",
  };

  return map[task] || "market";
}

function createContextDbAdapter(campaign) {
  return async () => {
    if (!campaign) return null;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name || "",
      contextVersion: 1,
      industry: campaign.industry || "",
      offer: campaign.product_name || campaign.name || "",
      goal: campaign.goal || "",
      audience: campaign.target_audience || "",
      positioning: campaign.brand_description || campaign.notes || "",
      valueProposition: campaign.brand_description || "",
      tone: "professional",
      platforms: [],
      competitors: [],
      status: campaign.status || "draft",
      createdAt: campaign.created_at || "",
      updatedAt: campaign.updated_at || "",
    };
  };
}

async function safeWriteResearchMemory({
  supabase,
  user,
  campaign,
  prompt,
  markdown,
  researchOutput,
  memoryEvent,
  executionPlan,
  quality,
}) {
  if (executionPlan.mode !== "campaign" || !campaign) {
    const generatedAt = new Date().toISOString();

    return {
      output: {
        type: executionPlan.task,
        title: researchOutput.title,
        prompt,
        content: markdown,
        metadata: {
          ...researchOutput.metadata,
          generatedAt,
        },
      },
      memory: { skipped: true, reason: "tool_mode" },
    };
  }

  const generatedAt = new Date().toISOString();
  const eventRow = {
    campaign_id: campaign.id,
    type: memoryEvent.artifact,
    module: memoryEvent.module,
    artifact: memoryEvent.artifact,
    approval_status: quality.approvalRequired ? "pending" : "auto_saved",
    confidence: quality.score,
    risk_level: quality.riskLevel,
    task: executionPlan.task,
    summary: memoryEvent.summary,
    payload: {
      ...memoryEvent.payload,
      generatedAt,
    },
    supersedes: null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("campaign_memory_events")
    .insert(eventRow)
    .select()
    .single();

  if (!error) {
    return {
      output: {
        type: executionPlan.task,
        title: researchOutput.title,
        prompt,
        content: markdown,
        metadata: {
          ...researchOutput.metadata,
          generatedAt,
        },
      },
      memory: { saved: true, storage: "campaign_memory_events", event: data },
    };
  }

  console.warn("Research memory write failed; falling back to campaign_outputs:", {
    message: error.message,
    code: error.code,
  });

  try {
    const output = await createCampaignOutput({
      campaignId: campaign.id,
      module: "research",
      type: executionPlan.task,
      title: researchOutput.title,
      prompt,
      content: markdown,
      metadata: {
        canonical: true,
        quality,
        memoryEvent: eventRow,
        ...researchOutput.metadata,
        generatedAt,
      },
    });

    return {
      output,
      memory: {
        saved: false,
        fallbackSaved: true,
        storage: "campaign_outputs",
        error: error.message,
      },
    };
  } catch (fallbackError) {
    console.warn("Research fallback write failed:", fallbackError);

    return {
      output: {
        type: executionPlan.task,
        title: researchOutput.title,
        prompt,
        content: markdown,
        metadata: {
          ...researchOutput.metadata,
          generatedAt,
        },
      },
      memory: {
        saved: false,
        fallbackSaved: false,
        error: error.message,
        fallbackError: fallbackError.message,
      },
    };
  }
}
