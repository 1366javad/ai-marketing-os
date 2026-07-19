const { normalizeText } = require("./normalizeText");

function normalizeDocument(content) {
  const value = Buffer.isBuffer(content) ? content.toString("utf8") : content;
  const result = normalizeText(String(value || "").replace(/\f/g, "\n\n"));
  return {
    ...result,
    warnings: [
      ...(Buffer.isBuffer(content) ? ["binary_decoded_as_utf8"] : []),
      ...result.warnings,
    ],
  };
}

module.exports = { normalizeDocument };
