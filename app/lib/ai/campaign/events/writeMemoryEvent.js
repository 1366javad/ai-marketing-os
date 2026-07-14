async function writeMemoryEvent(event, options = {}) {
  const { dbAdapter } = options;

  if (!event?.campaignId) {
    throw new Error("writeMemoryEvent: campaignId is required.");
  }
  if (!event?.module || !event?.artifact || !event?.task) {
    throw new Error("writeMemoryEvent: module, artifact, and task are required.");
  }
  if (typeof dbAdapter !== "function") {
    throw new Error("writeMemoryEvent: dbAdapter is required.");
  }

  return dbAdapter(event);
}

module.exports = { writeMemoryEvent };
