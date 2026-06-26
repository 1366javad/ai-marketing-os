export function parseJsonResponse(text) {
  if (!text) {
    throw new Error("Empty AI response");
  }

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response is not valid JSON");
    }

    return JSON.parse(match[0]);
  }
}
