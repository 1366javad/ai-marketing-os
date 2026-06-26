const GENERIC_PROMPT_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "for",
  "from",
  "in",
  "into",
  "my",
  "of",
  "on",
  "our",
  "please",
  "the",
  "to",
  "with",
  "write",
  "create",
  "generate",
  "make",
  "draft",
  "produce",
  "build",
  "give",
  "blog",
  "post",
  "content",
  "copy",
  "caption",
  "article",
  "email",
  "newsletter",
  "landing",
  "page",
  "case",
  "study",
  "linkedin",
  "instagram",
  "facebook",
  "twitter",
  "tiktok",
  "ad",
  "ads",
  "campaign",
]);

const MALFORMED_TOKEN_PATTERN = /(?=.*[^a-zA-Z0-9\u0600-\u06FF])(?=.*\d)[^\s]{3,}/;
const WORD_PATTERN = /[a-zA-Z\u0600-\u06FF][a-zA-Z\u0600-\u06FF'-]*/g;

function detectSemanticQuality(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  const words = trimmed.match(WORD_PATTERN) || [];
  const meaningfulWords = words.filter((word) => {
    const normalized = word.toLowerCase();
    return normalized.length > 1 && !GENERIC_PROMPT_WORDS.has(normalized);
  });
  const malformedTokens = trimmed
    .split(/\s+/)
    .filter((token) => MALFORMED_TOKEN_PATTERN.test(token));

  if (malformedTokens.length > 0 && meaningfulWords.length === 0) {
    return {
      passed: false,
      status: "invalid",
      reason: "malformed_without_subject",
      malformedTokens,
      meaningfulWords,
    };
  }

  if (meaningfulWords.length === 0) {
    return {
      passed: false,
      status: "needs_clarification",
      reason: "missing_marketing_subject",
      malformedTokens,
      meaningfulWords,
    };
  }

  return {
    passed: true,
    status: "valid",
    reason: "",
    malformedTokens,
    meaningfulWords,
  };
}

module.exports = {
  detectSemanticQuality,
  GENERIC_PROMPT_WORDS,
  MALFORMED_TOKEN_PATTERN,
};
