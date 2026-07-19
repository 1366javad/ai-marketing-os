const { calculateCandidateConfidence } = require("./calculateCandidateConfidence");

function synthesizeCandidateGroups(candidates) {
  const identities = new Map();
  for (const candidate of candidates || []) {
    if (!identities.has(candidate.identityKey)) identities.set(candidate.identityKey, []);
    identities.get(candidate.identityKey).push(candidate);
  }

  return [...identities.entries()].map(([identityKey, identityCandidates]) => {
    const allSources = new Set(identityCandidates.flatMap((candidate) => candidate.evidence.map((item) => item.sourceId)));
    const conflict = identityCandidates.length > 1;
    const updates = identityCandidates.map((candidate) => {
      const sourceIds = new Set(candidate.evidence.map((item) => item.sourceId));
      return {
        candidateId: candidate.id,
        confidence: calculateCandidateConfidence({
          authorities: candidate.evidence.map((item) => item.authority),
          agreeingSourceCount: sourceIds.size,
          identitySourceCount: allSources.size,
          evidenceComplete: candidate.evidence.length > 0 && candidate.evidence.every((item) => item.excerptHash),
        }),
        status: conflict ? "needs_review" : "candidate",
      };
    });
    return {
      identityKey,
      updates,
      conflict: conflict
        ? {
            kind: "value_conflict",
            candidateIds: identityCandidates.map((candidate) => candidate.id).sort(),
            status: "open",
          }
        : null,
    };
  });
}

module.exports = { synthesizeCandidateGroups };
