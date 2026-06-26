export function flattenOutputs(workflowResults) {
  const outputs = [];

  for (const result of workflowResults) {
    const items = result?.output?.outputs || [];

    for (const item of items) {
      outputs.push(item);
    }
  }

  return outputs;
}
