/**
 * detectGibberish.js
 *
 * Rule 1: detects input that is mostly random/unreadable characters.
 * Pure, rule-based, no LLM — per the explicit decision that Input Guard
 * must stay fast/cheap/predictable since it runs before Brief Builder
 * on every single request.
 *
 * IMPORTANT BOUNDARY (fixed after a smoke test failure): gibberish means
 * UNREADABLE, not merely SHORT. A single valid letter like "a" is short
 * (Rule 3's concern — needs_clarification) but it is not gibberish — it's
 * a real, readable character. Do not require a 2+ letter word here; that
 * conflated "too short" with "unreadable" and caused Rule 1 to wrongly
 * swallow Rule 3's territory. Length is judged downstream, by
 * detectMarketingRelevance.js / resolveValidationResult.js — this file's
 * only job is "is this readable text at all."
 */

const SPECIAL_CHAR_RATIO_THRESHOLD = 0.4; // >40% non-alphanumeric/space = likely gibberish

/**
 * @param {string} text
 * @returns {boolean} true if input looks like gibberish
 */
function detectGibberish(text) {
  if (!text || typeof text !== "string") return true;

  const trimmed = text.trim();
  if (trimmed.length === 0) return false; // empty is handled by Rule 2, not gibberish

  const specialChars = trimmed.replace(/[a-zA-Z0-9\u0600-\u06FF\s]/g, "").length;
  const ratio = specialChars / trimmed.length;

  if (ratio > SPECIAL_CHAR_RATIO_THRESHOLD) return true;

  // At least one readable letter anywhere (catches things like "23 34 ## $$",
  // which has digits/symbols but zero actual letters). A single letter is
  // enough to NOT be gibberish — "too short to be useful" is a separate,
  // downstream concern (Rule 3), not this function's job.
  const hasReadableLetter = /[a-zA-Z\u0600-\u06FF]/.test(trimmed);
  if (!hasReadableLetter) return true;

  return false;
}

module.exports = { detectGibberish, SPECIAL_CHAR_RATIO_THRESHOLD };
