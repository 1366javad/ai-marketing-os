const POLLINATIONS_CHAT_URL = "https://gen.pollinations.ai/v1/chat/completions";
const POLLINATIONS_IMAGE_BASE_URL = "https://image.pollinations.ai/prompt";

function buildPollinationsImageUrl({
  prompt,
  width = 1024,
  height = 1024,
  seed,
}) {
  if (!prompt || prompt.trim().length < 10) {
    throw new Error("Prompt must be at least 10 characters long.");
  }

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: "true",
    private: "true",
    enhance: "true",
  });

  if (seed !== undefined && seed !== null) {
    params.set("seed", String(seed));
  }

  return `${POLLINATIONS_IMAGE_BASE_URL}/${encodeURIComponent(
    prompt.trim(),
  )}?${params.toString()}`;
}

async function runPollinationsImage({
  prompt,
  width = 1024,
  height = 1024,
  seed = Date.now(),
}) {
  const url = buildPollinationsImageUrl({
    prompt,
    width,
    height,
    seed,
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "image/*",
    },
  });

  if (!response.ok) {
    const error = new Error(
      `Pollinations image generation failed: ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return {
    success: true,
    provider: "pollinations",
    type: "image",
    imageData: base64,
    imageUrl: url,
    mimeType,
  };
}

async function runPollinationsText({
  systemPrompt,
  userPrompt,
  model = "openai",
  temperature = 0.7,
  maxTokens = 1200,
}) {
  const startedAt = Date.now();
  const apiKey = process.env.POLLINATIONS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing POLLINATIONS_API_KEY");
  }

  const response = await fetch(POLLINATIONS_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content: systemPrompt || "",
        },
        {
          role: "user",
          content: userPrompt || "",
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = new Error(
      `Pollinations text generation failed: ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }

  return {
    success: true,
    provider: "pollinations",
    model,
    type: "text",
    text: data?.choices?.[0]?.message?.content || "",
    latencyMs: Date.now() - startedAt,
    usage: {
      inputTokens: Number(data?.usage?.prompt_tokens || 0),
      outputTokens: Number(data?.usage?.completion_tokens || 0),
      totalTokens: Number(data?.usage?.total_tokens || 0),
    },
    raw: data,
  };
}

module.exports = {
  buildPollinationsImageUrl,
  runPollinationsImage,
  runPollinationsText,
};
