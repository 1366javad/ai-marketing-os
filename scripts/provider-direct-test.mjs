import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config({ path: ".env.local", quiet: true });

const apiKey = process.env.GEMINI_API_KEY;
const model = normalizeModel(process.env.GEMINI_MODEL || "gemini-2.5-flash");

console.log("Gemini key exists:", Boolean(apiKey));
console.log("Gemini key length:", apiKey?.length);
console.log("Gemini model:", model);

if (!apiKey) {
  process.exitCode = 1;
  throw new Error("GEMINI_API_KEY is missing");
}

const startedAt = Date.now();

try {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: "Say OK",
  });

  console.log("Gemini status: OK");
  console.log("Gemini latency:", `${Date.now() - startedAt}ms`);
  console.log("Gemini output:", response.text);
} catch (error) {
  console.error("Gemini status: FAIL");
  console.error("Gemini latency:", `${Date.now() - startedAt}ms`);
  console.error("Gemini error status:", error?.status || error?.code || "unknown");
  console.error("Gemini error:", sanitizeError(error));
  process.exitCode = 1;
}

function normalizeModel(value) {
  const modelName = value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^google\//, "");

  return modelName === "gemini-3.5-flash"
    ? "gemini-2.5-flash"
    : modelName;
}

function sanitizeError(error) {
  return String(error?.message || error || "Unknown Gemini error")
    .replaceAll(apiKey, "[REDACTED]")
    .replace(/\s+/g, " ")
    .slice(0, 1000);
}
