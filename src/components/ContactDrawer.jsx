import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';

export function calcScore(c) {
  let s = 0;
  if (c.email)    s += 30;
  if (c.contact)  s += 25;
  if (c.phone)    s += 20;
  if (c.linkedin) s += 15;
  if (c.role)     s += 7;
  if (c.company)  s += 2;
  if (c.country)  s += 1;
  return s;
}

export function scoreToStars(score) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  if (score >= 1)  return 1;
  return 0;
}

export function StarRating({ contact, size = 13, showScore = false }) {
  const score = calcScore(contact);
  const stars = scoreToStars(score);
  const missing = [];
  if (!contact.email)    missing.push('Email (-30)');
  if (!contact.contact)  missing.push('Name (-25)');
  if (!contact.phone)    missing.push('Phone (-20)');
  if (!contact.linkedin) missing.push('LinkedIn (-15)');
  if (!contact.role)     missing.push('Role (-7)');
  const tooltip = `Score: ${score}/100\n${missing.length ? 'Missing: ' + missing.join(', ') : 'All key fields present'}`;
  return (
    <div title={tooltip} style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'default' }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: size, color: i <= stars ? '#F59E0B' : '#E2E8F0', lineHeight: 1 }}>★</span>)}
      {showScore && <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'DM Mono', monospace", marginLeft: 3 }}>{score}</span>}
    </div>
  );
}

