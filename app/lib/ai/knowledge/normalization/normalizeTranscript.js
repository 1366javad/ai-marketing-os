const { normalizeWhitespace, sectionsFromParagraphs } = require("./normalizeText");

function normalizeTranscript(content) {
  const normalizedText = normalizeWhitespace(
    String(content || "")
      .replace(/^\s*\d+\s*$/gm, "")
      .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\s*$/gm, "")
      .replace(/^\s*\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/gm, ""),
  );
  return {
    normalizedText,
    sections: sectionsFromParagraphs(normalizedText),
    warnings: normalizedText ? [] : ["empty_transcript"],
  };
}

module.exports = { normalizeTranscript };
