/**
 * getModuleContextFields.js
 *
 * Source of truth: docs/architecture/context-slicing-matrix.md
 *
 * Returns the list of CampaignContextObject field names a given module
 * is allowed to read. This is a pure lookup — no DB, no I/O.
 *
 * "analytics" is the one documented exception (returns null, meaning
 * "full object" — see context-slicing-matrix.md, Analytics section).
 * Every other module gets an explicit field whitelist.
 */

const MODULE_CONTEXT_FIELDS = Object.freeze({
  research: ["industry", "competitors", "audience", "goal"],

  seo: ["goal", "audience", "offer", "competitors", "industry"],

  content: ["audience", "offer", "tone", "positioning", "valueProposition"],

  creative: ["audience", "offer", "tone", "positioning", "platforms"],

  ads: ["audience", "offer", "positioning", "valueProposition", "platforms"],

  video: ["goal", "audience", "offer", "tone", "positioning", "platforms"],

  // analytics: null = full object access (documented exception, not an oversight)
  analytics: null,
});

const VALID_MODULES = Object.freeze(Object.keys(MODULE_CONTEXT_FIELDS));

/**
 * @param {string} module - one of: research | seo | content | creative | ads | analytics
 * @returns {string[] | null} field names to whitelist, or null for "full object" (analytics only)
 * @throws {Error} if module is not recognized — fails loudly, never silently allows everything
 */
function getModuleContextFields(module) {
  if (!VALID_MODULES.includes(module)) {
    throw new Error(
      `getModuleContextFields: unknown module "${module}". ` +
        `Valid modules are: ${VALID_MODULES.join(", ")}. ` +
        `If this is a new module, add it to context-slicing-matrix.md first, then here.`
    );
  }
  return MODULE_CONTEXT_FIELDS[module];
}

module.exports = { getModuleContextFields, VALID_MODULES };
