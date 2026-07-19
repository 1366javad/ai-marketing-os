function normalizeWhitespace(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sectionsFromParagraphs(text) {
  if (!text) return [];
  return text.split(/\n{2,}/).map((section, ordinal) => ({
    heading: null,
    text: section,
    ordinal,
  }));
}

function normalizeText(content) {
  const normalizedText = normalizeWhitespace(content);
  return {
    normalizedText,
    sections: sectionsFromParagraphs(normalizedText),
    warnings: normalizedText ? [] : ["empty_source"],
  };
}

module.exports = { normalizeText, normalizeWhitespace, sectionsFromParagraphs };
