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
import { formatResearchMarkdown } from "@/app/lib/ai/agents/research";
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
  console.log("========== RESEARCH ROUTE START ==========");
  console.log(new Date().toISOString());

  const requestStartedAt = Date.now();
  const requestId = crypto.randomUUID();
  const log = (checkpoint, details = {}) => {
    console.log(`[Research:${requestId}] ${checkpoint}`, {
      requestId,
      elapsedMs: Date.now() - requestStartedAt,
      timestamp: new Date().toISOString(),
      ...details,
    });
  };
  const logError = (checkpoint, error) => {
    console.error(`[Research:${requestId}] ${checkpoint}`, {
      requestId,
      elapsedMs: Date.now() - requestStartedAt,
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack,
      error,
    });
  };

  log("REQUEST START", {
    currentTimestamp: new Date().toISOString(),
  });
  log("STEP 1 Research route entered.");

  let supabase;
  let usage;
  try {
    try {
      supabase = await createClient();
      log("STEP 2 Supabase client created.");
    } catch (error) {
      logError("STEP 2 Supabase client creation failed.", error);
      throw error;
    }

    log("STEP 3 Authentication started.");
    let user;
    let authError;
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user;
      authError = authResult.error;
      log("STEP 4 Authentication finished.", {
        userId: user?.id || null,
        authError: authError?.message || null,
      });
    } catch (error) {
      logError("STEP 4 Authentication failed.", error);
      throw error;
    }

    if (!user) {
      log("REQUEST END Unauthorized.", {
        totalElapsedMs: Date.now() - requestStartedAt,
      });
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      logError("Request body parsing failed.", error);
      throw error;
    }

    const normalizedTask = normalizeResearchTask(body.section || body.task);
    const guard = validateInput(body.prompt);

    if (guard.status !== "valid") {
      const statusCode = guard.status === "blocked" ? 403 : 422;

      log("REQUEST END Input guard rejected request.", {
        totalElapsedMs: Date.now() - requestStartedAt,
        guardStatus: guard.status,
      });
      return Response.json(
        {
          success: false,
          error: guard.userMessage,
          guard,
        },
        { status: statusCode },
      );
    }

    let campaign = null;
    if (body.campaignId) {
      try {
        campaign = await getCampaignById(body.campaignId);
      } catch (error) {
        logError("STEP 5 Campaign load failed.", error);
        throw error;
      }
    }
    log("STEP 5 Campaign loaded.", {
      campaignId: body.campaignId || campaign?.id || null,
      campaignFound: Boolean(campaign),
    });

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
    let creditCheck;
    try {
      creditCheck = await checkCreditLimit({
        supabase,
        userId: user.id,
        userEmail: user.email,
        module: executionPlan.module,
        artifact: executionPlan.task,
        isRegenerate: Boolean(body.regenerate),
      });
    } catch (error) {
      logError("Credit limit check failed.", error);
      throw error;
    }

    if (!creditCheck.allowed) {
      log("REQUEST END Credit limit rejected request.", {
        totalElapsedMs: Date.now() - requestStartedAt,
      });
      return createCreditLimitResponse(creditCheck);
    }
    if (creditCheck.internalBypass) {
      log("Credit gate bypassed for internal/test request.", {
        reason: creditCheck.internalBypassReason,
        userEmail: user.email || null,
        remainingCredits: creditCheck.remainingCredits,
        requiredCredits: creditCheck.requiredCredits,
      });
    }

    try {
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
    } catch (error) {
      logError("Usage event start failed.", error);
      throw error;
    }

    log("STEP 6 Canonical pipeline started.");
    const pipeline = await executeCanonicalPipeline({
      normalizedPrompt: guard.normalizedPrompt,
      executionPlan,
      contextOptions: {
        contextDbAdapter: createContextDbAdapter(campaign),
        eventsDbAdapter: createSupabaseEventsAdapter(supabase),
      },
      memoryOptions: createResearchMemoryOptions({
        supabase,
        user,
        campaign,
        prompt: guard.normalizedPrompt,
      }),
    });
    const {
      agentOutput: researchOutput,
      memoryEvent,
      quality,
      contextSlice,
      memoryWrite,
    } = pipeline;
    log("STEP 18 Canonical pipeline finished.", {
      providerName: researchOutput?.metadata?.provider || "unknown",
      modelName: researchOutput?.metadata?.model || "unknown",
      qualityPassed: quality.passed,
      memorySaved: Boolean(memoryWrite?.memory?.saved),
    });

    if (!quality.passed) {
      console.error("Research quality repair failed:", {
        provider: researchOutput.metadata?.provider,
        issues: quality.issues,
        counts: summarizeResearchCounts(researchOutput),
      });
      try {
        await failUsageEvent({
          supabase,
          usageId: usage?.id,
          error: "Generated research did not pass quality checks.",
          metadata: { quality },
        });
      } catch (error) {
        logError("Usage event fail update failed after quality failure.", error);
        throw error;
      }
      log("REQUEST END Quality failed.", {
        totalElapsedMs: Date.now() - requestStartedAt,
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

    try {
      await completeUsageEvent({
        supabase,
        usageId: usage?.id,
        provider: researchOutput.metadata?.provider,
        model: researchOutput.metadata?.model,
        status: "completed",
        creditsUsed: creditCheck.billableCredits,
        cost: researchOutput.metadata?.cost || 0,
        metadata: {
          ...researchOutput.metadata,
          memorySaved: Boolean(memoryWrite.memory),
          outputId: memoryWrite.output?.id || null,
          internalCreditBypass: Boolean(creditCheck.internalBypass),
          internalCreditBypassReason: creditCheck.internalBypassReason,
        },
      });
    } catch (error) {
      logError("Usage event completion failed.", error);
      throw error;
    }

    log("STEP 19 Sending response.");
    log("REQUEST END", {
      totalElapsedMs: Date.now() - requestStartedAt,
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
    logError("Research Agent V2 route error.", error);
    try {
      await failUsageEvent({
        supabase,
        usageId: usage?.id,
        error: error.message,
        metadata: {
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
      });
    } catch (failUsageError) {
      logError("Usage event fail update failed in route catch.", failUsageError);
    }

    console.error("Research Agent V2 route error:", error);
    log("REQUEST END Error response.", {
      totalElapsedMs: Date.now() - requestStartedAt,
    });

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

function createResearchMemoryOptions({
  supabase,
  user,
  campaign,
  prompt,
}) {
  const formatOutput = (agentOutput, task) => ({
    type: task,
    title: agentOutput.title,
    prompt,
    content: formatResearchMarkdown(agentOutput),
    metadata: {
      ...agentOutput.metadata,
      generatedAt: new Date().toISOString(),
    },
  });

  return {
    createdBy: user.id,
    dbAdapter: createSupabaseMemoryWriter(supabase),
    onToolMode: ({ agentOutput, memoryEvent }) => ({
      output: formatOutput(agentOutput, memoryEvent.artifact),
      memory: { skipped: true, reason: "tool_mode" },
    }),
    onWriteSuccess: ({ agentOutput, canonicalEvent }) =>
      formatOutput(agentOutput, canonicalEvent.task),
    onWriteFailure: async ({
      error: insertError,
      canonicalEvent,
      agentOutput,
      quality,
    }) => {
    console.warn("Research memory write failed; falling back to campaign_outputs:", {
      message: insertError.message,
      code: insertError.code,
    });

    try {
      const output = await createCampaignOutput({
        campaignId: campaign.id,
        module: "research",
        type: canonicalEvent.task,
        title: agentOutput.title,
        prompt,
        content: formatResearchMarkdown(agentOutput),
        metadata: {
          canonical: true,
          quality,
          memoryEvent: canonicalEvent,
          ...agentOutput.metadata,
          generatedAt: new Date().toISOString(),
        },
      });

      return {
        output,
        memory: {
          saved: false,
          fallbackSaved: true,
          storage: "campaign_outputs",
          error: insertError.message,
        },
      };
    } catch (fallbackError) {
      console.warn("Research fallback write failed:", fallbackError);

      return {
        output: formatOutput(agentOutput, canonicalEvent.task),
        memory: {
          saved: false,
          fallbackSaved: false,
          error: insertError.message,
          fallbackError: fallbackError.message,
        },
      };
    }
    },
  };
}
