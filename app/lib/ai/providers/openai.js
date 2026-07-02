const OpenAI = require("openai");

async function runOpenAI({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 1200,
  responseFormat,
}) {
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing OPENAI_API_KEY");
    error.status = 401;
    throw error;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });

  try {
    const request = {
      model,
      input: [
        {
          role: "system",
          content: systemPrompt || "",
        },
        {
          role: "user",
          content: userPrompt || "",
        },
      ],
      max_output_tokens: maxTokens,
    };

    if (supportsCustomTemperature(model)) {
      request.temperature = temperature;
    }

    if (responseFormat) {
      request.text = {
        format: { type: responseFormat },
      };
    }

    console.time("OPENAI_CALL");
    let response;
    try {
      response = await client.responses.create(request, {
        timeout: 15000,
      });
    } finally {
      console.timeEnd("OPENAI_CALL");
    }

    return {
      provider: "openai",
      model,
      text: normalizeOpenAIText(response),
      latencyMs: Date.now() - startedAt,
      usage: normalizeOpenAIUsage(response?.usage),
      raw: response,
    };
  } catch (error) {
    console.error("OPENAI_SDK_FAILED", {
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

function supportsCustomTemperature(model) {
  const normalized = String(model || "").trim().toLowerCase();
  return !normalized.startsWith("gpt-5") && !/^o\d/.test(normalized);
}

function normalizeOpenAIText(response) {
  if (typeof response?.output_text === "string") return response.output_text;

  const output = Array.isArray(response?.output) ? response.output : [];
  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n");
}

function normalizeOpenAIUsage(usage = {}) {
  return {
    inputTokens: Number(usage.input_tokens || 0),
    outputTokens: Number(usage.output_tokens || 0),
    totalTokens: Number(usage.total_tokens || 0),
  };
}

module.exports = { runOpenAI };
