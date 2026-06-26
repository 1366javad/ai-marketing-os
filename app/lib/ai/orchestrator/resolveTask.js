/**
 * resolveTask.js
 *
 * Extracts the task description that will be passed to getCampaignContextSlice()
 * and eventually to the agent. This is NOT prompt building — it does not
 * construct the text the LLM will see. It only validates that Brief Builder
 * produced a usable task string and passes it through.
 *
 * Actual prompt construction is explicitly out of scope here — that's the
 * agent's own responsibility (step 10), using the task + context slice this
 * orchestrator pipeline hands it.
 */

/**
 * @param {Object} brief - output of Brief Builder (step 8)
 * @param {string} brief.normalizedTask
 * @returns {string}
 * @throws {Error} if normalizedTask is missing/empty
 */
function resolveTask(brief) {
  if (!brief || typeof brief.normalizedTask !== "string" || !brief.normalizedTask.trim()) {
    throw new Error(
      "resolveTask: brief.normalizedTask is required and must be non-empty. " +
        "This should have been guaranteed by Marketing Input Guard (step 7) " +
        "before reaching the orchestrator."
    );
  }

  return brief.normalizedTask.trim();
}

module.exports = { resolveTask };
