import { NextResponse } from "next/server";
import { runTextProvider } from "@/app/lib/ai/providers";

export async function POST(request) {
  try {
    const { type, prompt } = await request.json();
    const userPrompt = prompt?.trim();

    if (!userPrompt || userPrompt.length < 10) {
      return NextResponse.json(
        { error: "Prompt must be at least 10 characters long." },
        { status: 400 },
      );
    }

    let systemPrompt =
      "You are a senior video marketing strategist. Return clear, practical marketing video planning copy.";

    if (type === "storyboard") {
      systemPrompt = `
Create a detailed storyboard for a short marketing video.
Return 5 to 7 scenes. For each scene include: scene title, visual direction, on-screen text, voiceover, and CTA.
`;
    }

    if (type === "script") {
      systemPrompt = `
Create a short-form marketing video script.
Include: hook, scene-by-scene script, voiceover, on-screen text, and CTA.
`;
    }

    const result = await runTextProvider({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
