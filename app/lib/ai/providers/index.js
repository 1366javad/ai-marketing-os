const { runGemini } = require("./gemini");
const { runGroq } = require("./groq");
const { runPollinationsText } = require("./pollinations");

async function runTextProvider(payload) {
  return runGemini(payload);
}

async function runProvider(provider, payload) {
  switch (provider) {
    case "gemini":
    case "text":
      return runTextProvider(payload);
    case "groq":
      return runGroq(payload);
    case "pollinations":
      return runPollinationsText(payload);
    default:
      throw new Error(`Unknown canonical provider: ${provider}`);
  }
}

module.exports = { runTextProvider, runProvider };
