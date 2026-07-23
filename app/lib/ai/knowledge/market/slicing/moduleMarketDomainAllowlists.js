const { MARKET_DOMAINS } = require("../contracts");

const MODULE_MARKET_DOMAIN_ALLOWLISTS = Object.freeze({
  research: Object.freeze([...MARKET_DOMAINS]),
  seo: Object.freeze(["competitor", "audience_signal", "category_trend", "market_opportunity", "regulatory_signal"]),
  content: Object.freeze(["competitor", "audience_signal", "category_trend", "channel_pattern", "market_opportunity", "cultural_signal"]),
  creative: Object.freeze(["competitor", "audience_signal", "category_trend", "channel_pattern", "cultural_signal"]),
  ads: Object.freeze(["competitor", "audience_signal", "channel_pattern", "market_opportunity", "market_threat", "regulatory_signal"]),
  video: Object.freeze(["competitor", "audience_signal", "category_trend", "channel_pattern", "cultural_signal"]),
  analytics: Object.freeze([...MARKET_DOMAINS]),
});

function getModuleMarketDomainAllowlist(module) {
  const value = MODULE_MARKET_DOMAIN_ALLOWLISTS[module];
  if (!value) throw new TypeError(`module must be one of: ${Object.keys(MODULE_MARKET_DOMAIN_ALLOWLISTS).join(", ")}`);
  return value;
}

module.exports = { MODULE_MARKET_DOMAIN_ALLOWLISTS, getModuleMarketDomainAllowlist };
