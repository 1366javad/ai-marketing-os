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
    const normalizedTask = "evaluate_campaign";
    const prompt =
      String(body.prompt || "").trim() ||
      `Evaluate approved campaign intelligence for ${campaign?.name || "this campaign"}.`;
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
        requestedModule: "analytics",
        normalizedTask,
      },
      { exists: !!campaign, status: campaign?.status || null },
    );
    const operationId = body.operationId || crypto.randomUUID();
    const creditCheck = await checkCreditLimit({
      supabase,
      userId: user.id,
      userEmail: user.email,
      module: executionPlan.module,
      artifact: "campaign_learning",
      isRegenerate: Boolean(body.regenerate),
    });

    if (!creditCheck.allowed) return createCreditLimitResponse(creditCheck);

    usage = await startUsageEvent({
      supabase,
      userId: user.id,
      campaignId: campaign?.id || body.campaignId || null,
      runId: operationId,
      module: executionPlan.module,
      artifact: "campaign_learning",
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
        contextDbAdapter: createContextDbAdapter(campaign),
        eventsDbAdapter: createSupabaseEventsAdapter(supabase),
      },
      knowledgeOptions: createKnowledgeRuntimeOptions({ supabase, body, campaign }),
      memoryOptions: createAnalyticsMemoryOptions({
        supabase,
        user,
        campaign,
        prompt: guard.normalizedPrompt,
      }),
    });
    const {
      agentOutput: analyticsOutput,
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
        error: "Generated campaign learning did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated campaign learning did not pass quality checks.",
          analyticsOutput,
          quality,
        },
        { status: 422 },
      );
    }

    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: analyticsOutput.metadata?.provider,
      model: analyticsOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.billableCredits,
      cost: analyticsOutput.metadata?.cost || 0,
      metadata: {
        ...analyticsOutput.metadata,
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
      analyticsOutput,
      executionPlan,
      quality,
      riskGate,
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
      });
    } catch (usageError) {
      console.error("Analytics usage failure update failed:", usageError);
    }
    console.error("Analytics Agent V2 route error:", error);
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

function createContextDbAdapter(campaign) {
  return async () => {
    if (!campaign) return null;
    return {
      campaignId: campaign.id,
      campaignName: campaign.name || "",
      contextVersion: 1,
      industry: campaign.industry || campaign.category || "",
      offer: campaign.product_name || campaign.offer || campaign.name || "",
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

function createAnalyticsMemoryOptions({ supabase, user, campaign, prompt }) {
  return {
    createdBy: user.id,
    dbAdapter: createSupabaseMemoryWriter(supabase),
    onToolMode: ({ agentOutput }) => ({
      output: agentOutput,
      memory: { skipped: true, reason: "tool_mode" },
    }),
    onWriteFailure: async ({ error, canonicalEvent, agentOutput, quality }) => {
      console.warn("Analytics memory write failed; using output fallback:", {
        message: error.message,
        code: error.code,
      });
      const output = await createCampaignOutput({
        campaignId: campaign.id,
        module: "analytics",
        type: "campaign_learning",
        title: agentOutput.title,
        prompt,
        content: JSON.stringify(agentOutput, null, 2),
        metadata: {
          canonical: true,
          quality,
          memoryEvent: canonicalEvent,
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
