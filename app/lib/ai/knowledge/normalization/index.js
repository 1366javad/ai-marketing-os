const { normalizeDocument } = require("./normalizeDocument");
const { normalizeText } = require("./normalizeText");
const { normalizeTranscript } = require("./normalizeTranscript");
const { normalizeWebsiteSnapshot } = require("./normalizeWebsiteSnapshot");

const NORMALIZER_VERSION = "knowledge-normalizer-v1";

const NORMALIZERS = Object.freeze({
  text: normalizeText,
  document: normalizeDocument,
  website_snapshot: normalizeWebsiteSnapshot,
  transcript: normalizeTranscript,
});

function normalizeSourceContent(sourceKind, content) {
  const normalizer = NORMALIZERS[sourceKind];
  if (!normalizer) throw new TypeError(`Unsupported source kind: ${sourceKind}`);
  return normalizer(content);
}

module.exports = { NORMALIZER_VERSION, normalizeSourceContent };
