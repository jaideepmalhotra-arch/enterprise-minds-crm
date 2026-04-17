import { supabase } from '../data/supabase.js';

export async function logAudit(eventType, summary, detail = null) {
  try {
    await supabase.from('audit_log').insert({
      event_type:   eventType,
      summary:      summary,
      detail:       detail || null,
      performed_by: 'JM',
      created_at:   new Date().toISOString(),
    });
  } catch(e) {
    console.warn('Audit log failed:', e.message);
  }
}
