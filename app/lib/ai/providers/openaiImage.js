const OpenAI = require("openai");

async function runOpenAIImage({
  prompt,
  width = 1024,
  height = 1024,
  size,
}) {
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing OPENAI_API_KEY");
    error.status = 401;
    throw error;
  }

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const client = new OpenAI({ apiKey });
  const normalizedSize = size || normalizeImageSize({ width, height });

  try {
    const response = await client.images.generate(
      {
        model,
        prompt: String(prompt || "").trim(),
        size: normalizedSize,
        n: 1,
      },
      {
        timeout: 60000,
      },
    );
    const image = response?.data?.[0] || {};
    const base64 = image.b64_json || "";

    if (!base64) {
      throw new Error("OpenAI image generation returned no base64 image data.");
    }

    return {
      success: true,
      provider: "openai",
      model,
      type: "image",
      imageData: base64,
      imageUrl: "",
      mimeType: "image/png",
      latencyMs: Date.now() - startedAt,
      usage: normalizeImageUsage(response?.usage),
      raw: response,
    };
  } catch (error) {
    console.error("OPENAI_IMAGE_SDK_FAILED", {
      name: error?.name,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
}

function normalizeImageSize({ width, height }) {
  const normalizedWidth = Number(width || 1024);
  const normalizedHeight = Number(height || 1024);

  if (normalizedWidth === 1536 || normalizedHeight === 1536) {
    return normalizedWidth > normalizedHeight ? "1536x1024" : "1024x1536";
  }

  return "1024x1024";
}

function normalizeImageUsage(usage = {}) {
  return {
    inputTokens: Number(usage.input_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    totalTokens: Number(usage.total_tokens || 0),
  };
}

module.exports = { runOpenAIImage };
