const GENERIC_PHRASES = [
  "lorem ipsum",
  "as an ai",
  "i cannot",
  "i'm unable",
  "placeholder",
  "insert here",
  "your product",
  "your brand",
];

const MODULE_MIN_LENGTH = {
  creative: 20,
  content: 350,
  seo: 250,
  research: 300,
  ads: 40,
};

export function checkMarketingOutput({
  module,
  output,
  brief = null,
  strategy = null,
} = {}) {
  const checks = [
    checkNotEmpty(output),
    checkLength(output, module),
    checkNoGenericPlaceholders(output),
    checkBriefAlignment(output, brief),
    checkCtaPresence(output, brief, module),
    checkStructure(output, module),
  ];
  const issues = checks.filter((check) => !check.pass);
  const score = Math.max(0, 1 - issues.length / checks.length);

  return {
    passed: issues.length === 0,
    score,
    grade: getQualityGrade(score),
    issues: issues.map(({ code, message, severity }) => ({
      code,
      message,
      severity,
    })),
    suggestions: buildSuggestions({ issues, brief, strategy, module }),
  };
}

export function attachQualityMetadata({
  module,
  output,
  brief = null,
  strategy = null,
  metadata = {},
} = {}) {
  return {
    ...metadata,
    quality: checkMarketingOutput({
      module,
      output,
      brief,
      strategy,
    }),
  };
}

function checkNotEmpty(output) {
  return {
    code: "empty_output",
    severity: "high",
    pass: getOutputText(output).trim().length > 0,
    message: "The output is empty.",
  };
}

function checkLength(output, module) {
  const text = getOutputText(output);
  const minLength = MODULE_MIN_LENGTH[module] || 40;

  return {
    code: "too_short",
    severity: "medium",
    pass: text.length >= minLength,
    message: `The output is shorter than expected for ${module || "this module"}.`,
  };
}

function checkNoGenericPlaceholders(output) {
  const text = getOutputText(output).toLowerCase();
  const foundPhrase = GENERIC_PHRASES.find((phrase) => text.includes(phrase));

  return {
    code: "generic_placeholder",
    severity: "medium",
    pass: !foundPhrase,
    message: foundPhrase
      ? `The output contains a generic placeholder: ${foundPhrase}.`
      : "The output does not contain generic placeholders.",
  };
}

function checkBriefAlignment(output, brief) {
  if (!brief) {
    return {
      code: "brief_alignment",
      severity: "low",
      pass: true,
      message: "No brief was provided for alignment checks.",
    };
  }

  const text = getOutputText(output).toLowerCase();
  const signals = [brief.offer, brief.audience, brief.industry]
    .map((value) => String(value || "").toLowerCase())
    .filter((value) => value.length >= 4);
  const matched = signals.some((signal) => text.includes(signal));

  return {
    code: "brief_alignment",
    severity: "medium",
    pass: signals.length === 0 || matched,
    message: "The output should reference the offer, audience, or industry.",
  };
}

function checkCtaPresence(output, brief, module) {
  if (module === "research" || module === "seo") {
    return {
      code: "cta_presence",
      severity: "low",
      pass: true,
      message: "CTA is optional for this module.",
    };
  }

  if (module === "content" && !brief?.cta) {
    return {
      code: "cta_presence",
      severity: "low",
      pass: true,
      message: "CTA is optional when the user did not provide one.",
    };
  }

  const text = getOutputText(output).toLowerCase();
  const cta = String(brief?.cta || "").toLowerCase();
  const commonCtas = [
    "learn more",
    "get started",
    "shop now",
    "book",
    "sign up",
    "try",
    "start",
    "download",
    "enroll",
  ];
  const hasCta =
    (cta.length >= 3 && text.includes(cta)) ||
    commonCtas.some((item) => text.includes(item));

  return {
    code: "cta_presence",
    severity: "medium",
    pass: hasCta,
    message: "The output should include a clear CTA.",
  };
}

function checkStructure(output, module) {
  if (typeof output !== "string") {
    return {
      code: "structure",
      severity: "medium",
      pass: Boolean(output && typeof output === "object"),
      message: "Structured output should be a valid object.",
    };
  }

  const hasMarkdownStructure =
    output.includes("#") || output.includes("- ") || output.includes("\n\n");

  return {
    code: "structure",
    severity: "low",
    pass: module === "ads" || hasMarkdownStructure,
    message: "Text output should be structured for scanning.",
  };
}

function buildSuggestions({ issues, brief, strategy, module }) {
  if (!issues.length) return [];

  const suggestions = issues.map((issue) => {
    if (issue.code === "too_short") {
      return "Add more specific examples, benefits, or tactical detail.";
    }

    if (issue.code === "brief_alignment") {
      return `Tie the output back to ${brief?.offer || "the offer"} and ${brief?.audience || "the target audience"}.`;
    }

    if (issue.code === "cta_presence") {
      return brief?.cta
        ? `Include a clear CTA such as "${brief.cta}".`
        : "Only include a CTA when the brief provides a real action.";
    }

    if (issue.code === "generic_placeholder") {
      return "Replace placeholders with campaign-specific language.";
    }

    return "Review the output before showing it to the user.";
  });

  if (strategy?.framework) {
    suggestions.push(`Reinforce the ${strategy.framework} framework.`);
  }

  if (module === "creative") {
    suggestions.push("Make image prompts more concrete and visual.");
  }

  return [...new Set(suggestions)];
}

function getQualityGrade(score) {
  if (score >= 0.9) return "excellent";
  if (score >= 0.75) return "good";
  if (score >= 0.55) return "needs_review";
  return "poor";
}

function getOutputText(output) {
  if (typeof output === "string") return output;
  if (!output) return "";

  return JSON.stringify(output);
}
