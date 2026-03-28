import React, { useState, useEffect } from 'react';
import { fetchUnassignedLeads, assignLeads } from '../data/api.js';
import { REPS } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';
import { RepAvatar, QuotaBar, SectionLabel, Btn, Toast } from '../components/UI.jsx';
import { StarRating } from '../components/ContactDrawer.jsx';
import ContactDrawer from '../components/ContactDrawer.jsx';

export default function AssignmentDesk() {
  const { quotas, assignedCounts, showToast, toast, refresh } = useSales();
  const [leads,         setLeads]         = useState([]);
  const [selected,      setSelected]      = useState(new Set());
  const [rep,           setRep]           = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(true);
  const [filters,       setFilters]       = useState({ country: '', tier: '' });
  const [drawerContact, setDrawerContact] = useState(null);

  useEffect(() => { loadLeads(); }, [filters]);

  async function loadLeads() {
    setFetching(true);
    try { const data = await fetchUnassignedLeads(filters); setLeads(data); }
    catch (e) { console.error(e); }
    finally { setFetching(false); }
  }

  function toggleRow(id) { setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; }); }
  function selectAll() { setSelected(new Set(leads.map(l => l.id))); }
  function clearAll()  { setSelected(new Set()); setRep(null); }

  async function doAssign() {
    if (!rep || selected.size === 0) return;
    setLoading(true);
    try {
      await assignLeads({ leadIds: [...selected], repId: rep, assignedBy: 'JM' });
      showToast(`${selected.size} leads assigned to ${REPS.find(r => r.id === rep)?.name}`);
      setSelected(new Set()); setRep(null);
      await Promise.all([loadLeads(), refresh()]);
    } catch (e) { showToast('Assignment failed: ' + e.message, 'error'); }
    finally { setLoading(false); }
  }

  const newQuota  = rep ? (assignedCounts[rep] || 0) + selected.size : 0;
  const maxQuota  = rep ? (quotas[rep] || 50) : 50;
  const overQuota = newQuota > maxQuota;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Search company, country..." style={{ flex: 1, minWidth: 160, border: '1px solid #D0D7E5', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'inherit' }} />
          <select value={filters.country} onChange={e => setFilters(f => ({ ...f, country: e.target.value }))} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
            <option value="">All countries</option>
            {['India','UAE','Saudi Arabia','USA','UK','Singapore','Malaysia'].map(c => <option key={c}>{c}</option>)}
          </select>
          <button onClick={selectAll} style={{ padding: '5px 11px', background: 'transparent', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>Select all</button>
          <button onClick={clearAll}  style={{ padding: '5px 11px', background: 'transparent', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>Clear</button>
          <span style={{ fontSize: 12, color: '#64748B', marginLeft: 'auto' }}>{selected.size} selected · {leads.length} unassigned</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 36, padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E4E8F0', textAlign: 'left' }}>
                  <input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearAll()} checked={selected.size === leads.length && leads.length > 0} />
                </th>
                {['Company','Contact','Country','Quality','Source','Imported'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E4E8F0', textAlign: 'left', fontSize: 10, letterSpacing: '.07em', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No unassigned leads</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} style={{ cursor: 'pointer', background: selected.has(lead.id) ? '#EFF6FF' : 'transparent' }}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }} onClick={() => toggleRow(lead.id)}>
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleRow(lead.id)} onClick={e => e.stopPropagation()} />
                  </td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, borderBottom: '1px solid #F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => setDrawerContact(lead.id)}>{lead.company}</td>
                  <td style={{ padding: '9px 12px', color: '#64748B', borderBottom: '1px solid #F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => setDrawerContact(lead.id)}>{lead.contact || '—'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }} onClick={() => setDrawerContact(lead.id)}>{lead.country || '—'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }} onClick={() => setDrawerContact(lead.id)}><StarRating contact={lead} size={11} showScore={true} /></td>
                  <td style={{ padding: '9px 12px', color: '#64748B', borderBottom: '1px solid #F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => setDrawerContact(lead.id)}>{lead.source || '—'}</td>
                  <td style={{ padding: '9px 12px', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }} onClick={() => setDrawerContact(lead.id)}>{lead.imported_at ? new Date(lead.imported_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fff', borderLeft: '1px solid #E4E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E4E8F0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Assign to rep</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{selected.size > 0 ? `${selected.size} leads selected` : 'Select leads first'}</div>
        </div>

        <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {selected.size === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, color: '#94A3B8', textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 28 }}>←</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>No leads selected</div>
              <div style={{ fontSize: 11 }}>Click rows to select leads</div>
            </div>
          ) : (
            <>
              <div>
                <SectionLabel>Selected ({selected.size})</SectionLabel>
                <div style={{ background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 8, padding: '10px 12px', maxHeight: 160, overflowY: 'auto' }}>
                  {leads.filter(l => selected.has(l.id)).map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #F1F5F9', fontSize: 11 }}>
                      <span style={{ fontWeight: 600 }}>{l.company}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: '#94A3B8' }}>{l.country}</span>
                        <button onClick={() => toggleRow(l.id)} style={{ width: 16, height: 16, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', fontSize: 9, color: '#A32D2D' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>Assign to</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {REPS.map(r => (
                    <div key={r.id} onClick={() => setRep(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${rep === r.id ? '#1A56DB' : '#E4E8F0'}`, borderRadius: 9, cursor: 'pointer', background: rep === r.id ? '#EFF6FF' : '#fff', transition: 'all .15s' }}>
                      <RepAvatar repId={r.id} size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: '#64748B' }}>{r.focus}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#F1F5F9', color: '#475569' }}>{assignedCounts[r.id] || 0}/{quotas[r.id] || r.quota}</span>
                    </div>
                  ))}
                </div>
              </div>

              {rep && (
                <div style={{ background: overQuota ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${overQuota ? '#FCA5A5' : '#86EFAC'}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: overQuota ? '#991B1B' : '#065F46', marginBottom: 6 }}>{overQuota ? 'Over quota' : 'Summary'}</div>
                  {[['Leads', selected.size], ['Assigning to', REPS.find(r => r.id === rep)?.name], ['New total', `${newQuota} / ${maxQuota}`]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                      <span style={{ color: '#64748B' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={doAssign} disabled={!rep || loading}
                style={{ padding: 11, background: rep ? '#1A56DB' : '#F1F5F9', color: rep ? '#fff' : '#94A3B8', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: rep ? 'pointer' : 'not-allowed', width: '100%' }}>
                {loading ? 'Assigning...' : rep ? `Assign ${selected.size} → ${REPS.find(r => r.id === rep)?.name}` : 'Select a rep above'}
              </button>
            </>
          )}
        </div>
      </div>

      {drawerContact && <ContactDrawer leadId={drawerContact} onClose={() => setDrawerContact(null)} onSaved={() => loadLeads()} />}
      <Toast toast={toast} />
    </div>
  );
}
