/**
 * loadCampaignContext.js
 *
 * The ONLY place that knows how to fetch a CampaignContextObject from
 * storage. Everything above this layer (getCampaignContextSlice and its
 * other helpers) must not know or care whether this is Postgres, Mongo,
 * a REST call, or a file on disk.
 *
 * Schema: docs/architecture/campaign-context-schema.md
 *
 * The actual DB client is injected, not imported directly, so this file
 * stays testable and swappable. Replace `defaultDbAdapter` with your real
 * data layer when wiring this up — nothing else in campaign/ needs to change.
 */

/**
 * @typedef {Object} CampaignContextObject
 * @property {string} campaignId
 * @property {string} campaignName
 * @property {number} contextVersion
 * @property {string} industry
 * @property {string} offer
 * @property {string} goal
 * @property {string} audience
 * @property {string} positioning
 * @property {string} valueProposition
 * @property {string} tone
 * @property {string[]} platforms
 * @property {string[]} competitors
 * @property {"draft"|"active"|"completed"} status
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Default adapter placeholder. Replace at call sites (or via dependency
 * injection in your app's composition root) with the real DB client.
 * Throwing here is intentional — silently returning a fake object would
 * hide a wiring mistake until production.
 */
async function defaultDbAdapter(_campaignId, _asOfVersion) {
  throw new Error(
    "loadCampaignContext: no DB adapter configured. " +
      "Pass a real adapter via the `dbAdapter` option — this default exists " +
      "only to fail loudly instead of silently returning fake data."
  );
}

/**
 * @param {string} campaignId
 * @param {Object} [options]
 * @param {number} [options.asOfVersion] - fetch a specific historical version (audit/replay). Defaults to latest.
 * @param {Function} [options.dbAdapter] - (campaignId, asOfVersion) => Promise<CampaignContextObject | null>
 * @returns {Promise<CampaignContextObject>}
 * @throws {Error} if the campaign doesn't exist — caller (the Orchestrator, per
 *   orchestrator-design.md Section 1) is responsible for catching this and
 *   falling back to TOOL_MODE; this function does not make that decision itself.
 */
async function loadCampaignContext(campaignId, options = {}) {
  if (!campaignId) {
    throw new Error("loadCampaignContext: campaignId is required.");
  }

  const { asOfVersion = null, dbAdapter = defaultDbAdapter } = options;

  const context = await dbAdapter(campaignId, asOfVersion);

  if (!context) {
    throw new Error(
      `loadCampaignContext: no campaign found for campaignId "${campaignId}"` +
        (asOfVersion ? ` at version ${asOfVersion}` : "") +
        `. Caller must decide fallback behavior (see orchestrator-design.md, Section 1).`
    );
  }

  return context;
}

module.exports = { loadCampaignContext };
