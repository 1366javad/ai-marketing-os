const POLLINATIONS_IMAGE_BASE_URL = "https://image.pollinations.ai/prompt";
const POLLINATIONS_CHAT_URL = "https://gen.pollinations.ai/v1/chat/completions";
const POLLINATIONS_VIDEO_URL =
  process.env.POLLINATIONS_VIDEO_URL || "https://gen.pollinations.ai/video";
const POLLINATIONS_VIDEO_MODELS = new Set(["wan-fast", "veo", "seedance-pro"]);

export function buildPollinationsImageUrl({
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

export async function runPollinationsImage({
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
    throw new Error(`Pollinations image generation failed: ${response.status}`);
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

export async function runPollinationsText({
  systemPrompt,
  userPrompt,
  model = "openai",
  temperature = 0.7,
}) {
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
    type: "text",
    text: data?.choices?.[0]?.message?.content || "",
    raw: data,
  };
}

export async function runPollinationsVideo({
  prompt,
  model = "wan-fast",
}) {
  const apiKey = process.env.POLLINATIONS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing POLLINATIONS_API_KEY");
  }

  if (!prompt || prompt.trim().length < 10) {
    throw new Error("Prompt must be at least 10 characters long.");
  }

  const selectedModel = POLLINATIONS_VIDEO_MODELS.has(model)
    ? model
    : "wan-fast";
  const params = new URLSearchParams({
    model: selectedModel,
  });
  const url = `${POLLINATIONS_VIDEO_URL}/${encodeURIComponent(
    prompt.trim(),
  )}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "video/mp4,application/json",
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const errorBody = await readResponseText(response);
    const error = new Error(
      `Pollinations video generation failed: ${response.status}${
        errorBody ? ` ${errorBody}` : ""
      }`,
    );
    error.status = response.status;
    throw error;
  }

  if (contentType.includes("application/json")) {
    const data = await response.json();

    if (data.error) {
      const error = new Error(
        `Pollinations video generation failed: ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }

    return {
      success: true,
      provider: "pollinations",
      type: "video",
      model: selectedModel,
      videoUrl: data?.data?.[0]?.url || data?.url || null,
      raw: data,
    };
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = contentType || "video/mp4";

  return {
    success: true,
    provider: "pollinations",
    type: "video",
    model: selectedModel,
    videoData: base64,
    videoUrl: `data:${mimeType};base64,${base64}`,
    remoteUrl: url,
    mimeType,
  };
}

async function readResponseText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
