const { runOpenAI } = require("./openai");
const { runGroq } = require("./groq");

async function runTextProvider(payload) {
  try {
    return await runOpenAI(payload);
  } catch (openAIError) {
    console.warn(
      `OpenAI failed (${summarizeProviderError(openAIError)}). Falling back to Groq emergency provider.`,
    );

    const result = await runGroq(payload);

    return {
      ...result,
      usedFallback: true,
      warning: "OpenAI fallback provider used",
    };
  }
}

async function runProvider(provider, payload) {
  switch (provider) {
    case "openai":
      return runOpenAI(payload);
    case "text":
      return runTextProvider(payload);
    case "groq":
      return runGroq(payload);
    default:
      throw new Error(`Unknown canonical provider: ${provider}`);
  }
}

function summarizeProviderError(error) {
  const status = error?.status ? `status ${error.status}` : "no status";
  const message = String(error?.message || "unknown error")
    .replace(/\s+/g, " ")
    .slice(0, 220);

  return `${status}: ${message}`;
}

module.exports = { runTextProvider, runProvider, runOpenAI };
