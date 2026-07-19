import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import {
  executeCanonicalPipeline,
  runOrchestrator,
} from "@/app/lib/ai/orchestrator";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { createSupabaseMemoryWriter } from "@/app/lib/ai/campaign/events/createSupabaseMemoryWriter";
import {
  ACTIVE_VIDEO_TASKS,
  normalizeVideoTask,
} from "@/app/lib/ai/agents/video";
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
    const campaign = body.campaignId
      ? await getCampaignById(body.campaignId)
      : null;
    if (!campaign) {
      return Response.json({ error: "Campaign not found." }, { status: 404 });
    }
    const task = normalizeVideoTask(body.task || body.section);

    if (!ACTIVE_VIDEO_TASKS.has(task)) {
      return Response.json(
        {
          success: false,
          error: "This video task is planned for Phase 2.",
        },
        { status: 422 },
      );
    }

    const prompt = [
      `Create a ${task.replace(/_/g, " ")} for ${campaign?.name || "this campaign"}.`,
      body.goal ? `Goal: ${body.goal}.` : "",
      body.audience ? `Audience: ${body.audience}.` : "",
      body.platform ? `Platform: ${body.platform}.` : "",
      body.duration ? `Duration: ${body.duration}.` : "",
      body.cta ? `CTA: ${body.cta}.` : "",
      body.visualStyle ? `Visual style: ${body.visualStyle}.` : "",
      body.direction || "",
    ]
      .filter(Boolean)
      .join(" ");
    const guard = validateInput(prompt);

    if (guard.status !== "valid") {
      return Response.json(
        { success: false, error: guard.userMessage, guard },
        { status: guard.status === "blocked" ? 403 : 422 },
      );
    }

    const executionPlan = runOrchestrator(
      {
        campaignId: body.campaignId || null,
        requestedModule: "video",
        normalizedTask: task,
      },
      { exists: !!campaign, status: campaign?.status || null },
    );
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
      campaignId: campaign.id,
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

    const pipeline = await executeCanonicalPipeline({
      normalizedPrompt: guard.normalizedPrompt,
      executionPlan,
      contextOptions: {
        contextDbAdapter: createContextAdapter(campaign, body),
        eventsDbAdapter: createSupabaseEventsAdapter(supabase),
      },
      knowledgeOptions: createKnowledgeRuntimeOptions({ supabase, body, campaign }),
      briefExtensions: {
        campaignName: campaign?.name || "",
        platform: body.platform || "Instagram",
        duration: body.duration || "30 seconds",
        cta: body.cta || "",
        visualStyle: body.visualStyle || "",
        direction: body.direction || "",
      },
      memoryOptions: createVideoMemoryOptions({
        supabase,
        user,
        campaign,
        prompt: guard.normalizedPrompt,
      }),
    });
    const {
      agentOutput: videoOutput,
      memoryEvent,
      quality,
      riskGate,
      contextSlice,
      memoryWrite,
    } = pipeline;

    if (!quality.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated video plan did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated video plan did not pass quality checks.",
          videoOutput,
          quality,
        },
        { status: 422 },
      );
    }

    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: videoOutput.metadata?.provider,
      model: videoOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.billableCredits,
      metadata: videoOutput.metadata,
    });

    return Response.json({
      success: true,
      artifact: memoryEvent.artifact,
      approvalStatus: quality.approvalRequired ? "pending" : "auto_saved",
      videoOutput,
      output: memoryWrite.output || videoOutput,
      quality,
      riskGate,
      executionPlan,
      knowledgeDiagnostics: pipeline.knowledgeDiagnostics,
      contextVersion: contextSlice?.contextVersion,
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
      console.error("Video planning usage failure update failed:", usageError);
    }

    console.error("Video planning route error:", error);
    return Response.json(
      { success: false, error: getAiErrorMessage(error) },
      { status: getAiErrorStatus(error) },
    );
  }
}

function createKnowledgeRuntimeOptions({ supabase, body, campaign }) {
  return {
    supabase,
    businessId: body.businessId || campaign?.business_id || null,
    scope: {
      brandId: body.brandId || campaign?.brand_id || undefined,
      productId: body.productId || campaign?.product_id || undefined,
    },
  };
}

function createContextAdapter(campaign, body) {
  return async () => ({
    campaignId: campaign.id,
    campaignName: campaign.name || "",
    contextVersion: 1,
    industry: campaign.industry || "",
    offer: campaign.product_name || campaign.name || "",
    goal: body.goal || campaign.goal || "",
    audience:
      body.audience || campaign.audience || campaign.target_audience || "",
    positioning: campaign.brand_description || campaign.notes || "",
    valueProposition: campaign.brand_description || "",
    tone: "professional",
    platforms: body.platform ? [body.platform] : [],
    competitors: [],
    status: campaign.status || "draft",
    createdAt: campaign.created_at || "",
    updatedAt: campaign.updated_at || "",
  });
}

function createVideoMemoryOptions({ supabase, user, campaign, prompt }) {
  return {
    createdBy: user.id,
    dbAdapter: createSupabaseMemoryWriter(supabase),
    onWriteFailure: async ({ error, canonicalEvent, agentOutput, quality }) => {
      console.warn("Video planning memory fallback:", error.message);
      const output = await createCampaignOutput({
        campaignId: campaign.id,
        module: "video",
        type: agentOutput.type,
        title: agentOutput.title,
        prompt,
        content: JSON.stringify(agentOutput, null, 2),
        metadata: {
          canonicalPlanning: true,
          memoryEvent: canonicalEvent,
          quality,
          ...agentOutput.metadata,
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
    },
  };
}
