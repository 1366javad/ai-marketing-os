/**
 * resolveSupersedes.js
 *
 * Enforces Rule 2 of campaign-memory-v1.md:
 *
 *   "Memory Events = Append-Only History. No event is ever deleted or
 *    mutated. Corrections happen by writing a new event that references
 *    and supersedes the old one (`supersedes: eventId`)."
 *
 * Storage keeps every version forever (append-only). But a CONSUMER of
 * the memory slice — an agent generating new content — should only ever
 * see the CURRENT version of a given fact, not both the old and new
 * versions side by side. That resolution happens here.
 *
 * Supports `asOfVersion`-style historical replay implicitly: if the caller
 * has already filtered `events` to only those createdAt <= some point in
 * time (done by the caller, not this function), supersedes chains still
 * resolve correctly within that subset.
 */

/**
 * @param {import("../events/loadCampaignEvents").CampaignMemoryEvent[]} events
 * @returns {import("../events/loadCampaignEvents").CampaignMemoryEvent[]} events with
 *   any event that has been superseded by another event in this same list removed.
 *   An event whose superseding event is NOT present in this list (e.g. it was
 *   filtered out by an earlier step — approval/risk/confidence) is left as-is:
 *   we only hide an old version when its replacement actually made it through
 *   the rest of the pipeline.
 */
function resolveSupersedes(events) {
  const supersededIds = new Set(
    events
      .map((e) => e.supersedes)
      .filter((id) => id !== null && id !== undefined)
  );

  return events.filter((e) => !supersededIds.has(e.id));
}

module.exports = { resolveSupersedes };
