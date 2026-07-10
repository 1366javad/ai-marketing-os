# ADR-005 — Marketing Brain Architecture

## Status

Accepted

## Context

AI Marketing OS started as a campaign-centric AI workspace with multiple modules:
Research, SEO, Content, Creative, Video, Ads, and Analytics.

The risk is that these modules become isolated AI tools rather than one intelligent system.

To create long-term product value, AI Marketing OS must evolve into a unified Marketing Brain with specialized agents and shared memory.

## Decision

AI Marketing OS will use Marketing Brain as the central decision layer.

Marketing Brain owns:

- Campaign strategy
- Agent orchestration
- Memory interpretation
- Next-action recommendations
- Conflict resolution
- Approval logic

Specialized agents own execution only.

Agents can recommend actions, but Marketing Brain makes the strategic decision.

## Architecture

Marketing Brain sits above all agents.

Agents:

- Research Agent
- SEO Agent
- Content Agent
- Creative Agent
- Video Agent
- Ads Agent
- Analytics Agent

Memory:

- Business Memory
- Campaign Memory
- Market Memory
- Learning Memory

AI Assistant is the user-facing interface to Marketing Brain.

Knowledge Engine is responsible for transforming raw business sources into structured knowledge.

## Consequences

Positive:

- Stronger product differentiation
- Less fragmented agent behavior
- Better campaign consistency
- More durable value than provider-specific AI calls
- Clear long-term product direction

Negative:

- Requires disciplined architecture
- More upfront design work
- Agent outputs must become structured and memory-aware
- UI must expose Brain decisions clearly

## Non-Goals

This ADR does not require:

- n8n as the core workflow engine
- NotebookLM integration
- GPU ownership
- Custom model training
- Full market intelligence in Phase 1

## Phase 1 Implementation Direction

Phase 1 should focus on:

- Shared Campaign Memory
- Agent-to-agent context usage
- Brain campaign summary
- AI Assistant as Brain interface
- Approval modes
- Provenance of memory used by each output
