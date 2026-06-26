const TYPE_BY_TASK = Object.freeze({
  blog_post: "blog_post",
  email: "email",
  newsletter: "newsletter",
  landing_page: "landing_page",
  case_study: "case_study",
  linkedin_post: "linkedin_post",
  instagram_caption: "instagram_caption",
});
const { getProviderMetadata } = require("../../providers/providerMetadata");

function normalizeContentOutput(providerResult, { brief } = {}) {
  const text = providerResult?.text || "";
  const parsed = parseJsonFromText(text);
  const type = TYPE_BY_TASK[brief?.task] || brief?.task || "content";
  const structured = normalizeStructuredContent(parsed, type);
  const content =
    sanitizeString(parsed?.content) ||
    composeStructuredContent(structured, type) ||
    text.trim();
  const cta =
    normalizeCta(parsed?.cta || structured?.cta) ||
    inferCta(content) ||
    "Learn more";
  const title =
    sanitizeString(parsed?.title) ||
    sanitizeString(parsed?.subject) ||
    sanitizeString(parsed?.hero?.headline) ||
    sanitizeString(structured?.title) ||
    sanitizeString(structured?.subject) ||
    sanitizeString(structured?.hero?.headline) ||
    buildFallbackTitle({ brief, content });

  return {
    type,
    title,
    content,
    cta,
    structured,
    metadata: {
      ...getProviderMetadata(providerResult),
      wordCount: countWords(content),
      provider: providerResult?.provider || "unknown",
    },
  };
}

function normalizeStructuredContent(parsed, type) {
  if (!parsed || typeof parsed !== "object") return {};

  const common = {
    ...parsed,
    type,
  };

  if (type === "blog_post") {
    return {
      ...common,
      sections: normalizeSections(parsed.sections),
      secondaryKeywords: normalizeStringArray(parsed.secondaryKeywords),
    };
  }
  if (type === "newsletter") {
    return { ...common, sections: normalizeSections(parsed.sections) };
  }
  if (type === "landing_page") {
    return {
      ...common,
      hero: normalizeObject(parsed.hero),
      benefits: normalizeSections(parsed.benefits),
      features: normalizeSections(parsed.features),
      faqs: normalizeFaqs(parsed.faqs),
      cta: normalizeObject(parsed.cta),
    };
  }
  if (type === "case_study") {
    return { ...common, takeaways: normalizeStringArray(parsed.takeaways) };
  }
  if (type === "linkedin_post" || type === "instagram_caption") {
    return { ...common, hashtags: normalizeStringArray(parsed.hashtags) };
  }

  return common;
}

function composeStructuredContent(value, type) {
  if (!value || typeof value !== "object") return "";

  const composers = {
    blog_post: composeBlogPost,
    email: composeEmail,
    newsletter: composeNewsletter,
    landing_page: composeLandingPage,
    case_study: composeCaseStudy,
    linkedin_post: composeLinkedInPost,
    instagram_caption: composeInstagramCaption,
  };

  return composers[type]?.(value) || "";
}

function composeBlogPost(value) {
  const sections = normalizeSections(value.sections);
  if (
    !sanitizeString(value.introduction) &&
    sections.length === 0 &&
    !sanitizeString(value.conclusion)
  ) {
    return "";
  }

  return compactLines([
    value.metaDescription
      ? `> Meta description: ${sanitizeString(value.metaDescription)}`
      : "",
    value.hook ? `**${sanitizeString(value.hook)}**` : "",
    sanitizeString(value.introduction),
    ...sections.flatMap((section) => [
      `## ${section.heading || section.title}`,
      section.body || section.description,
    ]),
    value.conclusion ? "## Conclusion" : "",
    sanitizeString(value.conclusion),
    value.cta ? "## Next Step" : "",
    normalizeCta(value.cta),
    value.primaryKeyword
      ? `\n**Primary keyword:** ${sanitizeString(value.primaryKeyword)}`
      : "",
    normalizeStringArray(value.secondaryKeywords).length
      ? `\n**Secondary keywords:** ${normalizeStringArray(value.secondaryKeywords).join(", ")}`
      : "",
  ]);
}

function composeEmail(value) {
  if (!value.body) return "";
  return compactLines([
    value.previewText
      ? `**Preview text:** ${sanitizeString(value.previewText)}`
      : "",
    sanitizeString(value.body),
    normalizeCta(value.cta),
  ]);
}

function composeNewsletter(value) {
  const sections = normalizeSections(value.sections);
  if (!value.introduction && sections.length === 0) return "";
  return compactLines([
    sanitizeString(value.introduction),
    ...sections.flatMap((section) => [
      `## ${section.heading || section.title}`,
      section.body || section.description,
    ]),
    sanitizeString(value.closing),
    normalizeCta(value.cta),
  ]);
}

