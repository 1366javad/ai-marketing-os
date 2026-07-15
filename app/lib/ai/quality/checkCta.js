/**
 * checkCta.js
 *
 * Checks whether a CTA (Call to Action) is present in outputs where
 * one is expected. Rule-based, no LLM.
 *
 * CTA is expected for: ad_copy, email_draft (always), and blog_draft
 * (as a recommendation, not a hard failure).
 */

// Common CTA phrase patterns to detect
const CTA_DETECTION_PATTERNS = [
  /\bsign up\b/i, /\bregister\b/i, /\bjoin\b/i,
  /\bbuy now\b/i, /\bshop now\b/i, /\border now\b/i,
  /\blearn more\b/i, /\bfind out\b/i, /\bdiscover\b/i,
  /\bget started\b/i, /\bstart free\b/i, /\btry (now|free|it)\b/i,
  /\bcontact us\b/i, /\bbook (a|now)\b/i, /\bschedule\b/i,
  /\bdownload\b/i, /\bget (the|your)\b/i,
  /\bclick here\b/i, /\bapply now\b/i, /\bsubscribe\b/i,
];

const CTA_REQUIRED_TYPES = new Set(["ads+ad_copy", "content+email_draft"]);
const CTA_RECOMMENDED_TYPES = new Set(["content+blog_draft", "creative+creative_concept"]);

/**
 * @param {Object} agentOutput
 * @param {string} eventType
 * @returns {{ passed: boolean, hasCtaSignal: boolean, issues: string[], warnings: string[] }}
 */
function checkCta(agentOutput, eventType) {
  const p = agentOutput?.payload || {};
  const allText = [
    agentOutput?.summary || "",
    p.headline || "",
    p.body || "",
    p.cta || "",
    p.concept || "",
  ].join(" ");

  const hasCtaSignal = CTA_DETECTION_PATTERNS.some((pattern) => pattern.test(allText));
  // Also accept an explicit cta field set directly on the payload
  const hasExplicitCta = !!(p.cta && p.cta.trim().length > 0);
  const hasCta = hasCtaSignal || hasExplicitCta;

  if (CTA_REQUIRED_TYPES.has(eventType) && !hasCta) {
    return {
      passed: false,
      hasCtaSignal: false,
      issues: [`"${eventType}" requires a CTA but none was detected`],
      warnings: [],
    };
  }

  if (CTA_RECOMMENDED_TYPES.has(eventType) && !hasCta) {
    return {
      passed: true,
      hasCtaSignal: false,
      issues: [],
      warnings: [`"${eventType}" typically benefits from a CTA — consider adding one`],
    };
  }

  return { passed: true, hasCtaSignal: hasCta, issues: [], warnings: [] };
}

module.exports = { checkCta, CTA_REQUIRED_TYPES, CTA_RECOMMENDED_TYPES };
