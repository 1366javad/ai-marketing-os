const LEARNING_DOMAINS = Object.freeze([
  "messaging_pattern", "audience_pattern", "offer_pattern", "channel_pattern",
  "creative_pattern", "content_pattern", "timing_pattern", "funnel_pattern",
  "format_pattern", "negative_pattern",
]);
const OUTCOME_DIRECTIONS = Object.freeze(["positive", "negative", "neutral", "conditional"]);
const EVIDENCE_ROLES = Object.freeze(["supporting", "contradicting", "neutral", "contextual"]);
const OBSERVATION_SOURCES = Object.freeze(["campaign_event", "analytics_observation", "experiment_result", "customer_response", "sales_feedback", "human_note", "external_context"]);
function assertLearningEnum(field, value, allowed) { if (!allowed.includes(value)) throw new TypeError(`${field} must be one of: ${allowed.join(", ")}`); return value; }
module.exports = { EVIDENCE_ROLES, LEARNING_DOMAINS, OBSERVATION_SOURCES, OUTCOME_DIRECTIONS, assertLearningEnum };
