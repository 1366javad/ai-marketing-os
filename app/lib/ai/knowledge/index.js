const { KNOWLEDGE_DOMAINS, SOURCE_AUTHORITIES, SOURCE_KINDS } = require("./contracts");
const { buildKnowledgeIdentity } = require("./versions/buildKnowledgeIdentity");
const { createSupabaseKnowledgePersistence } = require("./adapters/createSupabaseKnowledgePersistence");
const { createSourceService } = require("./sources/createSourceService");
const { createExtractionService } = require("./extraction/createExtractionService");
const { createVersionService } = require("./versions/createVersionService");
const { createKnowledgeSliceService } = require("./slicing/createKnowledgeSliceService");

// This is the only public entry point for the bounded Knowledge capability.
// Lifecycle operations are added by their owning sprints; persistence adapters
// deliberately remain internal to app/lib/ai/knowledge.
function createKnowledgeService({ supabase, persistence, logger, clock, provider }) {
  const knowledgePersistence = persistence || createSupabaseKnowledgePersistence(supabase);
  return Object.freeze({
    ...createSourceService({ persistence: knowledgePersistence, logger, clock }),
    ...createExtractionService({
      persistence: knowledgePersistence,
      provider,
      logger,
    }),
    ...createVersionService({ persistence: knowledgePersistence }),
    ...createKnowledgeSliceService({ persistence: knowledgePersistence, clock }),
  });
}

module.exports = Object.freeze({
  KNOWLEDGE_DOMAINS,
  SOURCE_AUTHORITIES,
  SOURCE_KINDS,
  buildKnowledgeIdentity,
  createKnowledgeService,
});
