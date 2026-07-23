function clamp(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function calculateLearningConfidence({ reliability = 0, sufficiency = 0, independence = 0, repeatability = 0, consistency = 0, scopeFit = 0, recency = 0, contradiction = 0 }) {
  return Number(clamp(.17 * clamp(reliability) + .15 * clamp(sufficiency) + .14 * clamp(independence) + .16 * clamp(repeatability) + .14 * clamp(consistency) + .10 * clamp(scopeFit) + .08 * clamp(recency) - .16 * clamp(contradiction)).toFixed(4));
}
function confidenceBand(score) { return score >= .9 ? "very_high" : score >= .75 ? "high" : score >= .5 ? "moderate" : "low"; }
module.exports = { calculateLearningConfidence, confidenceBand };
