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
import { formatSeoMarkdown } from "@/app/lib/ai/agents/seo";
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
    const normalizedTask = normalizeSeoTask(body.section || body.task);
    const defaultPrompt = buildDefaultPrompt({ campaign, normalizedTask });
    const guard = validateInput(body.prompt || defaultPrompt);

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
        requestedModule: "seo",
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
        contextDbAdapter: createContextDbAdapter(campaign),
        eventsDbAdapter: createSupabaseEventsAdapter(supabase),
      },
      knowledgeOptions: createKnowledgeRuntimeOptions({ supabase, body, campaign }),
      memoryOptions: createSeoMemoryOptions({
        supabase,
        user,
        campaign,
        prompt: guard.normalizedPrompt,
      }),
    });
    const {
      agentOutput: seoOutput,
      memoryEvent,
      quality,
      contextSlice,
      memoryWrite,
    } = pipeline;

    if (!quality.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated SEO asset did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated SEO asset did not pass quality checks.",
          seoOutput,
          quality,
        },
        { status: 422 },
      );
    }

    const markdown = formatSeoMarkdown(seoOutput);
    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: seoOutput.metadata?.provider,
      model: seoOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.billableCredits,
      cost: seoOutput.metadata?.cost || 0,
      metadata: {
        ...seoOutput.metadata,
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
      output: memoryWrite.output || {
        type: normalizedTask,
        title: seoOutput.title,
        prompt: guard.normalizedPrompt,
        content: markdown,
        metadata: seoOutput.metadata,
      },
      seoOutput,
      executionPlan,
      quality,
      knowledgeDiagnostics: pipeline.knowledgeDiagnostics,
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
      console.error("SEO usage failure update failed:", usageError);
    }
    console.error("SEO Agent V2 route error:", error);

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

function normalizeSeoTask(task) {
  const normalized = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const map = {
    keyword: "keywords",
    keywords: "keywords",
    keyword_research: "keywords",
    clusters: "clusters",
    keyword_clusters: "clusters",
    keyword_cluster: "clusters",
    topics: "topics",
    topic_clusters: "topics",
    topic_cluster: "topics",
    strategy: "strategy",
    seo_strategy: "strategy",
    meta: "meta",
    meta_descriptions: "meta",
    meta_description: "meta",
    faq: "faq",
    faqs: "faq",
    faq_generation: "faq",
  };

  return map[normalized] || "keywords";
}

function buildDefaultPrompt({ campaign, normalizedTask }) {
  const campaignName = campaign?.name || campaign?.product_name || "this campaign";

  return `Generate ${normalizedTask.replace(/_/g, " ")} for ${campaignName}.`;
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

function createSeoMemoryOptions({
  supabase,
  user,
  campaign,
  prompt,
}) {
  return {
    createdBy: user.id,
    dbAdapter: createSupabaseMemoryWriter(supabase),
    onToolMode: ({ agentOutput }) => {
      const generatedAt = new Date().toISOString();
      return {
        output: {
          type: agentOutput.type,
          title: agentOutput.title,
          prompt,
          content: formatSeoMarkdown(agentOutput),
          metadata: {
            ...agentOutput.metadata,
            generatedAt,
          },
        },
        memory: { skipped: true, reason: "tool_mode" },
      };
    },
    onWriteSuccess: ({ agentOutput, canonicalEvent }) => ({
      type: canonicalEvent.task,
      title: agentOutput.title,
      prompt,
      content: formatSeoMarkdown(agentOutput),
      metadata: {
        ...agentOutput.metadata,
        generatedAt: new Date().toISOString(),
      },
    }),
    onWriteFailure: async ({ error, canonicalEvent, agentOutput, quality }) => {
    console.warn("SEO memory write failed; falling back to campaign_outputs:", {
      message: error.message,
      code: error.code,
    });
    const generatedAt = new Date().toISOString();
    const output = await createCampaignOutput({
      campaignId: campaign.id,
      module: "seo",
      type: canonicalEvent.task,
      title: agentOutput.title,
      prompt,
      content: formatSeoMarkdown(agentOutput),
      metadata: {
        canonical: true,
        quality,
        memoryEvent: canonicalEvent,
        ...agentOutput.metadata,
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
    },
  };
}
