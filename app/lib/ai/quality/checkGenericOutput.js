/**
 * checkGenericOutput.js
 *
 * Detects suspiciously generic output — placeholder text, unfilled template
 * variables, or content that's too short to be useful for the given event type.
 * Rule-based only.
 *
 * This catches the most common failure mode of LLM agents: producing output
 * that is structurally valid but semantically empty ("Add your content here",
 * "[PRODUCT NAME]", etc.).
 */

const PLACEHOLDER_PATTERNS = [
  /\[your\b/i,
  /\[product name\]/i,
  /\[brand name\]/i,
  /\[insert\b/i,
  /\badd your (content|text|copy|headline)\b/i,
  /lorem ipsum/i,
  /\bTBD\b/,
  /\bXXX\b/,
];

// Minimum meaningful character count per event type for the primary text field.
const MIN_LENGTH_BY_EVENT_TYPE = Object.freeze({
  "content+blog_draft": 300,
  "content+email_draft": 150,
  "creative+creative_concept": 100,
  "creative+image_asset": 50,
  "ads+ad_copy": 60,
  "video+video_script": 150,
  "video+storyboard": 120,
  "analytics+campaign_learning": 80,
  "special+retroactive_attach": 20,
  "special+context_change": 10,
});

/**
 * @param {Object} agentOutput
 * @param {string} eventType
 * @returns {{ passed: boolean, warnings: string[] }}
 */
function checkGenericOutput(agentOutput, eventType) {
  const warnings = [];
  const summary = agentOutput?.summary || "";
  const bodyText = extractPrimaryText(agentOutput, eventType);
  const fullText = [summary, bodyText].join(" ");

  // Placeholder pattern check
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(fullText)) {
      warnings.push(`output contains placeholder text matching: ${pattern}`);
    }
  }

  // Minimum length check on primary text
  const minLen = MIN_LENGTH_BY_EVENT_TYPE[eventType] ?? 30;
  if (bodyText && bodyText.length < minLen) {
    warnings.push(
      `primary text is ${bodyText.length} chars — below minimum of ${minLen} for "${eventType}"`
    );
  }

  return { passed: warnings.length === 0, warnings };
}

function extractPrimaryText(agentOutput, eventType) {
  const p = agentOutput?.payload;
  if (!p) return "";
  // Primary text field per event type
  const map = {
    "content+blog_draft": p.body,
    "content+email_draft": p.body,
    "ads+ad_copy": [p.headline, p.body].filter(Boolean).join(" "),
    "video+video_script": [
      p.hook,
      ...(Array.isArray(p.scenes) ? p.scenes : []),
      p.cta,
    ].filter(Boolean).join(" "),
    "video+storyboard": Array.isArray(p.scenes) ? p.scenes.join(" ") : "",
    "creative+creative_concept": p.concept,
    "creative+image_asset": p.imagePrompt,
    "analytics+campaign_learning": p.insight,
  };
  if (eventType.startsWith("research+")) {
    return [
      p.summary,
      ...(Array.isArray(p.insights) ? p.insights : []),
      ...(Array.isArray(p.recommendations) ? p.recommendations : []),
    ].filter(Boolean).join(" ");
  }
  if (eventType.startsWith("seo+")) {
    return Array.isArray(p.keywords) ? p.keywords.join(", ") : String(p.keywords || "");
  }
  return map[eventType] || JSON.stringify(p);
}

module.exports = { checkGenericOutput };
