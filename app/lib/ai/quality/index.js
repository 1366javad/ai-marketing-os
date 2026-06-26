/**
 * index.js — Quality Layer entry point
 *
 * Single public function: runQualityChecks(agentOutput, executionPlan, brief)
 *
 * Receives agent output AFTER provider call, BEFORE memory write or user display.
 * Returns a QualityResult that the caller uses to decide:
 *   - pass → proceed to Risk Gate / Memory Write
 *   - fail → return to user with issues flagged (not written to memory)
 *
 * No LLM. No I/O. Pure function of its three inputs.
 */

const { checkRequiredFields }   = require("./checkRequiredFields");
const { checkGenericOutput }    = require("./checkGenericOutput");
const { checkPlatformFit }      = require("./checkPlatformFit");
const { checkCta }              = require("./checkCta");
const { checkResearchDepth }    = require("./checkResearchDepth");
const { classifyOutputRisk }    = require("./classifyOutputRisk");
const { normalizeQualityResult }= require("./normalizeQualityResult");

/**
 * @param {Object} agentOutput
 * @param {string} agentOutput.eventType
 * @param {string} agentOutput.summary
 * @param {Object} agentOutput.payload
 * @param {"low"|"medium"|"high"} [agentOutput.suggestedRiskLevel]
 * @param {Object} executionPlan  - from runOrchestrator()
 * @param {Object} brief          - from buildBrief()
 * @returns {QualityResult}
 */
function runQualityChecks(agentOutput, executionPlan, brief) {
  if (!agentOutput || !executionPlan || !brief) {
    throw new Error("runQualityChecks: agentOutput, executionPlan, and brief are all required.");
  }

  const eventType = agentOutput.eventType;

  const requiredFields  = checkRequiredFields(agentOutput, eventType);
  const researchDepth   = checkResearchDepth(agentOutput, eventType);
  const requiredResult  = {
    passed: requiredFields.passed && researchDepth.passed,
    missing: [...requiredFields.missing, ...researchDepth.missing],
  };
  const genericOutput   = checkGenericOutput(agentOutput, eventType);
  const platformFit     = checkPlatformFit(agentOutput, eventType, brief.platforms);
  const cta             = checkCta(agentOutput, eventType);
  const riskResult      = classifyOutputRisk(agentOutput, executionPlan);

  return normalizeQualityResult({
    requiredFields: requiredResult,
    genericOutput,
    platformFit,
    cta,
    riskResult,
  });
}

module.exports = { runQualityChecks };
