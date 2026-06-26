/**
 * extractSignals.js
 *
 * Phase A of Brief Builder — extracts structured signals from raw prompt text.
 * Pure function, no LLM, no I/O. Rule-based keyword matching only.
 *
 * In Campaign Mode, most fields will be enriched from the ContextSlice anyway,
 * so extractSignals matters most for Tool Mode — where the user's raw text is
 * the ONLY source of structured intent.
 *
 * Each extracted signal carries a confidence value so enrichBrief.js can
 * decide whether to prefer a signal-extracted value or a context-derived one.
 */

const PLATFORM_SIGNALS = Object.freeze({
  instagram: /\binstagram\b/i,
  facebook: /\bfacebook\b|\bfb\b/i,
  twitter: /\btwitter\b|\bx\.com\b/i,
  linkedin: /\blinkedin\b/i,
  tiktok: /\btiktok\b/i,
  email: /\bemail\b|\bnewsletter\b/i,
  blog: /\bblog\b/i,
  seo: /\bseo\b|\bsearch engine\b|\borganic\b/i,
  google: /\bgoogle ads?\b|\bppc\b|\bsem\b/i,
  youtube: /\byoutube\b/i,
});

const GOAL_SIGNALS = Object.freeze({
  lead_generation: /\blead[s]?\b|\blead gen\b|\bsign.?up\b|\bsignup\b/i,
  sales: /\bsale[s]?\b|\bsell\b|\bconver[ts]?\b|\bpurchase\b|\bbuy\b/i,
  awareness: /\bawareness\b|\bvisibility\b|\breach\b|\bbrand\b/i,
  engagement: /\bengagement\b|\bengag[e]\b|\binteraction\b/i,
  retention: /\bretention\b|\bchurn\b|\bloyalty\b|\bretain\b/i,
  traffic: /\btraffic\b|\bclick[s]?\b|\bvisit[s]?\b/i,
});

const CAMPAIGN_TYPE_SIGNALS = Object.freeze({
  launch: /\blaunch\b|\bintroduc\b|\brelease\b|\bnew product\b/i,
  promotion: /\bpromo\b|\bdiscount\b|\bsale\b|\boffer\b|\bdeal\b/i,
  seasonal: /\bsummer\b|\bwinter\b|\bspring\b|\bfall\b|\bautumn\b|\bholiday\b|\bblack friday\b|\bramadan\b/i,
  awareness: /\bawareness\b|\bcampaign\b/i,
  retargeting: /\bretarget\b|\bwarm audience\b|\bexisting customer\b/i,
  content_marketing: /\bcontent\b|\bblog post\b|\barticle\b|\beducational\b/i,
});

const TONE_SIGNALS = Object.freeze({
  urgent: /\burgent\b|\blimited time\b|\bhurry\b|\bact now\b|\blast chance\b/i,
  professional: /\bprofessional\b|\bcorporate\b|\bformal\b|\bbusiness\b/i,
  friendly: /\bfriendly\b|\bcasual\b|\bconversational\b|\bwarm\b/i,
  inspiring: /\binspir\b|\bmotivat\b|\bempow\b/i,
  playful: /\bfun\b|\bplayful\b|\bhumor\b|\bhumorous\b/i,
});

const CTA_SIGNALS = Object.freeze({
  sign_up: /\bsign.?up\b|\bregister\b|\bjoin\b/i,
  buy_now: /\bbuy now\b|\bshop now\b|\bpurchase\b/i,
  learn_more: /\blearn more\b|\bfind out\b|\bdiscover\b/i,
  get_started: /\bget started\b|\bstart free\b|\btry\b/i,
  contact_us: /\bcontact\b|\bget in touch\b|\bbook\b|\bschedule\b/i,
  download: /\bdownload\b|\bget the app\b/i,
});

function matchSignals(text, signalMap, returnAll = false) {
  const matches = Object.entries(signalMap)
    .filter(([, pattern]) => pattern.test(text))
    .map(([key]) => key);
  if (returnAll) return matches.length > 0 ? matches : null;
  return matches[0] ?? null;
}

/**
 * @param {string} rawText
 * @returns {{ platforms, goal, campaignType, tone, cta, confidence }}
 */
function extractSignals(rawText) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return { platforms: null, goal: null, campaignType: null, tone: null, cta: null, confidence: 0.0 };
  }

  const platforms = matchSignals(rawText, PLATFORM_SIGNALS, true);
  const goal = matchSignals(rawText, GOAL_SIGNALS);
  const campaignType = matchSignals(rawText, CAMPAIGN_TYPE_SIGNALS);
  const tone = matchSignals(rawText, TONE_SIGNALS);
  const cta = matchSignals(rawText, CTA_SIGNALS);

  const resolved = [goal, campaignType, tone, cta].filter(Boolean).length;
  const confidence = parseFloat((resolved / 4).toFixed(2));

  return { platforms, goal, campaignType, tone, cta, confidence };
}

module.exports = { extractSignals, PLATFORM_SIGNALS, GOAL_SIGNALS, CAMPAIGN_TYPE_SIGNALS, TONE_SIGNALS, CTA_SIGNALS };