function composeLandingPage(value) {
  const hero = normalizeObject(value.hero);
  const benefits = normalizeSections(value.benefits);
  const features = normalizeSections(value.features);
  const faqs = normalizeFaqs(value.faqs);
  if (!hero.headline && benefits.length === 0 && features.length === 0) return "";

  return compactLines([
    hero.headline ? `# ${hero.headline}` : "",
    hero.subheadline,
    benefits.length ? "## Benefits" : "",
    ...benefits.flatMap((item) => [
      `### ${item.title || item.heading}`,
      item.description || item.body,
    ]),
    features.length ? "## Features" : "",
    ...features.flatMap((item) => [
      `### ${item.title || item.heading}`,
      item.description || item.body,
    ]),
    value.socialProof ? "## Why Trust Us" : "",
    sanitizeString(value.socialProof),
    faqs.length ? "## Frequently Asked Questions" : "",
    ...faqs.flatMap((item) => [
      `### ${item.question}`,
      item.answer,
    ]),
    value.cta ? "## Get Started" : "",
    normalizeCta(value.cta),
  ]);
}

function composeCaseStudy(value) {
  if (!value.challenge && !value.solution && !value.results) return "";
  return compactLines([
    value.background ? "## Background" : "",
    sanitizeString(value.background),
    value.challenge ? "## Challenge" : "",
    sanitizeString(value.challenge),
    value.solution ? "## Solution" : "",
    sanitizeString(value.solution),
    value.results ? "## Results" : "",
    sanitizeString(value.results),
    normalizeStringArray(value.takeaways).length ? "## Takeaways" : "",
    ...normalizeStringArray(value.takeaways).map((item) => `- ${item}`),
    normalizeCta(value.cta),
  ]);
}

function composeLinkedInPost(value) {
  if (!value.body) return "";
  return compactLines([
    value.hook ? `**${sanitizeString(value.hook)}**` : "",
    sanitizeString(value.body),
    value.takeaway ? `**Takeaway:** ${sanitizeString(value.takeaway)}` : "",
    normalizeCta(value.cta),
    formatHashtags(value.hashtags),
  ]);
}

function composeInstagramCaption(value) {
  if (!value.caption) return "";
  return compactLines([
    value.hook ? `**${sanitizeString(value.hook)}**` : "",
    sanitizeString(value.caption),
    normalizeCta(value.cta),
    formatHashtags(value.hashtags),
  ]);
}

function normalizeSections(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string" ? { heading: "", body: item.trim() } : normalizeObject(item),
    )
    .filter((item) => Object.values(item).some(Boolean));
}

function normalizeFaqs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeObject(item))
    .filter((item) => item.question || item.answer);
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          typeof item === "string" ? item.trim() : item,
        ]),
      )
    : {};
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeString(item)).filter(Boolean);
}

function normalizeCta(value) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  return [value.label, value.supportingText].map(sanitizeString).filter(Boolean).join(" - ");
}

function formatHashtags(value) {
  const hashtags = normalizeStringArray(value).map((item) =>
    item.startsWith("#") ? item : `#${item.replace(/\s+/g, "")}`,
  );
  return hashtags.join(" ");
}

function compactLines(lines) {
  return lines
    .map((line) => sanitizeString(line))
    .filter(Boolean)
    .join("\n\n");
}

function parseJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    extractJsonObject(trimmed),
  ]
    .flatMap((candidate) => [candidate, repairJsonCandidate(candidate)])
    .filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return parseLooseJsonFields(trimmed);
}

function repairJsonCandidate(candidate) {
  if (!candidate || typeof candidate !== "string") return "";

  return candidate
    .replace(/\\\r?\n/g, "\n")
    .replace(/\r?\n/g, "\\n")
    .replace(/,\s*}/g, "}");
}

function parseLooseJsonFields(text) {
  const title = extractLooseField(text, "title");
  const content = extractLooseField(text, "content");
  const cta = extractLooseField(text, "cta");

  if (!title && !content && !cta) {
    return null;
  }

  return { title, content, cta };
}

function extractLooseField(text, field) {
  const nextFields = ["title", "content", "cta", "metadata"]
    .filter((name) => name !== field)
    .join("|");
  const pattern = new RegExp(
    `"${field}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"(${nextFields})"|\\s*})`,
    "i",
  );
  const match = text.match(pattern);

  if (!match) return "";

  return unescapeLooseJsonString(match[1]);
}

function unescapeLooseJsonString(value) {
  return value
    .replace(/\\\r?\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return text.slice(start, end + 1);
}

function sanitizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function inferCta(content) {
  const match = content.match(
    /\b(learn more|sign up|apply now|get started|book a call|subscribe|download now)\b\.?/i,
  );

  return match ? match[0].replace(/\.$/, "") : "";
}

function buildFallbackTitle({ brief, content }) {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine && firstLine.length <= 90) {
    return firstLine.replace(/^#+\s*/, "");
  }

  const offer = brief?.offer || "Campaign";
  return `${offer} ${brief?.task || "Content"}`;
}

function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

module.exports = { normalizeContentOutput, countWords };
