import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import { runOrchestrator } from "@/app/lib/ai/orchestrator";
import { getCampaignContextSlice } from "@/app/lib/ai/campaign/getCampaignContextSlice";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { buildBrief } from "@/app/lib/ai/brief-builder";
import {
  runContentAgent,
  toContentMemoryEvent,
} from "@/app/lib/ai/agents/content";
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
    const normalizedTask = normalizeContentTask(body.type || body.task);
    const campaign = body.campaignId
      ? await getCampaignById(body.campaignId)
      : null;
    const userDirection = String(body.prompt || "").trim();
    const generationPrompt =
      userDirection ||
      buildDefaultContentPrompt({
        campaign,
        normalizedTask,
      });
    const guard = validateInput(generationPrompt);

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

    const orchestrationInput = {
      campaignId: body.campaignId || null,
      requestedModule: "content",
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
      userEmail: user.email,
      module: executionPlan.module,
      artifact: executionPlan.task,
      isRegenerate: Boolean(body.regenerate),
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
      creditsUsed: creditCheck.billableCredits,
      source: creditCheck.internalBypass ? "internal_test" : "agent_v2",
      metadata: {
        operationId,
        campaignName: campaign?.name || "",
        promptPreview: guard.normalizedPrompt?.slice(0, 240) || "",
        internalCreditBypass: Boolean(creditCheck.internalBypass),
        internalCreditBypassReason: creditCheck.internalBypassReason,
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
      requestedModule: "content",
      normalizedTask,
      normalizedPrompt: userDirection,
      relevantEvents: contextSlice?.relevantEvents || [],
    };

    const contentOutput = await runContentAgent({
      brief,
      executionPlan,
    });
    const memoryEvent = toContentMemoryEvent(contentOutput, {
      brief,
      executionPlan,
    });
    const quality = runQualityChecks(memoryEvent, executionPlan, brief);

    if (!quality.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated content did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated content did not pass quality checks.",
          output: contentOutput,
          quality,
        },
        { status: 422 },
      );
    }

    const memoryWrite = await safeWriteContentMemory({
      supabase,
      user,
      campaign,
      prompt: userDirection,
      contentOutput,
      memoryEvent,
      executionPlan,
      quality,
    });

    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: contentOutput.metadata?.provider,
      model: contentOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.billableCredits,
      cost: contentOutput.metadata?.cost || 0,
      metadata: {
        ...contentOutput.metadata,
        memorySaved: Boolean(memoryWrite.memory),
        outputId: memoryWrite.output?.id || null,
        internalCreditBypass: Boolean(creditCheck.internalBypass),
        internalCreditBypassReason: creditCheck.internalBypassReason,
      },
    });

    return Response.json({
      success: true,
      artifact: memoryEvent.artifact,
      approvalStatus: quality.approvalRequired ? "pending" : "auto_saved",
      riskLevel: quality.riskLevel,
      summary: memoryEvent.summary,
      payload: memoryEvent.payload,
      ...(contextSlice
        ? { contextVersion: contextSlice.contextVersion }
        : {}),
      output: memoryWrite.output || contentOutput,
      contentOutput,
      executionPlan,
      quality,
      memory: memoryWrite.memory,
    });
  } catch (error) {
    try {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: error.message,
        metadata: {
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
      });
    } catch (usageError) {
      console.error("Content usage failure update failed:", usageError);
    }
    console.error("Content Agent V2 route error:", error);

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

function buildDefaultContentPrompt({ campaign, normalizedTask }) {
  const campaignName =
    campaign?.name || campaign?.product_name || "this campaign";
  const task = normalizedTask.replace(/_/g, " ");

  return `Create a ${task} for ${campaignName} using Campaign Context and Approved Memory.`;
}

function normalizeContentTask(type) {
  const map = {
    blog: "blog_post",
    blog_post: "blog_post",
    email: "email",
    newsletter: "newsletter",
    landing: "landing_page",
    landing_page: "landing_page",
    case_study: "case_study",
    linkedin: "linkedin_post",
    linkedin_post: "linkedin_post",
    instagram: "instagram_caption",
    instagram_caption: "instagram_caption",
  };

  return map[type] || "blog_post";
}

function createContextDbAdapter(campaign) {
  return async () => {
    if (!campaign) return null;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name || "",
      contextVersion: 1,
      industry: campaign.industry || campaign.category || "",
      offer: campaign.product_name || campaign.name || "",
      goal: campaign.goal || "",
      audience: campaign.audience || campaign.target_audience || "",
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

async function safeWriteContentMemory({
  supabase,
  user,
  campaign,
  prompt,
  contentOutput,
  memoryEvent,
  executionPlan,
  quality,
}) {
  if (executionPlan.mode !== "campaign" || !campaign) {
    return {
      output: contentOutput,
      memory: { skipped: true, reason: "tool_mode" },
    };
  }

  const approvalStatus = quality.approvalRequired ? "pending" : "auto_saved";
  const eventRow = {
    campaign_id: campaign.id,
    type: memoryEvent.artifact,
    module: memoryEvent.module,
    artifact: memoryEvent.artifact,
    approval_status: approvalStatus,
    confidence: quality.score,
    risk_level: quality.riskLevel,
    task: executionPlan.task,
    summary: memoryEvent.summary,
    payload: memoryEvent.payload,
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
      output: contentOutput,
      memory: { saved: true, storage: "campaign_memory_events", event: data },
    };
  }

  console.warn("Campaign Memory write failed; falling back to campaign_outputs:", {
    message: error.message,
    code: error.code,
  });

  try {
    const output = await createCampaignOutput({
      campaignId: campaign.id,
      module: "content",
      type: contentOutput.type,
      title: contentOutput.title,
      prompt,
      content: contentOutput.content,
      metadata: {
        cta: contentOutput.cta,
        canonical: true,
        quality,
        memoryEvent: eventRow,
        ...contentOutput.metadata,
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
    console.warn("Campaign Memory fallback write failed:", fallbackError);

    return {
      output: contentOutput,
      memory: {
        saved: false,
        fallbackSaved: false,
        error: error.message,
        fallbackError: fallbackError.message,
      },
    };
  }
}
