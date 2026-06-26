import { runGroq } from "./groq";
import { runPollinationsText } from "./pollinations";

const GEMINI_RETRY_DELAYS = [3000, 6000, 9000];

export async function runGemini({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
}) {
  try {
    return await runGeminiWithRetry({
      systemPrompt,
      userPrompt,
      temperature,
    });
  } catch (error) {
    if (!process.env.GROQ_API_KEY && !process.env.POLLINATIONS_API_KEY) {
      throw error;
    }

    console.warn(
      `Gemini failed (${summarizeProviderError(error)}). Falling back to Groq.`,
    );

    try {
      return await runGroq({
        systemPrompt,
        userPrompt,
        temperature,
      });
    } catch (groqError) {
      if (!process.env.POLLINATIONS_API_KEY) {
        throw groqError;
      }

      console.warn(
        `Groq failed (${summarizeProviderError(groqError)}). Falling back to Pollinations Text.`,
      );

      return runPollinationsText({
        systemPrompt,
        userPrompt,
        temperature,
      });
    }
  }
}

async function runGeminiWithRetry({ systemPrompt, userPrompt, temperature }) {
  let lastError = null;

  for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS.length; attempt += 1) {
    try {
      return await callGemini({
        systemPrompt,
        userPrompt,
        temperature,
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

async function callGemini({ systemPrompt, userPrompt, temperature }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.status = 401;
    throw error;
  }

  const model = getGeminiModel();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
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
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Gemini error ${response.status}: ${errorText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  return {
    provider: "gemini",
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    raw: data,
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
