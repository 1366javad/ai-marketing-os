function createSupabaseMemoryWriter(supabase) {
  return async (event) => {
    const row = toSupabaseMemoryRow(event);
    const { data, error } = await supabase
      .from("campaign_memory_events")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return data;
  };
}

function toSupabaseMemoryRow(event) {
  return {
    campaign_id: event.campaignId,
    type: event.artifact,
    module: event.module,
    artifact: event.artifact,
    approval_status: event.approvalStatus,
    confidence: event.confidence,
    risk_level: event.riskLevel,
    task: event.task,
    summary: event.summary,
    payload: event.payload,
    supersedes: event.supersedes || null,
    created_by: event.createdBy,
  };
}

module.exports = { createSupabaseMemoryWriter, toSupabaseMemoryRow };
