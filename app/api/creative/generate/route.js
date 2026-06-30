import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import { runOrchestrator } from "@/app/lib/ai/orchestrator";
import { getCampaignContextSlice } from "@/app/lib/ai/campaign/getCampaignContextSlice";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { buildBrief } from "@/app/lib/ai/brief-builder";
import {
  formatCreativeMarkdown,
  runCreativeImagePipeline,
  runCreativeTextPipeline,
  toCreativeMemoryEvent,
  toImageAssetMemoryEvent,
} from "@/app/lib/ai/agents/creative";
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

    const contextSlice = executionPlan.needsContext
      ? await getCampaignContextSlice(
          executionPlan.campaignId,
          executionPlan.module,
          executionPlan.task,
          {
            includePending: false,
            contextDbAdapter: createContextDbAdapter(campaign, body),
            eventsDbAdapter: createSupabaseEventsAdapter(supabase),
          },
        )
      : null;

    const brief = {
      ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
      requestedModule: "creative",
      normalizedTask,
      normalizedPrompt: guard.normalizedPrompt,
      platform: body.platform || "instagram",
      visualDirection: body.visualDirection || "",
      tone: body.tone || "professional",
      relevantEvents: contextSlice?.relevantEvents || [],
    };

    const creativeOutput = await runCreativeTextPipeline({
      brief,
      executionPlan,
    });
    const memoryEvent = toCreativeMemoryEvent(creativeOutput, {
      brief,
      executionPlan,
    });
    const quality = runQualityChecks(memoryEvent, executionPlan, brief);

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
    const memoryWrite = await safeWriteCreativeMemory({
      supabase,
      user,
      campaign,
      prompt: guard.normalizedPrompt,
      markdown,
      creativeOutput,
      memoryEvent,
      executionPlan,
      quality,
      operationId,
      imageStatus: "generating",
    });

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
}) {
  try {
    const outputWithImage = await runCreativeImagePipeline({ creativeOutput });
    const imageMemoryEvent = toImageAssetMemoryEvent(outputWithImage, {
      brief,
      executionPlan,
    });
    const imageQuality = runQualityChecks(
      imageMemoryEvent,
      executionPlan,
      brief,
    );
    const imagePassed = outputWithImage.review?.passed && imageQuality.passed;

    await writeCreativeImageMemory({
      supabase,
      user,
      campaign,
      creativeOutput: outputWithImage,
      imageMemoryEvent,
      executionPlan,
      imageQuality,
      operationId,
      imageStatus: imagePassed ? "ready" : "failed",
    });

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
        imageStatus: imagePassed ? "ready" : "failed",
        memorySaved: Boolean(memoryWrite.memory),
        outputId: memoryWrite.output?.id || null,
        provider:
          outputWithImage.asset?.provider || outputWithImage.metadata?.provider,
        model: outputWithImage.asset?.model || outputWithImage.metadata?.model,
        latencyMs:
          outputWithImage.asset?.latencyMs ||
          outputWithImage.metadata?.latencyMs,
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
        imageQuality,
      });
    }
  } catch (error) {
    await writeCreativeImageFailure({
      supabase,
      user,
      campaign,
      creativeOutput,
      executionPlan,
      operationId,
      error,
    });
    await completeUsageEvent({
      supabase,
      usageId,
      provider: creativeOutput.metadata?.provider,
      model: creativeOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.billableCredits,
      metadata: {
        ...creativeOutput.metadata,
        imageStatus: "failed",
        imageError: error.message,
        providerReportedTokens: false,
      },
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

async function safeWriteCreativeMemory({
  supabase,
  user,
  campaign,
  prompt,
  markdown,
  creativeOutput,
  memoryEvent,
  executionPlan,
  quality,
  operationId,
  imageStatus = "generating",
}) {
  if (executionPlan.mode !== "campaign" || !campaign) {
    return {
      output: creativeOutput,
      memory: { skipped: true, reason: "tool_mode" },
    };
  }

  const generatedAt = new Date().toISOString();
  const conceptEventRow = {
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
      operationId,
      imageStatus,
      generatedAt,
    },
    supersedes: null,
    created_by: user.id,
  };
  const { data, error } = await supabase
    .from("campaign_memory_events")
    .insert([conceptEventRow])
    .select();

  if (!error) {
    return {
      output: {
        type: executionPlan.task,
        title: creativeOutput.title,
        prompt,
        content: creativeOutput.asset?.imageUrl || markdown,
        metadata: {
          ...creativeOutput.metadata,
          imageStatus,
          operationId,
          generatedAt,
        },
      },
      memory: {
        saved: true,
        storage: "campaign_memory_events",
        event: data?.find((item) => item.artifact === "creative_concept") || null,
        events: data || [],
      },
    };
  }

  console.warn("Creative memory write failed; falling back to campaign_outputs:", {
    message: error.message,
    code: error.code,
  });

  const output = await createCampaignOutput({
    campaignId: campaign.id,
    module: "creative",
    type: executionPlan.task,
    title: creativeOutput.title,
    prompt,
    content: creativeOutput.asset?.imageUrl || markdown,
    metadata: {
      canonical: true,
      quality,
      memoryEvent: conceptEventRow,
      ...creativeOutput.metadata,
      imageStatus,
      operationId,
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
}

async function writeCreativeImageMemory({
  supabase,
  user,
  campaign,
  creativeOutput,
  imageMemoryEvent,
  executionPlan,
  imageQuality,
  operationId,
  imageStatus,
}) {
  if (!campaign || !imageMemoryEvent) return null;

  const generatedAt = new Date().toISOString();
  const imageEventRow = {
    campaign_id: campaign.id,
    type: imageMemoryEvent.artifact,
    module: imageMemoryEvent.module,
    artifact: imageMemoryEvent.artifact,
    approval_status:
      imageStatus === "ready" && imageQuality.approvalRequired
        ? "pending"
        : imageStatus === "ready"
          ? "auto_saved"
          : "rejected",
    confidence: imageQuality.score,
    risk_level: imageQuality.riskLevel,
    task: executionPlan.task,
    summary: imageMemoryEvent.summary,
    payload: {
      ...imageMemoryEvent.payload,
      operationId,
      imageStatus,
      generatedAt,
    },
    supersedes: null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("campaign_memory_events")
    .insert(imageEventRow)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Creative image memory write failed:", {
      operationId,
      campaignId: campaign.id,
      message: error.message,
      code: error.code,
    });
    throw error;
  }

  return data;
}

async function writeCreativeImageFailure({
  supabase,
  user,
  campaign,
  creativeOutput,
  executionPlan,
  operationId,
  error,
}) {
  if (!campaign) return null;

  const generatedAt = new Date().toISOString();
  const imageEventRow = {
    campaign_id: campaign.id,
    type: "image_asset",
    module: "creative",
    artifact: "image_asset",
    approval_status: "rejected",
    confidence: 0,
    risk_level: "medium",
    task: executionPlan.task,
    summary: `${creativeOutput.title} image generation failed`,
    payload: {
      type: creativeOutput.type,
      title: creativeOutput.title,
      task: executionPlan.task,
      operationId,
      imageStatus: "failed",
      error: error.message,
      metadata: creativeOutput.metadata || {},
      generatedAt,
    },
    supersedes: null,
    created_by: user.id,
  };

  const { data, error: writeError } = await supabase
    .from("campaign_memory_events")
    .insert(imageEventRow)
    .select()
    .maybeSingle();

  if (writeError) {
    console.error("Creative image failure memory write failed:", {
      operationId,
      campaignId: campaign.id,
      message: writeError.message,
      code: writeError.code,
    });
  }

  return data;
}
