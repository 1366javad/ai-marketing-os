const { KNOWLEDGE_DOMAINS, SOURCE_AUTHORITIES, SOURCE_KINDS } = require("./contracts");
const { buildKnowledgeIdentity } = require("./versions/buildKnowledgeIdentity");
const { createSupabaseKnowledgePersistence } = require("./adapters/createSupabaseKnowledgePersistence");
const { createSourceService } = require("./sources/createSourceService");

// This is the only public entry point for the bounded Knowledge capability.
// Lifecycle operations are added by their owning sprints; persistence adapters
// deliberately remain internal to app/lib/ai/knowledge.
function createKnowledgeService({ supabase, persistence, logger, clock }) {
  const knowledgePersistence = persistence || createSupabaseKnowledgePersistence(supabase);
  return createSourceService({ persistence: knowledgePersistence, logger, clock });
}

module.exports = Object.freeze({
  KNOWLEDGE_DOMAINS,
  SOURCE_AUTHORITIES,
  SOURCE_KINDS,
  buildKnowledgeIdentity,
  createKnowledgeService,
});
