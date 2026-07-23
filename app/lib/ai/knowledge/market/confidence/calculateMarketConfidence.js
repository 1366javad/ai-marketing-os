const AUTHORITY = Object.freeze({ primary: 1, authoritative_secondary: 0.85, supporting: 0.65, unverified: 0.35 });

function calculateMarketConfidence({ authorities, independentSources, evidenceCoverage = 1, recency = 1, conflict = false }) {
  const average = authorities.length ? authorities.reduce((sum, item) => sum + (AUTHORITY[item] ?? 0.35), 0) / authorities.length : 0;
  const corroboration = Math.min(1, Number(independentSources || 0) / 3);
  const score = Math.max(0, Math.min(1, 0.35 * average + 0.25 * corroboration + 0.2 * evidenceCoverage + 0.2 * recency - (conflict ? 0.25 : 0)));
  return Math.round(score * 100) / 100;
}

function confidenceBand(value) {
  if (value >= 0.9) return "very_high";
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "moderate";
  return "low";
}

module.exports = { calculateMarketConfidence, confidenceBand };
