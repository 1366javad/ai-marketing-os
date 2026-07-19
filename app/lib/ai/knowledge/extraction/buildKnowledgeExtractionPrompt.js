const MAX_EXTRACTION_CHARACTERS = 18000;
const MAX_EXTRACTION_SECTIONS = 50;

function buildKnowledgeExtractionPrompt({ source, normalization }) {
  const sections = (normalization.sections || [])
    .slice(0, MAX_EXTRACTION_SECTIONS)
    .map((section) => ({
      ordinal: section.ordinal,
      heading: section.heading || null,
      text: String(section.text || "").slice(0, MAX_EXTRACTION_CHARACTERS),
    }));
  const sourcePayload = JSON.stringify({
    sourceId: source.id,
    sourceKind: source.source_kind,
    title: source.title,
    authority: source.authority,
    language: normalization.language,
    sections,
  }).slice(0, MAX_EXTRACTION_CHARACTERS);

  return {
    systemPrompt: [
      "You extract durable business knowledge claims from one normalized source.",
      "Return JSON only with shape: {claims:[{domain,subjectKey,claimKey,value,scope,validity,evidence:[{sectionOrdinal,excerpt}]}]}.",
      "Allowed domains: brand_identity, tone_rule, positioning, value_proposition, product, offer, business_model, audience, business_goal, constraint, approved_fact, validated_learning.",
      "Every claim must cite an exact verbatim excerpt from the supplied section.",
      "Do not infer unsupported facts. Do not return approval, visibility, status, confidence, version, or routing fields.",
      "Use stable lowercase snake_case subjectKey and claimKey values.",
    ].join("\n"),
    userPrompt: `Extract candidate claims from this normalized source:\n${sourcePayload}`,
  };
}

module.exports = {
  MAX_EXTRACTION_CHARACTERS,
  MAX_EXTRACTION_SECTIONS,
  buildKnowledgeExtractionPrompt,
};