function ScoreBreakdown({ form }) {
  const fields = [
    { key: 'email', label: 'Email', pts: 30 }, { key: 'contact', label: 'Name', pts: 25 },
    { key: 'phone', label: 'Phone', pts: 20 }, { key: 'linkedin', label: 'LinkedIn', pts: 15 },
    { key: 'role', label: 'Role', pts: 7 }, { key: 'company', label: 'Company', pts: 2 },
    { key: 'country', label: 'Country', pts: 1 },
  ];
  const score = calcScore(form);
  const stars = scoreToStars(score);
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em' }}>Data Quality</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 15, color: i <= stars ? '#F59E0B' : '#E2E8F0' }}>★</span>)}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', fontFamily: "'DM Mono', monospace", marginLeft: 3 }}>{score}/100</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {fields.map(f => (
          <div key={f.key} style={{ padding: '2px 7px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: form[f.key] ? '#ECFDF5' : '#FEF2F2', color: form[f.key] ? '#065F46' : '#991B1B', border: `1px solid ${form[f.key] ? '#86EFAC' : '#FCA5A5'}` }}>
            {form[f.key] ? '✓' : '✗'} {f.label} +{f.pts}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityLog({ leadId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!leadId) return;
    supabase.from('activities').select('*').eq('lead_id', leadId).order('logged_at', { ascending: false }).limit(20)
      .then(({ data }) => { setActivities(data || []); setLoading(false); });
  }, [leadId]);
  const typeColors = { email: '#3B82F6', call: '#10B981', li_conn: '#0A66C2', li_msg: '#0A66C2', whatsapp: '#25D366', meeting: '#8B5CF6', note: '#64748B', enriched: '#F59E0B' };
  if (loading) return <div style={{ fontSize: 11, color: '#94A3B8', padding: '8px 0' }}>Loading...</div>;
  if (!activities.length) return <div style={{ fontSize: 11, color: '#94A3B8', padding: '8px 0' }}>No activity yet</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {activities.map(a => (
        <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: typeColors[a.type] || '#94A3B8', marginTop: 4, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{a.type.replace('_', ' ')}</div>
            {a.note && <div style={{ fontSize: 10, color: '#64748B' }}>{a.note}</div>}
            {a.outcome && <div style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>{a.outcome}</div>}
          </div>
          <div style={{ fontSize: 9, color: '#94A3B8', flexShrink: 0 }}>{new Date(a.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
        </div>
      ))}
    </div>
  );
}

function LogActivity({ leadId, onLogged }) {
  const [type, setType] = useState('email');
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false);
  const types = ['email','call','li_conn','li_msg','whatsapp','meeting','note'];
  async function log() {
    if (!leadId) return;
    setSaving(true);
    await supabase.from('activities').insert({ lead_id: leadId, type, note: note || null, outcome: outcome || null, logged_at: new Date().toISOString() });
    setNote(''); setOutcome(''); onLogged();
    setSaving(false);
  }
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Log Activity</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {types.map(t => <button key={t} onClick={() => setType(t)} style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', background: type === t ? '#1A56DB' : '#E4E8F0', color: type === t ? '#fff' : '#475569' }}>{t.replace('_', ' ')}</button>)}
      </div>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', marginBottom: 6, boxSizing: 'border-box' }} />
      <input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Outcome (e.g. replied, no answer)" style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }} />
      <button onClick={log} disabled={saving} style={{ padding: '5px 14px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Logging...' : 'Log'}</button>
    </div>
  );
}

export default function ContactDrawer({ leadId, onClose, onSaved }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [actKey, setActKey] = useState(0);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (data) { setContact(data); setForm(data); }
    setLoading(false);
  }, [leadId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function save() {
    if (!contact) return;
    setSaving(true);
    const score = calcScore(form);
    const tier = score >= 72 ? 'complete' : score >= 45 ? 'partial' : score >= 22 ? 'minimal' : 'empty';
    await supabase.from('leads').update({ ...form, tier, last_synced: new Date().toISOString() }).eq('id', contact.id);
    await supabase.from('activities').insert({ lead_id: contact.id, type: 'enriched', note: 'Contact enriched via drawer', logged_at: new Date().toISOString() });
    await load();
    setEditing(false);
    if (onSaved) onSaved();
    setSaving(false);
  }

  function openEmail() {
    if (!contact?.email) return;
    const subject = encodeURIComponent(`Eminds.ai — ${contact.company}`);
    const body = encodeURIComponent(`Hi ${contact.contact || 'there'},\n\n`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}&su=${subject}&body=${body}`, '_blank');
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fieldGroups = [
    { label: 'Contact Info', fields: [{ key: 'contact', label: 'Contact Name', type: 'text' }, { key: 'role', label: 'Role / Title', type: 'text' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone', type: 'text' }, { key: 'linkedin', label: 'LinkedIn URL', type: 'text' }] },
    { label: 'Company Info', fields: [{ key: 'company', label: 'Company', type: 'text' }, { key: 'website', label: 'Website', type: 'text' }, { key: 'industry', label: 'Industry', type: 'text' }, { key: 'company_size', label: 'Company Size', type: 'text' }, { key: 'country', label: 'Country', type: 'text' }, { key: 'city', label: 'City', type: 'text' }, { key: 'source', label: 'Source', type: 'text' }] },
    { label: 'Notes', fields: [{ key: 'notes', label: 'Notes', type: 'textarea' }] },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1100 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', zIndex: 1101, display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif", animation: 'slideIn 0.22s ease-out' }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E4E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading ? <div style={{ fontSize: 14, color: '#94A3B8' }}>Loading...</div> : (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact?.company || '—'}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{contact?.contact || 'No contact'}{contact?.role ? ` · ${contact.role}` : ''}</div>
                  {contact && <div style={{ marginTop: 6 }}><StarRating contact={contact} size={14} showScore={true} /></div>}
                </>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748B', lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
          {!loading && contact && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button onClick={openEmail} disabled={!contact.email} style={{ flex: 1, padding: '6px 0', background: contact.email ? '#1A56DB' : '#F1F5F9', color: contact.email ? '#fff' : '#94A3B8', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: contact.email ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                ✉ Email{!contact.email ? ' (no email)' : ''}
              </button>
              {contact.linkedin && <button onClick={() => window.open(contact.linkedin, '_blank')} style={{ padding: '6px 12px', background: '#EFF6FF', color: '#0A66C2', border: '1px solid #BFDBFE', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>in</button>}
              {contact.phone && <button onClick={() => window.open(`tel:${contact.phone}`)} style={{ padding: '6px 12px', background: '#F0FDF4', color: '#065F46', border: '1px solid #86EFAC', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📞</button>}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E4E8F0', flexShrink: 0 }}>
          {['details', 'activity'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#1A56DB' : 'transparent'}`, fontSize: 11, fontWeight: tab === t ? 700 : 500, color: tab === t ? '#1A56DB' : '#64748B', cursor: 'pointer', textTransform: 'capitalize', transition: 'all .15s' }}>{t}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading contact...</div>
          : !contact ? <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Contact not found</div>
          : tab === 'details' ? (
            <div>
              <ScoreBreakdown form={editing ? form : contact} />
              {editing ? (
                <div>
                  {fieldGroups.map(group => (
                    <div key={group.label} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{group.label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.fields.map(f => (
                          <div key={f.key}>
                            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 3 }}>{f.label}</div>
                            {f.type === 'textarea'
                              ? <textarea value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} rows={3} style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 6, padding: '6px 8px', fontSize: 11, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                              : <input type={f.type} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 6, padding: '6px 8px', fontSize: 11, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button onClick={save} disabled={saving} style={{ flex: 1, padding: '8px 0', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save changes'}</button>
                    <button onClick={() => { setEditing(false); setForm(contact); }} style={{ padding: '8px 14px', background: 'transparent', color: '#64748B', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  {fieldGroups.map(group => (
                    <div key={group.label} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{group.label}</div>
                      <div style={{ background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 8, overflow: 'hidden' }}>
                        {group.fields.map((f, i) => (
                          <div key={f.key} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: i < group.fields.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 80, flexShrink: 0, paddingTop: 1 }}>{f.label}</span>
                            <span style={{ fontSize: 11, color: contact[f.key] ? '#0F172A' : '#CBD5E1', fontWeight: contact[f.key] ? 500 : 400, wordBreak: 'break-word' }}>{contact[f.key] || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setEditing(true); setForm({ ...contact }); }} style={{ width: '100%', padding: '8px 0', background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>✏ Enrich / Edit</button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 14 }}><LogActivity leadId={contact.id} onLogged={() => setActKey(k => k + 1)} /></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>History</div>
              <ActivityLog key={actKey} leadId={contact.id} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
