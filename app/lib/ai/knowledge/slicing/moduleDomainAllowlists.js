const { KNOWLEDGE_DOMAINS } = require("../contracts");

const PROTECTED_DOMAINS = Object.freeze(["constraint", "approved_fact"]);
const COMMON_EXECUTION_DOMAINS = Object.freeze([
  ...PROTECTED_DOMAINS,
  "brand_identity",
  "tone_rule",
  "positioning",
  "value_proposition",
  "product",
  "offer",
  "audience",
]);

const MODULE_DOMAIN_ALLOWLISTS = Object.freeze({
  research: Object.freeze([
    ...PROTECTED_DOMAINS,
    "brand_identity",
    "product",
    "offer",
    "business_model",
    "audience",
    "business_goal",
  ]),
  seo: Object.freeze([
    ...PROTECTED_DOMAINS,
    "brand_identity",
    "positioning",
    "value_proposition",
    "product",
    "offer",
    "audience",
    "business_goal",
  ]),
  content: COMMON_EXECUTION_DOMAINS,
  creative: COMMON_EXECUTION_DOMAINS,
  ads: COMMON_EXECUTION_DOMAINS,
  video: COMMON_EXECUTION_DOMAINS,
  analytics: Object.freeze([
    ...PROTECTED_DOMAINS,
    ...KNOWLEDGE_DOMAINS.filter((domain) =>
      !PROTECTED_DOMAINS.includes(domain) && domain !== "validated_learning"),
  ]),
});

function getModuleDomainAllowlist(module) {
  const allowlist = MODULE_DOMAIN_ALLOWLISTS[module];
  if (!allowlist) {
    throw new TypeError(`module must be one of: ${Object.keys(MODULE_DOMAIN_ALLOWLISTS).join(", ")}`);
  }
  return allowlist;
}

module.exports = {
  MODULE_DOMAIN_ALLOWLISTS,
  PROTECTED_DOMAINS,
  getModuleDomainAllowlist,
};
