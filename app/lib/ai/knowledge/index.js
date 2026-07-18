const { KNOWLEDGE_DOMAINS, SOURCE_AUTHORITIES, SOURCE_KINDS } = require("./contracts");
const { buildKnowledgeIdentity } = require("./versions/buildKnowledgeIdentity");

// This is the only public entry point for the bounded Knowledge capability.
// Lifecycle operations are added by their owning sprints; persistence adapters
// deliberately remain internal to app/lib/ai/knowledge.
module.exports = Object.freeze({
  KNOWLEDGE_DOMAINS,
  SOURCE_AUTHORITIES,
  SOURCE_KINDS,
  buildKnowledgeIdentity,
});
