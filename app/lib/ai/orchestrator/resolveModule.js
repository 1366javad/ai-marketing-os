/**
 * resolveModule.js
 *
 * Decides WHICH module (Research / SEO / Content / Creative / Ads / Analytics)
 * should handle this request. This is a routing decision only — it does not
 * call the agent, does not build a prompt, does not know anything about
 * providers. It trusts Brief Builder (step 8, not yet built) to have already
 * normalized the user's intent into a `requestedModule` field; this function's
 * job is just to validate that value against the known module list and reject
 * anything unrecognized, rather than guessing.
 *
 * Module list source of truth: context-slicing-matrix.md
 */

const VALID_MODULES = Object.freeze([
  "research",
  "seo",
  "content",
  "creative",
  "ads",
  "video",
  "analytics",
]);

/**
 * @param {Object} brief - output of Brief Builder (step 8). Until that module
 *   exists, callers/tests may pass a plain object with `requestedModule` set.
 * @param {string} brief.requestedModule
 * @returns {string} one of VALID_MODULES
 * @throws {Error} if requestedModule is missing or unrecognized — this function
 *   never guesses a default module. Ambiguous intent must be resolved by Brief
 *   Builder or Input Guard (steps 7-8), not silently here.
 */
function resolveModule(brief) {
  if (!brief || !brief.requestedModule) {
    throw new Error(
      "resolveModule: brief.requestedModule is required. " +
        "Ambiguous module intent must be resolved upstream by Brief Builder/Input Guard, " +
        "not guessed here."
    );
  }

  if (!VALID_MODULES.includes(brief.requestedModule)) {
    throw new Error(
      `resolveModule: unrecognized module "${brief.requestedModule}". ` +
        `Valid modules: ${VALID_MODULES.join(", ")}.`
    );
  }

  return brief.requestedModule;
}

module.exports = { resolveModule, VALID_MODULES };
