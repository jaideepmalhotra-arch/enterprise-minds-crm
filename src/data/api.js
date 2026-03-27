import { supabase } from './supabase.js';

// ── CLIENTS ───────────────────────────────────
export async function fetchClients({ search, status, country } = {}) {
  let q = supabase.from('clients').select('*, contacts(id,name,role,email,phone,is_primary)')
    .order('company');
  if (search)  q = q.ilike('company', `%${search}%`);
  if (status)  q = q.eq('status', status);
  if (country) q = q.eq('country', country);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertClient(client) {
  const { id, ...fields } = client;
  fields.updated_at = new Date().toISOString();
  if (id) {
    const { data, error } = await supabase.from('clients').update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('clients').insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// ── CONTACTS ──────────────────────────────────
export async function upsertContact(contact) {
  const { id, ...fields } = contact;
  if (id) {
    const { data, error } = await supabase.from('contacts').update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('contacts').insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

// ── DEALS ─────────────────────────────────────
export async function fetchDeals({ stage, owner } = {}) {
  let q = supabase.from('deals')
    .select('*, clients(company,country)')
    .order('stage').order('position');
  if (stage) q = q.eq('stage', stage);
  if (owner) q = q.eq('owner', owner);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertDeal(deal) {
  const { id, ...fields } = deal;
  fields.updated_at = new Date().toISOString();
  if (id) {
    const { data, error } = await supabase.from('deals').update(fields).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('deals').insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function moveDeal({ dealId, stage, stageStatus }) {
  const { error } = await supabase.from('deals')
    .update({ stage, stage_status: stageStatus || null, updated_at: new Date().toISOString() })
    .eq('id', dealId);
  if (error) throw error;
}

export async function deleteDeal(id) {
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) throw error;
}

// ── ACTIVITIES ────────────────────────────────
export async function logActivity({ dealId, clientId, type, note, outcome, loggedBy = 'JM' }) {
  const { data, error } = await supabase.from('activities')
    .insert({ deal_id: dealId, client_id: clientId, type, note, outcome, logged_by: loggedBy })
    .select().single();
  if (error) throw error;
  return data;
}

export async function fetchActivities({ dealId, clientId, since } = {}) {
  let q = supabase.from('activities').select('*').order('logged_at', { ascending: false }).limit(100);
  if (dealId)   q = q.eq('deal_id', dealId);
  if (clientId) q = q.eq('client_id', clientId);
  if (since)    q = q.gte('logged_at', since);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ── TASKS ─────────────────────────────────────
export async function fetchTasks({ status, dealId } = {}) {
  let q = supabase.from('tasks')
    .select('*, deals(title, company)')
    .order('due_date', { ascending: true, nullsLast: true });
  if (dealId) q = q.eq('deal_id', dealId);
  if (status) q = q.eq('status', status);
  else        q = q.neq('status', 'done');
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createTask({ dealId, clientId, title, type, dueDate, priority }) {
  const { data, error } = await supabase.from('tasks')
    .insert({ deal_id: dealId, client_id: clientId, title, type, due_date: dueDate, priority })
    .select().single();
  if (error) throw error;
  return data;
}

export async function completeTask(id) {
  const { error } = await supabase.from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ── DASHBOARD STATS ───────────────────────────
export async function fetchDashboardStats() {
  const [deals, acts, tasks] = await Promise.all([
    supabase.from('deals').select('stage,value,currency,created_at,closed_at'),
    supabase.from('activities').select('type,logged_at').gte('logged_at', new Date(Date.now()-7*86400000).toISOString()),
    supabase.from('tasks').select('status,due_date').neq('status','done'),
  ]);
  return {
    deals:      deals.data  || [],
    activities: acts.data   || [],
    tasks:      tasks.data  || [],
  };
}

// ── REALTIME ──────────────────────────────────
export function subscribeToDeals(cb) {
  return supabase.channel('deals-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, cb)
    .subscribe();
}

export function subscribeToActivities(cb) {
  return supabase.channel('activity-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, cb)
    .subscribe();
}
