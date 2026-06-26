export function createAgentResult({
  agent,
  status = "completed",
  input = {},
  output = {},
  usage = null,
  error = null,
}) {
  return {
    agent,
    status,
    input,
    output,
    usage,
    error,
    createdAt: new Date().toISOString(),
  };
}
