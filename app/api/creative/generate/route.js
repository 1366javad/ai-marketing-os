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
  runCreativeAgent,
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

    const creativeOutput = await runCreativeAgent({
      brief,
      executionPlan,
    });
    const memoryEvent = toCreativeMemoryEvent(creativeOutput, {
      brief,
      executionPlan,
    });
    const imageMemoryEvent = toImageAssetMemoryEvent(creativeOutput, {
      brief,
      executionPlan,
    });
    const quality = runQualityChecks(memoryEvent, executionPlan, brief);
    const imageQuality = runQualityChecks(
      imageMemoryEvent,
      executionPlan,
      brief,
    );

    if (!creativeOutput.review?.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated image did not reach the image review threshold after retry.",
        metadata: { review: creativeOutput.review },
      });
      return Response.json(
        {
          success: false,
          error:
            "Generated image did not reach the image review threshold after retry.",
          creativeOutput,
          review: creativeOutput.review,
        },
        { status: 422 },
      );
    }

    if (!quality.passed || !imageQuality.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated creative or image asset did not pass quality checks.",
        metadata: { quality, imageQuality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated creative or image asset did not pass quality checks.",
          creativeOutput,
          quality,
          imageQuality,
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
      imageMemoryEvent,
      executionPlan,
      quality,
      imageQuality,
    });

    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: creativeOutput.asset?.provider || creativeOutput.metadata?.provider,
      model: creativeOutput.asset?.model || creativeOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.requiredCredits,
      cost: creativeOutput.metadata?.cost || 0,
      metadata: {
        ...creativeOutput.metadata,
        memorySaved: Boolean(memoryWrite.memory),
        outputId: memoryWrite.output?.id || null,
        provider: creativeOutput.asset?.provider || creativeOutput.metadata?.provider,
        model: creativeOutput.asset?.model || creativeOutput.metadata?.model,
        latencyMs:
          creativeOutput.asset?.latencyMs || creativeOutput.metadata?.latencyMs,
        strategyProvider: creativeOutput.metadata?.provider,
        strategyModel: creativeOutput.metadata?.model,
        assetProvider: creativeOutput.asset?.provider || null,
        assetModel: creativeOutput.asset?.model || null,
        providerReportedTokens: false,
      },
    });

    return Response.json({
      success: true,
      output: memoryWrite.output || {
        type: normalizedTask,
        title: creativeOutput.title,
        prompt: guard.normalizedPrompt,
        content: creativeOutput.asset?.imageUrl || markdown,
        metadata: creativeOutput.metadata,
      },
      creativeOutput,
      executionPlan,
      quality,
      imageQuality,
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
  imageMemoryEvent,
  executionPlan,
  quality,
  imageQuality,
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
      generatedAt,
    },
    supersedes: null,
    created_by: user.id,
  };
  const imageEventRow = {
    campaign_id: campaign.id,
    type: imageMemoryEvent.artifact,
    module: imageMemoryEvent.module,
    artifact: imageMemoryEvent.artifact,
    approval_status:
      creativeOutput.review?.passed && imageQuality.approvalRequired
        ? "pending"
        : creativeOutput.review?.passed
          ? "auto_saved"
          : "rejected",
    confidence: imageQuality.score,
    risk_level: imageQuality.riskLevel,
    task: executionPlan.task,
    summary: imageMemoryEvent.summary,
    payload: {
      ...imageMemoryEvent.payload,
      generatedAt,
    },
    supersedes: null,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("campaign_memory_events")
    .insert([conceptEventRow, imageEventRow])
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
      imageQuality,
      memoryEvent: conceptEventRow,
      imageMemoryEvent: imageEventRow,
      ...creativeOutput.metadata,
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
