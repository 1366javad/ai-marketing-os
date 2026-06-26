/**
 * loadCampaignEvents.js
 *
 * The ONLY place that knows how to fetch CampaignMemoryEvents from storage.
 * Returns RAW, UNFILTERED events — approval, risk, confidence, and supersedes
 * resolution are deliberately NOT done here. Those are separate, composable
 * steps in filters/, applied by getCampaignContextSlice.js in a fixed order.
 *
 * Keeping this function "dumb" is intentional: it should be trivial to unit
 * test the filters independently of the data layer, and trivial to test this
 * loader independently of business rules.
 *
 * Schema: docs/architecture/campaign-context-schema.md (CampaignMemoryEvent)
 */

/**
 * @typedef {Object} CampaignMemoryEvent
 * @property {string} id
 * @property {string} campaignId
 * @property {string} module
 * @property {string} artifact
 * @property {string} [type] legacy compatibility field
 * @property {"pending"|"approved"|"rejected"|"auto_saved"} approvalStatus
 * @property {number} confidence
 * @property {"low"|"medium"|"high"} riskLevel
 * @property {string} module
 * @property {string} task
 * @property {string} summary
 * @property {Object} payload
 * @property {string|null} supersedes
 * @property {string} createdAt
 * @property {string} createdBy
 */

async function defaultDbAdapter(_campaignId, _artifactSelectors) {
  throw new Error(
    "loadCampaignEvents: no DB adapter configured. " +
      "Pass a real adapter via the `dbAdapter` option — this default exists " +
      "only to fail loudly instead of silently returning an empty/fake list."
  );
}

/**
 * @param {string} campaignId
 * @param {Object} [options]
 * @param {Object[]|null} [options.artifactSelectors] - module/artifact pairs.
 *   null means "all types" (used for analytics — see matrix/getModuleEventTypes.js).
 *   This is a performance optimization only; it must NOT be relied on as the
 *   sole type filter — applyApprovalRules / the matrix filter step still apply
 *   defensively in getCampaignContextSlice.js, in case the adapter ignores this hint.
 * @param {boolean} [options.includePending=false]
 * @param {Function} [options.dbAdapter] - (campaignId, artifactSelectors, readOptions) => Promise<CampaignMemoryEvent[]>
 * @returns {Promise<CampaignMemoryEvent[]>} raw, unfiltered events — newest first is not guaranteed,
 *   callers needing order must sort explicitly (resolveSupersedes.js sorts internally).
 */
async function loadCampaignEvents(campaignId, options = {}) {
  if (!campaignId) {
    throw new Error("loadCampaignEvents: campaignId is required.");
  }

  const {
    artifactSelectors = null,
    includePending = false,
    dbAdapter = defaultDbAdapter,
  } = options;

  const events = await dbAdapter(campaignId, artifactSelectors, {
    includePending,
  });

  return Array.isArray(events) ? events : [];
}

module.exports = { loadCampaignEvents };
