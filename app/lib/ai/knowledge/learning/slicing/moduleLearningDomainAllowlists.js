const { LEARNING_DOMAINS } = require("../contracts");
const MODULE_LEARNING_DOMAIN_ALLOWLISTS = Object.freeze({
  research: Object.freeze([...LEARNING_DOMAINS]), seo: Object.freeze(["audience_pattern", "content_pattern", "channel_pattern", "negative_pattern"]),
  content: Object.freeze(["messaging_pattern", "audience_pattern", "content_pattern", "format_pattern", "negative_pattern"]),
  creative: Object.freeze(["messaging_pattern", "audience_pattern", "creative_pattern", "format_pattern", "negative_pattern"]),
  ads: Object.freeze(["messaging_pattern", "audience_pattern", "offer_pattern", "channel_pattern", "creative_pattern", "timing_pattern", "negative_pattern"]),
  video: Object.freeze(["messaging_pattern", "audience_pattern", "creative_pattern", "content_pattern", "format_pattern", "negative_pattern"]), analytics: Object.freeze([...LEARNING_DOMAINS]),
});
function getModuleLearningDomainAllowlist(module) { const result = MODULE_LEARNING_DOMAIN_ALLOWLISTS[module]; if (!result) throw new TypeError(`unknown runtime module: ${module}`); return result; }
module.exports = { MODULE_LEARNING_DOMAIN_ALLOWLISTS, getModuleLearningDomainAllowlist };
