export {
  validateMarketingInput,
} from "./inputGuard";

export {
  CANONICAL_BRIEF_FIELDS,
  DEFAULT_CANONICAL_BRIEF,
  createCanonicalBrief,
  getCanonicalBriefCompleteness,
  mergeCanonicalBrief,
  normalizeCanonicalBrief,
  validateCanonicalBrief,
} from "./canonicalBrief";

export {
  buildMarketingBrief,
} from "./briefBuilder";

export {
  buildMarketingStrategy,
} from "./strategyLayer";

export {
  buildAdsPrompt,
  buildContentPrompt,
  buildCreativePrompt,
  buildModulePrompt,
  buildResearchPrompt,
  buildSeoPrompt,
} from "./promptBuilders";

export {
  attachQualityMetadata,
  checkMarketingOutput,
} from "./qualityLayer";

export {
  formatCreativeOutput,
  formatMarkdown,
  formatMarketingOutput,
  formatStructuredAdCopy,
} from "./outputFormatter";
