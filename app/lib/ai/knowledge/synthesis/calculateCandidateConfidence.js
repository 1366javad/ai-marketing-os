const AUTHORITY_SCORES = Object.freeze({ authoritative: 1, supporting: 0.7, unverified: 0.4 });

function clamp(value) {
  return Math.min(1, Math.max(0, value));
}

function calculateCandidateConfidence({ authorities, agreeingSourceCount, identitySourceCount, evidenceComplete }) {
  const scores = authorities.map((authority) => AUTHORITY_SCORES[authority] ?? 0.4);
  const sourceAuthority = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const crossSourceAgreement = identitySourceCount > 1
    ? agreeingSourceCount / identitySourceCount
    : 0.5;
  const evidenceCompleteness = evidenceComplete ? 1 : 0;
  return Math.round(clamp(
    0.4 * sourceAuthority +
      0.35 * crossSourceAgreement +
      0.25 * evidenceCompleteness,
  ) * 100) / 100;
}

module.exports = { AUTHORITY_SCORES, calculateCandidateConfidence };
