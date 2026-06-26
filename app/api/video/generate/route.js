import { NextResponse } from "next/server";
import { runPollinationsVideo } from "@/app/lib/ai/legacy/providers/pollinations";
import {
  getAiErrorMessage,
  getAiErrorStatus,
} from "@/app/lib/utils/aiErrorMessage";

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const result = await runPollinationsVideo({
      prompt,
      model: body.model || "wan-fast",
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      videoData: result.videoData,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
      remoteUrl: result.remoteUrl,
    });
  } catch (error) {
    console.error("VIDEO ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: getAiErrorMessage(error),
      },
      { status: getAiErrorStatus(error) },
    );
  }
}
