/**
 * checkRequiredFields.js
 *
 * Checks that the agent output has the minimum required fields for its
 * event type. Rule-based — no LLM, no I/O.
 *
 * What counts as "required" depends on the event type, derived from
 * the ExecutionPlan's module and the output itself.
 */

// Minimum required fields per event type.
// Values are arrays of dot-notation paths into the agentOutput object.
const REQUIRED_FIELDS_BY_EVENT_TYPE = Object.freeze({
  "research+market_research": ["summary", "payload.insights", "payload.recommendations"],
  "research+audience_analysis": ["summary", "payload.insights", "payload.recommendations"],
  "research+competitor_analysis": ["summary", "payload.insights", "payload.recommendations"],
  "research+trends_research": ["summary", "payload.insights", "payload.recommendations"],
  "research+pain_points_research": ["summary", "payload.insights", "payload.recommendations"],
  "research+opportunities_research": ["summary", "payload.insights", "payload.recommendations"],
  "seo+keyword_research": ["summary", "payload.keywords"],
  "seo+keyword_cluster": ["summary", "payload.keywords"],
  "seo+topic_cluster": ["summary", "payload.keywords"],
  "seo+seo_strategy": ["summary", "payload.keywords"],
  "seo+meta_description": ["summary", "payload.keywords"],
  "seo+faq_generation": ["summary", "payload.keywords"],
  "content+blog_draft": ["summary", "payload.title", "payload.body"],
  "content+email_draft": ["summary", "payload.subject", "payload.body"],
  "creative+creative_concept": ["summary", "payload.concept"],
  "creative+image_asset": ["summary", "payload.imagePrompt"],
  "ads+ad_copy": ["summary", "payload.headline", "payload.body"],
  "video+video_script": ["summary", "payload.hook", "payload.scenes", "payload.cta"],
  "video+storyboard": ["summary", "payload.scenes"],
  "analytics+campaign_learning": ["summary", "payload.insight"],
  "special+retroactive_attach": ["summary"],
  "special+context_change": ["summary", "payload.field", "payload.newValue"],
});

/**
 * @param {Object} agentOutput - the raw output from the agent
 * @param {string} eventType   - the expected event type (from ExecutionPlan / agent)
 * @returns {{ passed: boolean, missing: string[] }}
 */
function checkRequiredFields(agentOutput, eventType) {
  const required = REQUIRED_FIELDS_BY_EVENT_TYPE[eventType];

  if (!required) {
    // Unknown event type — fail loudly so it doesn't silently pass through
    return { passed: false, missing: [`unknown event type: "${eventType}"`] };
  }

  const missing = required.filter((path) => !getNestedValue(agentOutput, path));
  return { passed: missing.length === 0, missing };
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

module.exports = { checkRequiredFields, REQUIRED_FIELDS_BY_EVENT_TYPE };
