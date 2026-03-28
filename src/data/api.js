import { supabase } from './supabase.js';

export async function fetchUnassignedLeads(filters = {}) {
  let q = supabase.from('leads')
    .select('*')
    .order('company')
    .limit(500);

  // Only leads not yet in pipeline
  const { data: pipelineLeads } = await supabase.from('pipeline_cards').select('lead_id');
  const pipelineIds = (pipelineLeads || []).map(r => r.lead_id);
  if (pipelineIds.length > 0) q = q.not('id', 'in', `(${pipelineIds.join(',')})`);

  if (filters.country) q = q.eq('country', filters.country);
  if (filters.tier)    q = q.eq('tier', filters.tier);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function assignLeads({ leadIds, repId, assignedBy }) {
  const cards = leadIds.map(leadId => ({
    lead_id: leadId, rep_id: repId, stage: 'assigned',
    assigned_at: new Date().toISOString(),
    assigned_by: assignedBy, moved_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('pipeline_cards').insert(cards);
  if (error) throw error;
}

export async function moveCard({ cardId, stage }) {
  const { error } = await supabase.from('pipeline_cards')
    .update({ stage, moved_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) throw error;
}

export async function selfAssign({ cardId, repId }) {
  const { error } = await supabase.from('pipeline_cards')
    .update({ rep_id: repId, stage: 'assigned', assigned_at: new Date().toISOString() })
    .eq('id', cardId);
  if (error) throw error;
}

export async function logActivity({ leadId, repId, type, note, outcome }) {
  const { error } = await supabase.from('activities').insert({
    lead_id: leadId, rep_id: repId, type,
    note: note || null, outcome: outcome || null,
    logged_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function createTask({ leadId, repId, title, type, dueDate, priority, createdBy }) {
  const { error } = await supabase.from('tasks').insert({
    lead_id: leadId, rep_id: repId, title, type,
    due_date: dueDate || null, priority: priority || 'medium',
    status: 'open', created_by: createdBy || null,
  });
  if (error) throw error;
}
