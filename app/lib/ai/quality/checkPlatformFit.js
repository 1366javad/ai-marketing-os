/**
 * checkPlatformFit.js
 *
 * Checks that the output respects platform-specific constraints declared
 * in the MarketingBrief. Rule-based only.
 *
 * V1 scope: character limits for text-based outputs (ad copy, email subjects).
 * V2 scope (not yet): aspect ratio for images, video length, hashtag count, etc.
 */

// Character limits per platform per content type.
// Source: platform published specs (as of 2026).
const PLATFORM_LIMITS = Object.freeze({
  instagram: { headline: 125, body: 2200 },
  facebook:  { headline: 255, body: 63206 },
  twitter:   { headline: null, body: 280 },
  linkedin:  { headline: 150, body: 3000 },
  tiktok:    { headline: null, body: 2200 },
  google:    { headline: 30,  body: 90 },  // RSA character limits
  email:     { headline: 60,  body: null }, // subject line
});

/**
 * @param {Object} agentOutput
 * @param {string} eventType
 * @param {string[] | null} platforms - from MarketingBrief.platforms
 * @returns {{ passed: boolean, warnings: string[] }}
 */
function checkPlatformFit(agentOutput, eventType, platforms) {
  const warnings = [];

  // Only ad_copy and email_draft have platform-specific text limits in v1
  if (!["ad_copy", "email_draft"].includes(eventType) || !platforms || platforms.length === 0) {
    return { passed: true, warnings: [] };
  }

  const p = agentOutput?.payload || {};
  const headline = p.headline || p.subject || "";
  const body = p.body || "";

  for (const platform of platforms) {
    const normalizedPlatform = platform.toLowerCase();
    const limits = PLATFORM_LIMITS[normalizedPlatform];
    if (!limits) continue; // unknown platform — skip, not fail

    if (limits.headline !== null && headline.length > limits.headline) {
      warnings.push(
        `${platform} headline limit: ${headline.length}/${limits.headline} chars exceeded`
      );
    }
    if (limits.body !== null && body.length > limits.body) {
      warnings.push(
        `${platform} body limit: ${body.length}/${limits.body} chars exceeded`
      );
    }
  }

  const warningOnly = eventType === "email_draft";

  return { passed: warningOnly || warnings.length === 0, warnings };
}

module.exports = { checkPlatformFit, PLATFORM_LIMITS };
