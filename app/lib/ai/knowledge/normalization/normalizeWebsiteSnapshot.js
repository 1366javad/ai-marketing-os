const { normalizeWhitespace, sectionsFromParagraphs } = require("./normalizeText");

const ENTITIES = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
});

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith("#x")) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    return match;
  });
}

function normalizeWebsiteSnapshot(content) {
  const html = String(content || "");
  const withoutNoise = html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<\/(p|div|section|article|main|header|footer|nav|li|h[1-6])>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const normalizedText = normalizeWhitespace(decodeEntities(withoutNoise));
  return {
    normalizedText,
    sections: sectionsFromParagraphs(normalizedText),
    warnings: normalizedText ? [] : ["empty_website_snapshot"],
  };
}

module.exports = { normalizeWebsiteSnapshot };
