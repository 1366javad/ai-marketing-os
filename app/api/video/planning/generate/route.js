import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import { runOrchestrator } from "@/app/lib/ai/orchestrator";
import { getCampaignContextSlice } from "@/app/lib/ai/campaign/getCampaignContextSlice";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { buildBrief } from "@/app/lib/ai/brief-builder";
import {
  ACTIVE_VIDEO_TASKS,
  formatVideoPlanningText,
  normalizeVideoTask,
  runVideoPlanning,
  toVideoMemoryEvent,
} from "@/app/lib/ai/video-planning";
import { runQualityChecks } from "@/app/lib/ai/quality";
import {
  getAiErrorMessage,
  getAiErrorStatus,
} from "@/app/lib/utils/aiErrorMessage";
import { logUsageEvent } from "@/app/lib/ai/usage/logUsageEvent";

export async function POST(request) {
  try {
    const supabase = await createClient();
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
    const contextSlice = await getCampaignContextSlice(
      executionPlan.campaignId,
      "video",
      task,
      {
        includePending: false,
        contextDbAdapter: createContextAdapter(campaign, body),
        eventsDbAdapter: createSupabaseEventsAdapter(supabase),
      },
    );
    const brief = {
      ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
      campaignName: campaign?.name || "",
      goal: body.goal || campaign?.goal || "",
      audience:
        body.audience ||
        campaign?.audience ||
        campaign?.target_audience ||
        "",
      offer: campaign?.product_name || campaign?.name || "",
      platform: body.platform || "Instagram",
      duration: body.duration || "30 seconds",
      cta: body.cta || "",
      visualStyle: body.visualStyle || "",
      direction: body.direction || "",
      relevantEvents: contextSlice.relevantEvents || [],
    };

    const videoOutput = await runVideoPlanning({ brief, executionPlan });
    const memoryEvent = toVideoMemoryEvent(videoOutput);
    const quality = runQualityChecks(memoryEvent, executionPlan, brief);

    if (!quality.passed) {
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

    const content = formatVideoPlanningText(videoOutput);
    const generatedAt = new Date().toISOString();
    const eventRow = {
      campaign_id: campaign.id,
      type: memoryEvent.artifact,
      module: memoryEvent.module,
      artifact: memoryEvent.artifact,
      approval_status: "pending",
      confidence: quality.score,
      risk_level: "medium",
      task,
      summary: memoryEvent.summary,
      payload: {
        ...memoryEvent.payload,
        generatedAt,
      },
      supersedes: null,
      created_by: user.id,
    };
    const { data: savedEvent, error: memoryError } = await supabase
      .from("campaign_memory_events")
      .insert(eventRow)
      .select()
      .single();

    let output = {
      type: task,
      title: videoOutput.title,
      content,
      metadata: { ...videoOutput.metadata, generatedAt },
    };
    let memory = {
      saved: !memoryError,
      storage: "campaign_memory_events",
      event: savedEvent || null,
    };

    if (memoryError) {
      console.warn("Video planning memory fallback:", memoryError.message);
      output = await createCampaignOutput({
        campaignId: campaign.id,
        module: "video",
        type: task,
        title: videoOutput.title,
        prompt: guard.normalizedPrompt,
        content,
        metadata: {
          canonicalPlanning: true,
          memoryEvent: eventRow,
          quality,
          ...videoOutput.metadata,
          generatedAt,
        },
      });
      memory = {
        saved: false,
        fallbackSaved: true,
        storage: "campaign_outputs",
        error: memoryError.message,
      };
    }

    await logUsageEvent({
      supabase,
      userId: user.id,
      campaign,
      module: "video",
      artifact: task,
      requestType: "agent_generation",
      metadata: videoOutput.metadata,
    });

    return Response.json({
      success: true,
      videoOutput: {
        ...videoOutput,
        metadata: { ...videoOutput.metadata, generatedAt },
      },
      output,
      quality,
      executionPlan,
      memory,
    });
  } catch (error) {
    console.error("Video planning route error:", error);
    return Response.json(
      { success: false, error: getAiErrorMessage(error) },
      { status: getAiErrorStatus(error) },
    );
  }
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
