const { createHash } = require("node:crypto");

function toSourceBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (typeof content === "string") return Buffer.from(content, "utf8");
  throw new TypeError("source content must be a string or Buffer");
}

function hashSourceContent(content) {
  return createHash("sha256").update(toSourceBuffer(content)).digest("hex");
}

module.exports = { hashSourceContent, toSourceBuffer };
