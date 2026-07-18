const KNOWLEDGE_DOMAINS = Object.freeze([
  "brand_identity",
  "tone_rule",
  "positioning",
  "value_proposition",
  "product",
  "offer",
  "business_model",
  "audience",
  "business_goal",
  "constraint",
  "approved_fact",
  "validated_learning",
]);

const SOURCE_KINDS = Object.freeze([
  "text",
  "document",
  "website_snapshot",
  "transcript",
]);

const SOURCE_AUTHORITIES = Object.freeze([
  "authoritative",
  "supporting",
  "unverified",
]);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) {
    throw new TypeError(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

module.exports = {
  KNOWLEDGE_DOMAINS,
  SOURCE_AUTHORITIES,
  SOURCE_KINDS,
  assertEnum,
};
