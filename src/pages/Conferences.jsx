import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { Btn, Toast, Modal } from '../components/UI.jsx';

const STATUS_CONFIG = {
  new:          { bg: '#EFF6FF', color: '#1D4ED8', label: 'New' },
  reviewed:     { bg: '#F5F3FF', color: '#5B21B6', label: 'Reviewed' },
  promoted:     { bg: '#ECFDF5', color: '#065F46', label: 'Promoted' },
  not_relevant: { bg: '#F1F5F9', color: '#475569', label: 'Not relevant' },
};

export default function ConferencesPage() {
  const [exhibitors,   setExhibitors]   = useState([]);
  const [exhibitions,  setExhibitions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [expoFilter,   setExpoFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter,setCountryFilter]= useState('all');
  const [countries,    setCountries]    = useState([]);
  const [selected,     setSelected]     = useState(new Set());
  const [promoting,    setPromoting]    = useState(false);
  const [toast,        setToast]        = useState(null);
  const [search,       setSearch]       = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('exhibitors').select('*').order('company');
      if (expoFilter !== 'all')    q = q.eq('exhibition', expoFilter);
      if (statusFilter !== 'all')  q = q.eq('status', statusFilter);
      if (countryFilter !== 'all') q = q.eq('country', countryFilter);
      if (search) q = q.ilike('company', `%${search}%`);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      setExhibitors(data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [expoFilter, statusFilter, countryFilter, search]);

  // Load exhibitions and countries
  useEffect(() => {
    supabase.from('exhibitors').select('exhibition, country').then(({ data }) => {
      if (data) {
        setExhibitions([...new Set(data.map(r => r.exhibition).filter(Boolean))].sort());
        setCountries([...new Set(data.map(r => r.country).filter(Boolean))].sort());
      }
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    await supabase.from('exhibitors').update({ status }).eq('id', id);
    load();
  }

  async function promoteToLead(exhibitor) {
    // Check if already a lead
    const { data: existing } = await supabase.from('leads')
      .select('id').eq('company', exhibitor.company).limit(1);
    if (existing && existing.length > 0) {
      showToast(`${exhibitor.company} already in leads`, 'warn');
      await supabase.from('exhibitors').update({ status: 'promoted' }).eq('id', exhibitor.id);
      load();
      return;
    }
    await supabase.from('leads').insert({
      company:     exhibitor.company,
      contact:     exhibitor.contact || null,
      email:       exhibitor.email || null,
      website:     exhibitor.website || null,
      country:     exhibitor.country || null,
      source:      exhibitor.exhibition,
      tier:        exhibitor.email ? 'partial' : 'minimal',
      imported_at: new Date().toISOString(),
      last_synced: new Date().toISOString(),
    });
    await supabase.from('exhibitors').update({ status: 'promoted' }).eq('id', exhibitor.id);
    showToast(`${exhibitor.company} promoted to leads ✓`);
    load();
  }

  async function bulkPromote() {
    if (selected.size === 0) return;
    setPromoting(true);
    const toPromote = exhibitors.filter(e => selected.has(e.id) && e.status !== 'promoted');
    let count = 0;
    for (const ex of toPromote) {
      const { data: existing } = await supabase.from('leads').select('id').eq('company', ex.company).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from('leads').insert({
          company: ex.company, contact: ex.contact || null, email: ex.email || null,
          website: ex.website || null, country: ex.country || null,
          source: ex.exhibition, tier: ex.email ? 'partial' : 'minimal',
          imported_at: new Date().toISOString(), last_synced: new Date().toISOString(),
        });
        count++;
      }
      await supabase.from('exhibitors').update({ status: 'promoted' }).eq('id', ex.id);
    }
    setSelected(new Set());
    setPromoting(false);
    showToast(`${count} new leads created from ${toPromote.length} exhibitors`);
    load();
  }

  function toggleSelect(id) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function selectAll() { setSelected(new Set(exhibitors.map(e => e.id))); }
  function clearAll()  { setSelected(new Set()); }

  const counts = { all: exhibitors.length };
  Object.keys(STATUS_CONFIG).forEach(s => { counts[s] = exhibitors.filter(e => e.status === s).length; });

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['Total', exhibitors.length, '#0F172A'], ['New', counts.new || 0, '#1D4ED8'], ['Reviewed', counts.reviewed || 0, '#5B21B6'], ['Promoted', counts.promoted || 0, '#065F46'], ['Not relevant', counts.not_relevant || 0, '#475569']].map(([l, v, c]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company..." style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 10px', fontSize: 11, minWidth: 160, background: '#fff' }} />
        <select value={expoFilter} onChange={e => setExpoFilter(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value="all">All exhibitions</option>
          {exhibitions.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value="all">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{exhibitors.length} exhibitors</span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ background: '#0F172A', borderRadius: 9, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{selected.size} selected</span>
          <button onClick={bulkPromote} disabled={promoting}
            style={{ padding: '5px 14px', background: '#10B981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: promoting ? 'not-allowed' : 'pointer', opacity: promoting ? 0.6 : 1 }}>
            {promoting ? 'Promoting...' : `Promote ${selected.size} to Leads`}
          </button>
          <button onClick={clearAll} style={{ padding: '5px 10px', background: 'transparent', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Clear</button>
          <button onClick={selectAll} style={{ padding: '5px 10px', background: 'transparent', color: 'rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Select all {exhibitors.length}</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E4E8F0', width: 32 }}>
                <input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearAll()} checked={selected.size === exhibitors.length && exhibitors.length > 0} />
              </th>
              {['Company', 'Contact', 'Exhibition', 'Country', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E4E8F0', textAlign: 'left', fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', color: '#64748B', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading...</td></tr>
            ) : exhibitors.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No exhibitors found</td></tr>
            ) : exhibitors.map(e => {
              const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.new;
              return (
                <tr key={e.id} style={{ background: selected.has(e.id) ? '#F0F7FF' : '#fff' }}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }}>
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} />
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#0F172A', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.company}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.contact || '—'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.exhibition}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{e.country || '—'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }}>
                    <select value={e.status} onChange={ev => updateStatus(e.id, ev.target.value)}
                      style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, border: 'none', cursor: 'pointer' }}>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }}>
                    {e.status !== 'promoted' && (
                      <button onClick={() => promoteToLead(e)}
                        style={{ padding: '3px 10px', background: '#ECFDF5', color: '#065F46', border: '1px solid #86EFAC', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        → Lead
                      </button>
                    )}
                    {e.status === 'promoted' && <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>✓ In leads</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
