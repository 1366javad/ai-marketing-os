export const CANONICAL_BRIEF_FIELDS = [
  "industry",
  "offer",
  "goal",
  "audience",
  "platform",
  "tone",
  "campaignType",
  "painPoints",
  "valueProposition",
  "cta",
  "creativeDirection",
];

export const DEFAULT_CANONICAL_BRIEF = {
  industry: "",
  offer: "",
  goal: "",
  audience: "",
  platform: "",
  tone: "",
  campaignType: "",
  painPoints: [],
  valueProposition: "",
  cta: "",
  creativeDirection: "",
};

export function createCanonicalBrief(input = {}) {
  return normalizeCanonicalBrief({
    ...DEFAULT_CANONICAL_BRIEF,
    ...input,
  });
}

export function normalizeCanonicalBrief(brief = {}) {
  return {
    industry: normalizeText(brief.industry),
    offer: normalizeText(brief.offer),
    goal: normalizeText(brief.goal),
    audience: normalizeText(brief.audience),
    platform: normalizeText(brief.platform).toLowerCase(),
    tone: normalizeText(brief.tone),
    campaignType: normalizeText(brief.campaignType),
    painPoints: normalizeStringList(brief.painPoints),
    valueProposition: normalizeText(brief.valueProposition),
    cta: normalizeText(brief.cta),
    creativeDirection: normalizeText(brief.creativeDirection),
  };
}

export function mergeCanonicalBrief(base = {}, override = {}) {
  const normalizedBase = normalizeCanonicalBrief(base);
  const normalizedOverride = normalizeCanonicalBrief(override);

  return createCanonicalBrief({
    ...normalizedBase,
    ...Object.fromEntries(
      Object.entries(normalizedOverride).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return Boolean(value);
      }),
    ),
  });
}

export function getCanonicalBriefCompleteness(brief = {}) {
  const normalizedBrief = normalizeCanonicalBrief(brief);
  const completedFields = CANONICAL_BRIEF_FIELDS.filter((field) => {
    const value = normalizedBrief[field];

    if (Array.isArray(value)) return value.length > 0;

    return Boolean(value);
  });

  return {
    completedFields,
    missingFields: CANONICAL_BRIEF_FIELDS.filter(
      (field) => !completedFields.includes(field),
    ),
    score: completedFields.length / CANONICAL_BRIEF_FIELDS.length,
  };
}

export function validateCanonicalBrief(brief = {}) {
  const normalizedBrief = normalizeCanonicalBrief(brief);
  const completeness = getCanonicalBriefCompleteness(normalizedBrief);
  const requiredFields = ["offer", "goal", "audience"];
  const missingRequiredFields = requiredFields.filter(
    (field) => !normalizedBrief[field],
  );

  return {
    valid: missingRequiredFields.length === 0,
    brief: normalizedBrief,
    completeness,
    missingRequiredFields,
  };
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map(normalizeText)
      .filter(Boolean);
  }

  return [];
}
