import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import {
  executeCanonicalPipeline,
  executeCreativeImageStage,
  runOrchestrator,
} from "@/app/lib/ai/orchestrator";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { createSupabaseMemoryWriter } from "@/app/lib/ai/campaign/events/createSupabaseMemoryWriter";
import { formatCreativeMarkdown } from "@/app/lib/ai/agents/creative";
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
    const normalizedTask = normalizeCreativeTask(body.section || body.task);
    const prompt = buildPrompt({ body, campaign, normalizedTask });
    const guard = validateInput(prompt);

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

    const executionPlan = runOrchestrator(
      {
        campaignId: body.campaignId || null,
        requestedModule: "creative",
        normalizedTask,
      },
      {
        exists: !!campaign,
        status: campaign?.status || null,
      },
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

    const pipeline = await executeCanonicalPipeline({
      normalizedPrompt: guard.normalizedPrompt,
      executionPlan,
      contextOptions: {
        contextDbAdapter: createContextDbAdapter(campaign, body),
        eventsDbAdapter: createSupabaseEventsAdapter(supabase),
      },
      briefExtensions: {
        platform: body.platform || "instagram",
        visualDirection: body.visualDirection || "",
        tone: body.tone || "professional",
      },
      memoryOptions: createCreativeConceptMemoryOptions({
        supabase,
        user,
        campaign,
        prompt: guard.normalizedPrompt,
        operationId,
      }),
    });
    const {
      agentOutput: creativeOutput,
      brief,
      quality,
      memoryWrite,
      contextSlice,
    } = pipeline;

    if (!quality.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated creative did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated creative did not pass quality checks.",
          creativeOutput,
          quality,
        },
        { status: 422 },
      );
    }

    const markdown = formatCreativeMarkdown(creativeOutput);

    queueCreativeImageGeneration({
      supabase,
      usageId: usage?.id,
      operationId,
      user,
      campaign,
      prompt: guard.normalizedPrompt,
      creativeOutput,
      executionPlan,
      brief,
      creditCheck,
      memoryWrite,
      contextSlice,
    });

    return Response.json({
      success: true,
      runId: operationId,
      imageStatus: "generating",
      estimatedImageSeconds: [15, 30],
      output: memoryWrite.output || {
        type: normalizedTask,
        title: creativeOutput.title,
        prompt: guard.normalizedPrompt,
        content: markdown,
        metadata: {
          ...creativeOutput.metadata,
          imageStatus: "generating",
          operationId,
        },
      },
      creativeOutput: {
        ...creativeOutput,
        metadata: {
          ...creativeOutput.metadata,
          imageStatus: "generating",
          operationId,
        },
      },
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
      console.error("Creative usage failure update failed:", usageError);
    }
    console.error("Creative Agent V2 route error:", error);

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

function normalizeCreativeTask(task) {
  const normalized = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map = {
    image: "image_post",
    post: "image_post",
    image_post: "image_post",
    carousel: "carousel",
    ad: "ad_creative",
    ad_creative: "ad_creative",
    banner: "banner",
    product: "product_mockup",
    product_mockup: "product_mockup",
    package: "campaign_package",
    campaign_package: "campaign_package",
  };

  return map[normalized] || "image_post";
}

function queueCreativeImageGeneration(payload) {
  runCreativeImageBackground(payload).catch((error) => {
    console.error("Creative background image job crashed:", {
      operationId: payload.operationId,
      campaignId: payload.campaign?.id || null,
      message: error?.message,
      stack: error?.stack,
    });
  });
}

async function runCreativeImageBackground({
  supabase,
  usageId,
  operationId,
  user,
  campaign,
  prompt,
  creativeOutput,
  executionPlan,
  brief,
  creditCheck,
  memoryWrite,
  contextSlice,
}) {
  const imageStage = await executeCreativeImageStage({
    creativeOutput,
    executionPlan,
    brief,
    memoryOptions: {
      createdBy: user.id,
      dbAdapter: createSupabaseMemoryWriter(supabase),
      payloadExtensions: {
        operationId,
        imageStatus: "ready",
        contextVersion: contextSlice?.contextVersion ?? null,
        sourceEventIds: (contextSlice?.relevantEvents || [])
          .map((event) => event.id)
          .filter(Boolean),
      },
    },
  });
  const outputWithImage = imageStage.agentOutput;
  const imagePassed = imageStage.imageStatus === "ready";

  await completeUsageEvent({
    supabase,
    usageId,
    provider:
      outputWithImage.asset?.provider || outputWithImage.metadata?.provider,
    model: outputWithImage.asset?.model || outputWithImage.metadata?.model,
    status: "completed",
    creditsUsed: creditCheck.billableCredits,
    cost: outputWithImage.metadata?.cost || 0,
    metadata: {
      ...outputWithImage.metadata,
      imageStatus: imageStage.imageStatus,
      imageError: imageStage.error?.message,
      memorySaved: Boolean(memoryWrite.memory),
      outputId: memoryWrite.output?.id || null,
      provider:
        outputWithImage.asset?.provider || outputWithImage.metadata?.provider,
      model: outputWithImage.asset?.model || outputWithImage.metadata?.model,
      latencyMs:
        outputWithImage.asset?.latencyMs || outputWithImage.metadata?.latencyMs,
      strategyProvider: outputWithImage.metadata?.provider,
      strategyModel: outputWithImage.metadata?.model,
      assetProvider: outputWithImage.asset?.provider || null,
      assetModel: outputWithImage.asset?.model || null,
      imageUsage: outputWithImage.metadata?.imageUsage || null,
      providerReportedTokens: false,
      internalCreditBypass: Boolean(creditCheck.internalBypass),
      internalCreditBypassReason: creditCheck.internalBypassReason,
    },
  });

  if (!imagePassed) {
    console.error("Creative background image failed quality checks:", {
      operationId,
      review: outputWithImage.review,
      imageQuality: imageStage.quality,
      error: imageStage.error?.message,
    });
  }
}

function buildPrompt({ body, campaign, normalizedTask }) {
  return [
    body.prompt || "",
    `Generate ${normalizedTask.replace(/_/g, " ")} creative.`,
    campaign?.name ? `Campaign: ${campaign.name}.` : "",
    body.platform ? `Platform: ${body.platform}.` : "",
    body.visualDirection ? `Visual direction: ${body.visualDirection}.` : "",
    body.tone ? `Tone: ${body.tone}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function createContextDbAdapter(campaign, body) {
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
      tone: body.tone || "professional",
      platforms: body.platform ? [body.platform] : [],
      competitors: [],
      status: campaign.status || "draft",
      createdAt: campaign.created_at || "",
      updatedAt: campaign.updated_at || "",
    };
  };
}

function createCreativeConceptMemoryOptions({
  supabase,
  user,
  campaign,
  prompt,
  operationId,
}) {
  const formatOutput = (agentOutput, task) => ({
    type: task,
    title: agentOutput.title,
    prompt,
    content: formatCreativeMarkdown(agentOutput),
    metadata: {
      ...agentOutput.metadata,
      imageStatus: "generating",
      operationId,
      generatedAt: new Date().toISOString(),
    },
  });

  return {
    createdBy: user.id,
    dbAdapter: createSupabaseMemoryWriter(supabase),
    payloadExtensions: {
      operationId,
      imageStatus: "generating",
    },
    onToolMode: ({ agentOutput, memoryEvent }) => ({
      output: formatOutput(agentOutput, memoryEvent.artifact),
      memory: { skipped: true, reason: "tool_mode" },
    }),
    onWriteSuccess: ({ agentOutput, canonicalEvent }) =>
      formatOutput(agentOutput, canonicalEvent.task),
    onWriteFailure: async ({ error, canonicalEvent, agentOutput, quality }) => {
      console.warn("Creative memory write failed; falling back to campaign_outputs:", {
        message: error.message,
        code: error.code,
      });
      const output = await createCampaignOutput({
        campaignId: campaign.id,
        module: "creative",
        type: canonicalEvent.task,
        title: agentOutput.title,
        prompt,
        content: formatCreativeMarkdown(agentOutput),
        metadata: {
          canonical: true,
          quality,
          memoryEvent: canonicalEvent,
          ...agentOutput.metadata,
          imageStatus: "generating",
          operationId,
          generatedAt: new Date().toISOString(),
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
