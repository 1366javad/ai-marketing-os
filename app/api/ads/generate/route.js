import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import { runOrchestrator } from "@/app/lib/ai/orchestrator";
import { getCampaignContextSlice } from "@/app/lib/ai/campaign/getCampaignContextSlice";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { buildBrief } from "@/app/lib/ai/brief-builder";
import {
  formatAdsMarkdown,
  runAdsAgent,
  toAdsMemoryEvent,
} from "@/app/lib/ai/agents/ads";
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
    const normalizedTask = normalizeAdsTask(body.section || body.task);
    const prompt = buildPrompt({ body, campaign, normalizedTask });
    const guard = validateInput(prompt);

    if (guard.status !== "valid") {
      return Response.json(
        {
          success: false,
          error: guard.userMessage,
          guard,
        },
        { status: guard.status === "blocked" ? 403 : 422 },
      );
    }

    const executionPlan = runOrchestrator(
      {
        campaignId: body.campaignId || null,
        requestedModule: "ads",
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
      requestedModule: "ads",
      normalizedTask,
      normalizedPrompt: body.prompt?.trim() || "",
      campaignName: campaign?.name || "",
      goal: body.goal?.trim() || contextSlice?.context?.goal || campaign?.goal || "",
      audience:
        body.audience?.trim() ||
        contextSlice?.context?.audience ||
        campaign?.target_audience ||
        "",
      offer:
        body.offer?.trim() ||
        contextSlice?.context?.offer ||
        campaign?.product_name ||
        campaign?.name ||
        "",
      budget: body.budget?.trim() || "",
      platforms: resolvePlatforms(normalizedTask),
      relevantEvents: contextSlice?.relevantEvents || [],
    };

    const adsOutput = await runAdsAgent({ brief, executionPlan });
    const memoryEvent = toAdsMemoryEvent(adsOutput, {
      brief,
      executionPlan,
    });
    const quality = runQualityChecks(memoryEvent, executionPlan, brief);

    if (!quality.passed) {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: "Generated ads did not pass quality checks.",
        metadata: { quality },
      });
      return Response.json(
        {
          success: false,
          error: "Generated ads did not pass quality checks.",
          adsOutput,
          quality,
        },
        { status: 422 },
      );
    }

    const markdown = formatAdsMarkdown(adsOutput);
    const memoryWrite = await writeAdsMemory({
      supabase,
      user,
      campaign,
      prompt: guard.normalizedPrompt,
      markdown,
      adsOutput,
      memoryEvent,
      executionPlan,
      quality,
    });

    await completeUsageEvent({
      supabase,
      usageId: usage?.id,
      provider: adsOutput.metadata?.provider,
      model: adsOutput.metadata?.model,
      status: "completed",
      creditsUsed: creditCheck.billableCredits,
      cost: adsOutput.metadata?.cost || 0,
      metadata: {
        ...adsOutput.metadata,
        memorySaved: Boolean(memoryWrite.memory),
        outputId: memoryWrite.output?.id || null,
        internalCreditBypass: Boolean(creditCheck.internalBypass),
        internalCreditBypassReason: creditCheck.internalBypassReason,
      },
    });

    return Response.json({
      success: true,
      output: memoryWrite.output,
      adsOutput,
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
      console.error("Ads usage failure update failed:", usageError);
    }
    console.error("Ads Agent V2 route error:", error);

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

function normalizeAdsTask(task) {
  const normalized = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const map = {
    google: "google_ads",
    google_ads: "google_ads",
    meta: "meta_ads",
    facebook: "meta_ads",
    instagram: "meta_ads",
    instagram_ad: "meta_ads",
    meta_ads: "meta_ads",
    linkedin: "linkedin_ads",
    linkedin_ads: "linkedin_ads",
    tiktok: "tiktok_ads",
    tiktok_ads: "tiktok_ads",
    package: "campaign_package",
    campaign_package: "campaign_package",
  };

  return map[normalized] || "google_ads";
}

function buildPrompt({ body, campaign, normalizedTask }) {
  return [
    `Create ${normalizedTask.replace(/_/g, " ")} advertising for ${
      campaign?.name || "this campaign"
    }.`,
    body.goal ? `Goal: ${body.goal}.` : "",
    body.audience ? `Audience: ${body.audience}.` : "",
    body.offer ? `Offer: ${body.offer}.` : "",
    body.budget ? `Budget: ${body.budget}.` : "",
    body.prompt || "",
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
      offer: body.offer || campaign.product_name || campaign.name || "",
      goal: body.goal || campaign.goal || "",
      audience:
        body.audience || campaign.audience || campaign.target_audience || "",
      positioning: campaign.brand_description || campaign.notes || "",
      valueProposition: campaign.brand_description || "",
      tone: "professional",
      platforms: resolvePlatforms(normalizeAdsTask(body.section || body.task)),
      competitors: [],
      status: campaign.status || "draft",
      createdAt: campaign.created_at || "",
      updatedAt: campaign.updated_at || "",
    };
  };
}

async function writeAdsMemory({
  supabase,
  user,
  campaign,
  prompt,
  markdown,
  adsOutput,
  memoryEvent,
  executionPlan,
  quality,
}) {
  const generatedAt = new Date().toISOString();
  const fallbackOutput = {
    type: executionPlan.task,
    title: adsOutput.title,
    prompt,
    content: markdown,
    metadata: {
      ...adsOutput.metadata,
      generatedAt,
    },
  };

  if (executionPlan.mode !== "campaign" || !campaign) {
    return {
      output: fallbackOutput,
      memory: { skipped: true, reason: "tool_mode" },
    };
  }

  const eventRow = {
    campaign_id: campaign.id,
    type: memoryEvent.artifact,
    module: memoryEvent.module,
    artifact: memoryEvent.artifact,
    approval_status: "pending",
    confidence: quality.score,
    risk_level: "high",
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
      output: fallbackOutput,
      memory: {
        saved: true,
        storage: "campaign_memory_events",
        event: data,
      },
    };
  }

  console.warn("Ads memory write failed; falling back to campaign_outputs:", {
    message: error.message,
    code: error.code,
  });

  const output = await createCampaignOutput({
    campaignId: campaign.id,
    module: "ads",
    type: executionPlan.task,
    title: adsOutput.title,
    prompt,
    content: markdown,
    metadata: {
      canonical: true,
      quality,
      memoryEvent: eventRow,
      ...adsOutput.metadata,
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

function resolvePlatforms(task) {
  const map = {
    google_ads: ["google"],
    meta_ads: ["facebook"],
    linkedin_ads: ["linkedin"],
    tiktok_ads: ["tiktok"],
    campaign_package: [],
  };
  return map[task] || ["google"];
}
