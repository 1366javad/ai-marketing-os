const { runGroq } = require("./groq");
const { runPollinationsText } = require("./pollinations");

const GEMINI_RETRY_DELAYS = [3000, 6000, 9000];

async function runGemini({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 1200,
}) {
  const startedAt = Date.now();

  try {
    const result = await runGeminiWithRetry({
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
    });
    return {
      ...result,
      latencyMs: Date.now() - startedAt,
      usedFallback: false,
    };
  } catch (error) {
    if (!process.env.GROQ_API_KEY && !process.env.POLLINATIONS_API_KEY) {
      throw error;
    }

    console.warn(
      `Gemini failed (${summarizeProviderError(error)}). Falling back to Groq.`,
    );

    try {
      const result = await runGroq({
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      });
      return {
        ...result,
        latencyMs: Date.now() - startedAt,
        usedFallback: true,
      };
    } catch (groqError) {
      if (!process.env.POLLINATIONS_API_KEY) {
        throw groqError;
      }

      console.warn(
        `Groq failed (${summarizeProviderError(groqError)}). Falling back to Pollinations Text.`,
      );

      const pollinationsResult = await runPollinationsText({
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      });

      return {
        ...pollinationsResult,
        latencyMs: Date.now() - startedAt,
        usedFallback: true,
        warning: "Low Confidence Provider",
        lowConfidenceProvider: true,
      };
    }
  }
}

module.exports = { runGemini };

async function runGeminiWithRetry({
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
}) {
  let lastError = null;

  for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS.length; attempt += 1) {
    try {
      return await callGemini({
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
      });
    } catch (error) {
      lastError = error;

      if (error.status !== 503 || attempt === GEMINI_RETRY_DELAYS.length) {
        throw error;
      }

      await sleep(GEMINI_RETRY_DELAYS[attempt]);
    }
  }

  throw lastError;
}

async function callGemini({
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.status = 401;
    throw error;
  }

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const safeUrl = url.replace(apiKey, "[REDACTED_GEMINI_API_KEY]");
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
SYSTEM:
${systemPrompt}

USER:
${userPrompt}
                `,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  };

  console.log("CALL_GEMINI_CONNECTIVITY_1 before root fetch");
  try {
    const connectivityController = new AbortController();
    const connectivityTimeout = setTimeout(() => {
      connectivityController.abort();
    }, 10000);

    try {
      const connectivityResponse = await fetch(
        "https://generativelanguage.googleapis.com",
        {
          signal: connectivityController.signal,
        },
      );
      console.log(
        "CALL_GEMINI_CONNECTIVITY_2 root fetch finished",
        connectivityResponse.status,
      );
    } finally {
      clearTimeout(connectivityTimeout);
    }
  } catch (connectivityError) {
    console.error("CALL_GEMINI_CONNECTIVITY_3 root fetch failed", {
      name: connectivityError?.name,
      message: connectivityError?.message,
      stack: connectivityError?.stack,
    });
  }

  console.log("CALL_GEMINI_1 entering");
  console.log("CALL_GEMINI_2 URL", safeUrl);
  console.log("CALL_GEMINI_3 before fetch");

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    console.log("CALL_GEMINI_4 after fetch", response.status);
  } catch (error) {
    console.error("CALL_GEMINI_FETCH_FAILED", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Gemini error ${response.status}: ${errorText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  return {
    provider: "gemini",
    model,
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: normalizeGeminiUsage(data?.usageMetadata),
    raw: data,
  };
}

function normalizeGeminiUsage(usage = {}) {
  return {
    inputTokens: Number(usage.promptTokenCount || 0),
    outputTokens: Number(usage.candidatesTokenCount || 0),
    totalTokens: Number(usage.totalTokenCount || 0),
  };
}

function getGeminiModel() {
  const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = configuredModel
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^google\//, "");

  if (model === "gemini-3.5-flash") {
    return "gemini-2.5-flash";
  }

  return model;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function summarizeProviderError(error) {
  const status = error?.status ? `status ${error.status}` : "no status";
  const message = String(error?.message || "unknown error")
    .replace(/\s+/g, " ")
    .slice(0, 220);

  return `${status}: ${message}`;
}
