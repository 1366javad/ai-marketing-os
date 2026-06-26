import { NextResponse } from "next/server";
import { runPollinationsVideo } from "@/app/lib/ai/legacy/providers/pollinations";
import {
  buildMarketingBrief,
  buildMarketingStrategy,
  validateMarketingInput,
} from "@/app/lib/ai/legacy/marketing";
import {
  getAiErrorMessage,
  getAiErrorStatus,
} from "@/app/lib/utils/aiErrorMessage";

const VIDEO_MODELS = new Set(["wan-fast", "veo", "seedance-pro"]);

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = body.prompt?.trim();
    const model = VIDEO_MODELS.has(body.model) ? body.model : "wan-fast";
    const guard = validateMarketingInput({
      prompt,
      module: "video",
    });

    if (guard.status !== "valid") {
      const statusCode = guard.status === "blocked" ? 403 : 422;

      return NextResponse.json(
        {
          success: false,
          error: guard.userMessage,
          guard,
        },
        { status: statusCode },
      );
    }

    const briefResult = buildMarketingBrief({
      prompt: guard.normalizedPrompt,
      module: "video",
    });
    const strategy = buildMarketingStrategy({
      brief: briefResult.brief,
      module: "creative",
      mode: "video-beta",
    });
    const enhancedPrompt = buildVideoPrompt({
      prompt: guard.normalizedPrompt,
      brief: briefResult.brief,
      strategy,
    });

    const result = await runPollinationsVideo({
      prompt: enhancedPrompt,
      model,
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      videoData: result.videoData,
      mimeType: result.mimeType,
      model: result.model,
      remoteUrl: result.remoteUrl,
      raw: result.raw,
      provider: result.provider,
      metadata: {
        beta: true,
        model,
        originalPrompt: guard.normalizedPrompt,
        enhancedPrompt,
        brief: briefResult.brief,
        strategy,
      },
    });
  } catch (error) {
    console.error("Pollinations Video Error:", error);

    return NextResponse.json(
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

function buildVideoPrompt({ prompt, brief, strategy }) {
  const parts = [
    prompt,
    "short marketing video",
    "clear subject",
    "cinematic motion",
    "high quality lighting",
    "platform-ready composition",
    brief?.offer ? `offer: ${brief.offer}` : "",
    brief?.audience ? `target audience: ${brief.audience}` : "",
    brief?.tone ? `tone: ${brief.tone}` : "",
    strategy?.primaryAngle ? `marketing angle: ${strategy.primaryAngle}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}
