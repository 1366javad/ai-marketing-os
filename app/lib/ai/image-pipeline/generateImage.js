const { runPollinationsImage } = require("../providers/pollinations");
const { runOpenAIImage } = require("../providers/openaiImage");

async function generateImage({ provider, prompt, width = 1024, height = 1024 }) {
  if (provider === "openai") {
    const result = await runOpenAIImage({
      prompt: prompt.text,
      width,
      height,
    });

    return {
      provider,
      model: result.model || "",
      mimeType: result.mimeType || "image/png",
      imageData: result.imageData || "",
      remoteUrl: result.imageUrl || "",
      latencyMs: result.latencyMs || 0,
      usage: result.usage || null,
    };
  }

  if (provider !== "pollinations") {
    throw new Error(`Image provider "${provider}" is not configured.`);
  }

  const result = await runPollinationsImage({
    prompt: prompt.text,
    width,
    height,
  });

  return {
    provider,
    model: "pollinations",
    mimeType: result.mimeType || "image/jpeg",
    imageData: result.imageData || "",
    remoteUrl: result.imageUrl || "",
    latencyMs: result.latencyMs || 0,
    usage: result.usage || null,
  };
}

module.exports = { generateImage };
