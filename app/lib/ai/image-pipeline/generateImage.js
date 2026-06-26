const { runPollinationsImage } = require("../providers/pollinations");

async function generateImage({ provider, prompt, width = 1024, height = 1024 }) {
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
    mimeType: result.mimeType || "image/jpeg",
    imageData: result.imageData || "",
    remoteUrl: result.imageUrl || "",
  };
}

module.exports = { generateImage };
