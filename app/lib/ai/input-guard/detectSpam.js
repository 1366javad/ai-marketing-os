/**
 * detectSpam.js
 *
 * Basic rule-based spam pattern detection. Intentionally simple for v1 —
 * catches the obvious cases (repeated characters, repeated whole words,
 * excessive URLs) without trying to be a full spam classifier. Extend
 * the pattern list here if new spam shapes show up in production; do not
 * reach for an LLM call to solve this (per the rule-based-only decision).
 */

const REPEATED_CHAR_PATTERN = /(.)\1{9,}/; // same char 10+ times in a row, e.g. "aaaaaaaaaa"
const EXCESSIVE_URL_PATTERN = /(https?:\/\/\S+.*){3,}/i; // 3+ URLs in one input
const REPEATED_WORD_PATTERN = /\b(\w+)\b(?:\s+\1\b){4,}/i; // same word 5+ times in a row

/**
 * @param {string} text
 * @returns {boolean}
 */
function detectSpam(text) {
  if (!text || typeof text !== "string") return false;

  return (
    REPEATED_CHAR_PATTERN.test(text) ||
    EXCESSIVE_URL_PATTERN.test(text) ||
    REPEATED_WORD_PATTERN.test(text)
  );
}

module.exports = { detectSpam };
