/**
 * index.js — Marketing Input Guard entry point
 *
 * Public surface of this package. Callers should only import from here,
 * not reach into individual rule files directly — that keeps the internal
 * rule-composition order (resolveValidationResult.js) as the single source
 * of truth for status precedence.
 */

const { validateInput } = require("./validateInput");

module.exports = { validateInput };
