const MARKET_DOMAINS = Object.freeze([
  "competitor",
  "audience_signal",
  "category_trend",
  "channel_pattern",
  "market_opportunity",
  "market_threat",
  "regulatory_signal",
  "economic_signal",
  "cultural_signal",
  "technology_signal",
]);

const MARKET_SOURCE_CATEGORIES = Object.freeze([
  "competitor_official",
  "regulatory_government",
  "academic_industry",
  "search_trend",
  "advertising_library",
  "news_trade",
  "social_community",
  "licensed_dataset",
  "human_research_note",
]);

const MARKET_SOURCE_AUTHORITIES = Object.freeze([
  "primary",
  "authoritative_secondary",
  "supporting",
  "unverified",
]);

const MARKET_SOURCE_KINDS = Object.freeze([
  "text",
  "document",
  "website_snapshot",
  "transcript",
  "structured_dataset",
]);

const MARKET_MEMORY_TYPES = Object.freeze([
  "observation",
  "signal",
  "claim",
  "trend",
  "relationship",
  "snapshot",
]);

function assertMarketEnum(field, value, allowed) {
  if (!allowed.includes(value)) {
    throw new TypeError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

module.exports = {
  MARKET_DOMAINS,
  MARKET_MEMORY_TYPES,
  MARKET_SOURCE_AUTHORITIES,
  MARKET_SOURCE_CATEGORIES,
  MARKET_SOURCE_KINDS,
  assertMarketEnum,
};
