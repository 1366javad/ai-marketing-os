import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

export async function runVideo({ prompt }) {
  if (!prompt || prompt.trim().length < 10) {
    throw new Error("Prompt too short for video generation");
  }

  console.log("Generating video with prompt:", prompt);

  const video = await client.textToVideo({
    provider: "fal-ai",
    model: "Wan-AI/Wan2.2-T2V-A14B",
    inputs: prompt,
  });

  const arrayBuffer = await video.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    success: true,
    provider: "wan-video",
    mimeType: "video/mp4",
    videoData: base64,
  };
}
