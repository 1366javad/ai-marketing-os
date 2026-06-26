/**
 * applyApprovalRules.js
 *
 * Enforces Rule 3 and Rule 4 of campaign-memory-v1.md:
 *
 *   Rule 3 — Agents read only approved/auto_saved memory by default.
 *   Rule 4 — Pending outputs do not feed other agents, even from the
 *            same module on a normal getCampaignContextSlice() call
 *            (see context-slicing-examples.md, "Cross-Cutting Edge Case").
 *
 * This is the single most safety-critical filter in the pipeline — it's
 * what prevents one agent's hallucination or unreviewed draft from quietly
 * becoming another agent's "fact." Keep this function boring and obvious;
 * do not add cleverness here.
 */

const ALLOWED_BY_DEFAULT = Object.freeze(["approved", "auto_saved"]);

/**
 * @param {import("../events/loadCampaignEvents").CampaignMemoryEvent[]} events
 * @param {Object} [options]
 * @param {boolean} [options.includePending=false] - Rule 4: must default to false.
 *   The ONLY legitimate caller for `true` is the human-review/approval UI itself —
 *   never an agent-facing generation call. getCampaignContextSlice.js must never
 *   let an agent-mode caller flip this on (see orchestrator-design.md, Section 4).
 * @returns {import("../events/loadCampaignEvents").CampaignMemoryEvent[]}
 */
function applyApprovalRules(events, options = {}) {
  const { includePending = false } = options;

  if (includePending) {
    // Explicit opt-in path — used only by review UI, per Rule 4.
    // Rejected events are still excluded even here: a human reviewing
    // pending items has no reason to see already-rejected ones in this slice.
    return events.filter((e) => e.approvalStatus !== "rejected");
  }

  return events.filter((e) => ALLOWED_BY_DEFAULT.includes(e.approvalStatus));
}

module.exports = { applyApprovalRules, ALLOWED_BY_DEFAULT };
