export function validateCampaignBrief(brief = {}) {
  const errors = [];

  if (!brief.campaignId) errors.push("campaignId is required");
  if (!brief.campaignName) errors.push("campaignName is required");
  if (!brief.goal) errors.push("goal is required");
  if (!brief.targetAudience) errors.push("targetAudience is required");

  return {
    valid: errors.length === 0,
    errors,
  };
}
