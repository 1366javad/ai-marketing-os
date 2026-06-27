import { createClient } from "@/app/lib/supabase/server";
import { getCampaignById } from "@/app/lib/db/campaigns";
import { createCampaignOutput } from "@/app/lib/db/campaignOutputs";
import { validateInput } from "@/app/lib/ai/input-guard";
import { runOrchestrator } from "@/app/lib/ai/orchestrator";
import { getCampaignContextSlice } from "@/app/lib/ai/campaign/getCampaignContextSlice";
import { createSupabaseEventsAdapter } from "@/app/lib/ai/campaign/events/createSupabaseEventsAdapter";
import { buildBrief } from "@/app/lib/ai/brief-builder";
import {
  formatResearchMarkdown,
  runResearchAgent,
  repairResearchOutput,
  toResearchMemoryEvent,
} from "@/app/lib/ai/agents/research";
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
        module: executionPlan.module,
        artifact: executionPlan.task,
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

    try {
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
    } catch (error) {
      logError("Usage event start failed.", error);
      throw error;
    }

    log("STEP 6 Context Builder started.");
    let contextSlice = null;
    if (executionPlan.needsContext) {
      try {
        contextSlice = await getCampaignContextSlice(
          executionPlan.campaignId,
          executionPlan.module,
          executionPlan.task,
          {
            includePending: false,
            contextDbAdapter: createContextDbAdapter(campaign),
            eventsDbAdapter: createSupabaseEventsAdapter(supabase),
          },
        );
      } catch (error) {
        logError("STEP 7 Context Builder failed.", error);
        throw error;
      }
    }
    log("STEP 7 Context Builder finished.");

    log("STEP 8 Brief Builder started.");
    let brief;
    try {
      brief = {
        ...buildBrief(guard.normalizedPrompt, executionPlan, contextSlice),
        requestedModule: "research",
        normalizedTask,
        normalizedPrompt: guard.normalizedPrompt,
        relevantEvents: contextSlice?.relevantEvents || [],
      };
      log("STEP 9 Brief Builder finished.");
    } catch (error) {
      logError("STEP 9 Brief Builder failed.", error);
      throw error;
    }

    log("STEP 10 Provider selected.", {
      providerName:
        process.env.AI_PROVIDER || process.env.TEXT_PROVIDER || "unknown",
      modelName:
        process.env.AI_MODEL ||
        process.env.GEMINI_MODEL ||
        process.env.GROQ_MODEL ||
        "unknown",
    });
    log("STEP 11 Provider request started.");
    const providerStartedAt = Date.now();
    let researchOutput;
    try {
      researchOutput = await runResearchAgent({
        brief,
        executionPlan,
      });
      log("STEP 12 Provider request finished.", {
        responseLength: JSON.stringify(researchOutput || {}).length,
        providerLatency: Date.now() - providerStartedAt,
        providerName: researchOutput?.metadata?.provider || "unknown",
        modelName: researchOutput?.metadata?.model || "unknown",
      });
    } catch (error) {
      logError("STEP 12 Provider request failed.", error);
      throw error;
    }

    log("STEP 13 Normalizer started.");
    let memoryEvent;
    try {
      memoryEvent = toResearchMemoryEvent(researchOutput, {
        brief,
        executionPlan,
      });
      log("STEP 14 Normalizer finished.");
    } catch (error) {
      logError("STEP 14 Normalizer failed.", error);
      throw error;
    }

    log("STEP 15 Quality Layer started.");
    let quality;
    try {
      quality = runQualityChecks(memoryEvent, executionPlan, brief);
      log("STEP 16 Quality Layer finished.");
    } catch (error) {
      logError("STEP 16 Quality Layer failed.", error);
      throw error;
    }

    if (!quality.passed) {
      console.warn("Research quality repair started:", {
        provider: researchOutput.metadata?.provider,
        issues: quality.issues,
        counts: summarizeResearchCounts(researchOutput),
      });
      try {
        researchOutput = await repairResearchOutput({
          brief,
          executionPlan,
          previousOutput: researchOutput,
          issues: quality.issues,
        });
      } catch (error) {
        logError("Research quality repair failed during provider call.", error);
        throw error;
      }
      log("STEP 13 Normalizer started.", { phase: "repair" });
      try {
        memoryEvent = toResearchMemoryEvent(researchOutput, {
          brief,
          executionPlan,
        });
        log("STEP 14 Normalizer finished.", { phase: "repair" });
      } catch (error) {
        logError("STEP 14 Normalizer failed.", error);
        throw error;
      }
      log("STEP 15 Quality Layer started.", { phase: "repair" });
      try {
        quality = runQualityChecks(memoryEvent, executionPlan, brief);
        log("STEP 16 Quality Layer finished.", { phase: "repair" });
      } catch (error) {
        logError("STEP 16 Quality Layer failed.", error);
        throw error;
      }
      console.log("Research quality repair result:", {
        provider: researchOutput.metadata?.provider,
        passed: quality.passed,
        issues: quality.issues,
        counts: summarizeResearchCounts(researchOutput),
      });
    }

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
    log("STEP 17 Memory write started.");
    let memoryWrite;
    try {
      memoryWrite = await safeWriteResearchMemory({
        supabase,
        user,
        campaign,
        prompt: guard.normalizedPrompt,
        markdown,
        researchOutput,
        memoryEvent,
        executionPlan,
        quality,
        log,
        logError,
      });
      log("STEP 18 Memory write finished.");
    } catch (error) {
      logError("STEP 18 Memory write failed.", error);
      throw error;
    }

    try {
      await completeUsageEvent({
        supabase,
        usageId: usage?.id,
        provider: researchOutput.metadata?.provider,
        model: researchOutput.metadata?.model,
        status: "completed",
        creditsUsed: creditCheck.requiredCredits,
        cost: researchOutput.metadata?.cost || 0,
        metadata: {
          ...researchOutput.metadata,
          memorySaved: Boolean(memoryWrite.memory),
          outputId: memoryWrite.output?.id || null,
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
      throw failUsageError;
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

async function safeWriteResearchMemory({
  supabase,
  user,
  campaign,
  prompt,
  markdown,
  researchOutput,
  memoryEvent,
  executionPlan,
  quality,
  log,
  logError,
}) {
  if (executionPlan.mode !== "campaign" || !campaign) {
    const generatedAt = new Date().toISOString();

    return {
      output: {
        type: executionPlan.task,
        title: researchOutput.title,
        prompt,
        content: markdown,
        metadata: {
          ...researchOutput.metadata,
          generatedAt,
        },
      },
      memory: { skipped: true, reason: "tool_mode" },
    };
  }

  const generatedAt = new Date().toISOString();
  const eventRow = {
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

  let data;
  let error;
  try {
    const insertResult = await supabase
      .from("campaign_memory_events")
      .insert(eventRow)
      .select()
      .single();
    data = insertResult.data;
    error = insertResult.error;
  } catch (insertError) {
    logError?.("Campaign memory event insert threw.", insertError);
    throw insertError;
  }

  if (!error) {
    return {
      output: {
        type: executionPlan.task,
        title: researchOutput.title,
        prompt,
        content: markdown,
        metadata: {
          ...researchOutput.metadata,
          generatedAt,
        },
      },
      memory: { saved: true, storage: "campaign_memory_events", event: data },
    };
  }

  console.warn("Research memory write failed; falling back to campaign_outputs:", {
    message: error.message,
    code: error.code,
  });

  try {
    log?.("Campaign output fallback write started.");
    const output = await createCampaignOutput({
      campaignId: campaign.id,
      module: "research",
      type: executionPlan.task,
      title: researchOutput.title,
      prompt,
      content: markdown,
      metadata: {
        canonical: true,
        quality,
        memoryEvent: eventRow,
        ...researchOutput.metadata,
        generatedAt,
      },
    });
    log?.("Campaign output fallback write finished.");

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
    logError?.("Campaign output fallback write failed.", fallbackError);
    console.warn("Research fallback write failed:", fallbackError);

    return {
      output: {
        type: executionPlan.task,
        title: researchOutput.title,
        prompt,
        content: markdown,
        metadata: {
          ...researchOutput.metadata,
          generatedAt,
        },
      },
      memory: {
        saved: false,
        fallbackSaved: false,
        error: error.message,
        fallbackError: fallbackError.message,
      },
    };
  }
}
