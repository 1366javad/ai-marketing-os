const MIN_MEANINGFUL_LENGTH = 3;

const MARKETING_KEYWORDS = [
  "ad",
  "ads",
  "advertising",
  "audience",
  "brand",
  "campaign",
  "caption",
  "carousel",
  "content",
  "conversion",
  "copy",
  "creative",
  "cta",
  "email",
  "facebook",
  "funnel",
  "google ads",
  "hashtags",
  "instagram",
  "keyword",
  "landing page",
  "lead",
  "linkedin",
  "marketing",
  "meta",
  "post",
  "promotion",
  "reel",
  "research",
  "sale",
  "seo",
  "social",
  "strategy",
  "tiktok",
  "traffic",
  "video",
  "youtube",
  "تبلیغ",
  "بازاریابی",
  "کمپین",
  "فروش",
  "محتوا",
  "سئو",
  "اینستاگرام",
];

const BLOCKED_PATTERNS = [
  /\b(write|create|debug|fix)\s+(python|javascript|java|c\+\+|sql|code|script)\b/i,
  /\b(solve|calculate|differentiate|integrate)\b.*\b(math|calculus|equation|problem)\b/i,
  /\b(capital of|weather in|translate this|summarize this article)\b/i,
  /\b(recipe|cook|cooking instructions)\b/i,
  /\b(پایتخت|حل کن|کدنویسی|برنامه نویسی|معادله|انتگرال|مشتق)\b/i,
];

const MARKETING_TASK_HINTS = [
  "Social media post",
  "Ad campaign",
  "SEO content",
  "Marketing research",
  "Creative assets",
];

export function validateMarketingInput({ prompt, module = "creative" }) {
  const normalizedPrompt = normalizePrompt(prompt);

  if (!normalizedPrompt) {
    return createGuardResult({
      status: "invalid",
      category: "empty",
      confidence: 1,
      reason: "The input is empty.",
      userMessage:
        "Please enter a clear marketing brief, product, campaign idea, or content goal.",
      normalizedPrompt,
    });
  }

  if (isGibberish(normalizedPrompt)) {
    return createGuardResult({
      status: "invalid",
      category: "gibberish",
      confidence: 0.95,
      reason: "The input does not contain enough meaningful language.",
      userMessage: buildInvalidInputMessage(),
      normalizedPrompt,
    });
  }

  if (isBlockedRequest(normalizedPrompt)) {
    return createGuardResult({
      status: "blocked",
      category: "non_marketing_request",
      confidence: 0.9,
      reason: "The request is outside digital marketing workflows.",
      userMessage: [
        "AI Marketing OS is designed for digital marketing workflows.",
        "",
        "Try:",
        ...MARKETING_TASK_HINTS.map((hint) => `• ${hint}`),
      ].join("\n"),
      normalizedPrompt,
    });
  }

  if (isClearlyMarketing(normalizedPrompt)) {
    return createGuardResult({
      status: "valid",
      category: module,
      confidence: 0.85,
      reason: "The input contains a clear marketing intent.",
      userMessage: "",
      normalizedPrompt,
    });
  }

  if (isAmbiguousButUsable(normalizedPrompt)) {
    return createGuardResult({
      status: "needs_clarification",
      category: "ambiguous_topic",
      confidence: 0.7,
      reason: "The input could be used for marketing, but the task is unclear.",
      userMessage: [
        `"${normalizedPrompt}" can be used for multiple marketing tasks.`,
        "",
        "What would you like to create?",
        ...MARKETING_TASK_HINTS.map((hint) => `• ${hint}`),
      ].join("\n"),
      normalizedPrompt,
    });
  }

  return createGuardResult({
    status: "blocked",
    category: "non_marketing_request",
    confidence: 0.65,
    reason: "No marketing intent was detected.",
    userMessage: [
      "AI Marketing OS is designed for digital marketing workflows.",
      "",
      "Try:",
      ...MARKETING_TASK_HINTS.map((hint) => `• ${hint}`),
    ].join("\n"),
    normalizedPrompt,
  });
}

function createGuardResult({
  status,
  category,
  confidence,
  reason,
  userMessage,
  normalizedPrompt,
}) {
  return {
    status,
    category,
    confidence,
    reason,
    userMessage,
    normalizedPrompt,
  };
}

function normalizePrompt(prompt) {
  return String(prompt || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isClearlyMarketing(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  return MARKETING_KEYWORDS.some((keyword) => lowerPrompt.includes(keyword));
}

function isBlockedRequest(prompt) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(prompt));
}

function isAmbiguousButUsable(prompt) {
  const words = prompt.split(/\s+/).filter(Boolean);

  if (words.length <= 4 && prompt.length >= MIN_MEANINGFUL_LENGTH) {
    return true;
  }

  return false;
}

function isGibberish(prompt) {
  const compact = prompt.replace(/\s/g, "");

  if (compact.length < MIN_MEANINGFUL_LENGTH) return true;

  const letters = compact.match(/[\p{L}]/gu)?.length || 0;
  const digits = compact.match(/\d/g)?.length || 0;
  const symbols = compact.length - letters - digits;
  const emojiLike = compact.match(/[\p{Extended_Pictographic}]/gu)?.length || 0;
  const symbolRuns = compact.match(/[^\p{L}\d\s]{2,}/gu)?.length || 0;
  const meaningfulWords = prompt.match(/[\p{L}]{4,}/gu)?.length || 0;
  const junkTokens = prompt.split(/\s+/).filter(isJunkToken).length;
  const hasMarketingKeyword = MARKETING_KEYWORDS.some((keyword) =>
    prompt.toLowerCase().includes(keyword),
  );
  const shortMixedJunk =
    compact.length <= 24 &&
    digits > 0 &&
    symbols > 0 &&
    meaningfulWords === 0;

  if (letters === 0 && digits > 0) return true;
  if (emojiLike >= 3 && letters === 0) return true;
  if (junkTokens > 0 && meaningfulWords <= 2) return true;
  if (hasMarketingKeyword && meaningfulWords > 1) return false;
  if (shortMixedJunk) return true;
  if (symbolRuns > 0 && digits > 0 && letters <= 6 && meaningfulWords === 0) {
    return true;
  }
  if (digits > 0 && symbols > 0 && letters < 10) return true;
  if ((digits + symbols) / compact.length > 0.45 && letters < 12) return true;
  if (symbols / compact.length > 0.45 && letters < 4) return true;

  return false;
}

function isJunkToken(token) {
  const compact = token.replace(/\s/g, "");

  if (compact.length < 6) return false;

  const letters = compact.match(/[\p{L}]/gu)?.length || 0;
  const digits = compact.match(/\d/g)?.length || 0;
  const symbols = compact.length - letters - digits;
  const noiseRatio = (digits + symbols) / compact.length;

  return letters > 0 && digits > 0 && symbols > 0 && noiseRatio >= 0.3;
}

function buildInvalidInputMessage() {
  return [
    "Please enter a valid marketing brief, product, campaign idea, or content goal.",
    "",
    "Examples:",
    "• Summer Sale Campaign",
    "• Facebook Ad for Dentist",
    "• Instagram Caption for Coffee Shop",
    "• SEO Blog for IELTS Course",
  ].join("\n");
}
