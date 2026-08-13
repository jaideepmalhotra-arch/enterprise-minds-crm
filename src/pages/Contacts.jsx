import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { Btn, Modal, Toast } from '../components/UI.jsx';
import ContactDrawer, { StarRating, calcScore, scoreToStars } from '../components/ContactDrawer.jsx';
import { useNavigate } from 'react-router-dom';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const IMPORTANCE_CONFIG = {
  hot:          { label: '🔴 Hot',          bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
  warm:         { label: '🟡 Warm',         bg: '#FFFBEB', color: '#92600A', border: '#FCD34D' },
  cold:         { label: '🔵 Cold',         bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  not_relevant: { label: '⬜ Not relevant', bg: '#F1F5F9', color: '#475569', border: '#E4E8F0' },
  not_set:      { label: '⚪ Not set',      bg: '#F8FAFC', color: '#94A3B8', border: '#F1F5F9' },
};

function ImportanceBadge({ value }) {
  if (!value) return <span style={{ fontSize: 10, color: '#94A3B8' }}>—</span>;
  const c = IMPORTANCE_CONFIG[value] || IMPORTANCE_CONFIG.not_set;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

// ── Country searchable select ─────────────────────────────────────────────────
function CountrySelect({ value, onChange, style }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","UAE","Uganda","Ukraine","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];
  const filtered = search ? COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase())) : COUNTRIES;
  return (
    <div style={{ position: 'relative', ...style }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ padding: '6px 10px', border: '1px solid #C4B5FD', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: value ? '#F0EEFE' : '#F4F2FE', color: value ? '#3C3489' : '#64748B', fontFamily: 'inherit', minWidth: 130 }}>
        {value || 'All countries'} ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 500, background: '#fff', border: '1px solid #E4E8F0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: 200, maxHeight: 280, display: 'flex', flexDirection: 'column' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country..." style={{ padding: '8px 10px', border: 'none', borderBottom: '1px solid #F1F5F9', fontSize: 11, outline: 'none' }} />
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div onClick={() => { onChange(''); setOpen(false); setSearch(''); }} style={{ padding: '8px 12px', fontSize: 11, cursor: 'pointer', color: '#94A3B8' }}>All countries</div>
            {filtered.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                style={{ padding: '8px 12px', fontSize: 11, cursor: 'pointer', background: value === c ? '#F0EEFE' : 'transparent', color: value === c ? '#3C3489' : '#0F172A' }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recycle bin ───────────────────────────────────────────────────────────────
function RecycleBin({ onClose, onRestore }) {
  const [deleted, setDeleted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('leads_deleted').select('*').order('deleted_at', { ascending: false })
      .then(({ data }) => { setDeleted(data || []); setLoading(false); });
  }, []);

  async function restore(row) {
    const { original_id, id, deleted_at, expires_at, ...lead } = row;
    await supabase.from('leads').insert({ ...lead, imported_at: new Date().toISOString(), last_synced: new Date().toISOString() });
    await supabase.from('leads_deleted').delete().eq('id', id);
    setDeleted(d => d.filter(r => r.id !== id));
    onRestore();
  }

  async function permanentDelete(id) {
    if (!window.confirm('Permanently delete? Cannot be undone.')) return;
    await supabase.from('leads_deleted').delete().eq('id', id);
    setDeleted(d => d.filter(r => r.id !== id));
  }

  const daysLeft = exp => Math.max(0, Math.ceil((new Date(exp) - new Date()) / 86400000));

  return (
    <Modal title={`Recycle bin (${deleted.length})`} onClose={onClose} width={700}>
      {loading ? <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>Loading…</div> : deleted.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Recycle bin is empty</div>
      ) : (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {deleted.map(row => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{row.company}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{row.contact} {row.email && `· ${row.email}`}</div>
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>{daysLeft(row.expires_at)}d left</div>
              <button onClick={() => restore(row)} style={{ padding: '3px 10px', background: '#ECFDF5', color: '#065F46', border: '1px solid #86EFAC', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Restore</button>
              <button onClick={() => permanentDelete(row.id)} style={{ padding: '3px 10px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Star filter ───────────────────────────────────────────────────────────────
function applyStarFilter(q, star) {
  switch (star) {
    case '5': return q.not('email','is',null).neq('email','').not('contact','is',null).neq('contact','').not('phone','is',null).neq('phone','').not('linkedin','is',null).neq('linkedin','');
    case '4': return q.not('email','is',null).neq('email','').not('contact','is',null).neq('contact','').not('phone','is',null).neq('phone','');
    case '3': return q.not('email','is',null).neq('email','').not('contact','is',null).neq('contact','');
    case '2': return q.not('email','is',null).neq('email','');
    case '1': return q.or('email.is.null,email.eq.');
    default:  return q;
  }
}

const STAR_RANGES = { '5':'80–100','4':'60–79','3':'40–59','2':'20–39','1':'1–19' };

// ── Main page ─────────────────────────────────────────────────────────────────
const pm = {
  pageBg: '#F4F2FE', border: '#C4B5FD', accent: '#7C3AED',
  textDark: '#3C3489', textMid: '#534AB7',
  kpiBg: '#F0EEFE', kpiBorder: '#C4B5FD',
};

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts,     setContacts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(0);
  const [search,       setSearch]       = useState('');
  const [country,      setCountry]      = useState('');
  const [starFilter,   setStarFilter]   = useState('');
  const [impFilter,    setImpFilter]    = useState('');
  const [sortField,    setSortField]    = useState('company');
  const [sortAsc,      setSortAsc]      = useState(true);
  const [showBin,      setShowBin]      = useState(false);
  const [selected,     setSelected]     = useState(new Set());
  const [toast,        setToast]        = useState(null);
  const [binCount,     setBinCount]     = useState(0);
  const [drawerLeadId, setDrawerLeadId] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    supabase.from('leads_deleted').select('id', { count: 'exact', head: true }).then(({ count }) => setBinCount(count || 0));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('leads')
        .select('id, company, contact, role, email, phone, country, linkedin, source, importance, tier, company_id', { count: 'exact' })
        .order(sortField, { ascending: sortAsc, nullsLast: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search)     q = q.or(`company.ilike.%${search}%,contact.ilike.%${search}%,email.ilike.%${search}%`);
      if (country)    q = q.eq('country', country);
      if (starFilter) q = applyStarFilter(q, starFilter);
      if (impFilter)  q = q.eq('importance', impFilter);

      const { data, count, error } = await q;
      if (error) throw error;
      setContacts(data || []);
      setTotal(count || 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, country, starFilter, impFilter, sortField, sortAsc]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, country, starFilter, impFilter, sortField, sortAsc]);

  function toggleSort(field) {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  }

  const SortIcon = ({ field }) => sortField !== field
    ? <span style={{ color: '#C4B5FD', marginLeft: 3 }}>⇅</span>
    : <span style={{ color: pm.textDark, marginLeft: 3 }}>{sortAsc ? '↑' : '↓'}</span>;

  async function softDelete(ids, single = false) {
    if (!window.confirm(single ? 'Move to recycle bin?' : `Move ${ids.length} contacts to recycle bin?`)) return;
    try {
      const { data } = await supabase.from('leads').select('*').in('id', ids);
      if (data?.length) {
        await supabase.from('leads_deleted').insert(data.map(r => ({
          original_id: r.id, company: r.company, contact: r.contact, role: r.role,
          email: r.email, phone: r.phone, country: r.country, city: r.city,
          linkedin: r.linkedin, website: r.website, industry: r.industry,
          source: r.source, tier: r.tier, importance: r.importance, notes: r.notes,
          deleted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        })));
      }
      await supabase.from('leads').delete().in('id', ids);
      showToast(single ? 'Moved to recycle bin' : `${ids.length} contacts moved to recycle bin`);
      setSelected(new Set());
      setBinCount(c => c + (data?.length || 0));
      load();
    } catch(e) { showToast('Delete failed', 'error'); }
  }

  const toggleSel = id => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const thStyle = (field) => ({
    padding: '8px 10px', background: pm.kpiBg, borderBottom: `1px solid ${pm.border}`,
    textAlign: 'left', fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase',
    color: sortField === field ? pm.textDark : pm.textMid, fontWeight: 600,
    whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
  });

  const activeFilters = [starFilter, impFilter, country].filter(Boolean).length;

  return (
    <div style={{ padding: '16px 20px', background: pm.pageBg, minHeight: '100vh' }}>

      {/* KPI + star filter strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: `1px solid ${pm.border}`, borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: 10, color: pm.textMid, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Total contacts</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: pm.textDark }}>{total.toLocaleString()}</div>
          {activeFilters > 0 && <div style={{ fontSize: 9, color: pm.accent, marginTop: 2, fontWeight: 600 }}>{activeFilters} filter{activeFilters > 1 ? 's' : ''} active</div>}
        </div>
        {[5,4,3,2,1].map(s => {
          const active = starFilter === String(s);
          return (
            <div key={s} onClick={() => setStarFilter(active ? '' : String(s))}
              style={{ background: active ? '#F0EEFE' : '#fff', border: `1px solid ${active ? pm.accent : pm.border}`, borderRadius: 9, padding: '10px 12px', minWidth: 72, cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
              <div style={{ fontSize: 12, marginBottom: 2, lineHeight: 1 }}>
                {[...Array(s)].map((_,i) => <span key={i} style={{ color: '#F59E0B' }}>★</span>)}
                {[...Array(5-s)].map((_,i) => <span key={i} style={{ color: '#E2E8F0' }}>★</span>)}
              </div>
              <div style={{ fontSize: 9, color: active ? pm.accent : '#94A3B8', marginTop: 3, fontWeight: active ? 600 : 400 }}>{STAR_RANGES[String(s)]}</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, contact, email..."
          style={{ flex: 1, minWidth: 180, border: `1px solid ${pm.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'inherit', background: '#fff' }} />
        <CountrySelect value={country} onChange={setCountry} />

        {/* Importance filter */}
        <select value={impFilter} onChange={e => setImpFilter(e.target.value)}
          style={{ border: `1px solid ${impFilter ? pm.accent : pm.border}`, borderRadius: 7, padding: '5px 9px', fontSize: 11, background: impFilter ? '#F0EEFE' : '#fff', color: impFilter ? pm.textDark : '#64748B', fontFamily: 'inherit' }}>
          <option value="">All importance</option>
          {Object.entries(IMPORTANCE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Active filter chips */}
        {starFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: 7, fontSize: 11, color: '#92600A', fontWeight: 600 }}>
            {'★'.repeat(Number(starFilter))} quality
            <button onClick={() => setStarFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#92600A', lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
          </div>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <button onClick={() => softDelete([...selected])}
            style={{ padding: '5px 12px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            🗑 Delete {selected.size}
          </button>
        )}

        <button onClick={() => setShowBin(true)}
          style={{ padding: '5px 11px', border: `1px solid ${pm.border}`, borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
          🗑 Bin {binCount > 0 && <span style={{ background: '#FEF2F2', color: '#991B1B', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{binCount}</span>}
        </button>

        <span style={{ fontSize: 12, color: '#64748B', marginLeft: 'auto' }}>{total.toLocaleString()} contacts</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: `1px solid ${pm.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={{ width: 36, padding: '8px 12px', background: pm.kpiBg, borderBottom: `1px solid ${pm.border}`, textAlign: 'left' }}>
                  <input type="checkbox"
                    onChange={e => { if (e.target.checked) setSelected(new Set(contacts.map(c => c.id))); else setSelected(new Set()); }}
                    checked={selected.size === contacts.length && contacts.length > 0} />
                </th>
                <th style={{ ...thStyle('company'), minWidth: 160 }} onClick={() => toggleSort('company')}>Company <SortIcon field="company" /></th>
                <th style={{ ...thStyle('contact'), minWidth: 130 }} onClick={() => toggleSort('contact')}>Contact <SortIcon field="contact" /></th>
                <th style={{ ...thStyle('role'), minWidth: 120 }} onClick={() => toggleSort('role')}>Role <SortIcon field="role" /></th>
                <th style={{ ...thStyle('email'), minWidth: 160 }} onClick={() => toggleSort('email')}>Email <SortIcon field="email" /></th>
                <th style={{ ...thStyle('country'), minWidth: 100 }} onClick={() => toggleSort('country')}>Country <SortIcon field="country" /></th>
                <th style={{ ...thStyle('importance'), minWidth: 110 }} onClick={() => toggleSort('importance')}>Importance <SortIcon field="importance" /></th>
                <th style={{ width: 110, padding: '8px 10px', background: pm.kpiBg, borderBottom: `1px solid ${pm.border}`, fontSize: 9, color: pm.textMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Quality ★</th>
                <th style={{ width: 90, padding: '8px 10px', background: pm.kpiBg, borderBottom: `1px solid ${pm.border}`, fontSize: 9, color: pm.textMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading contacts…</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No contacts found</td></tr>
              ) : contacts.map(c => (
                <tr key={c.id}
                  style={{ background: selected.has(c.id) ? '#F0EEFE' : 'transparent', cursor: 'pointer' }}
                  onClick={() => setDrawerLeadId(c.id)}
                  onMouseEnter={e => { if (!selected.has(c.id)) e.currentTarget.style.background = '#F9F8FF'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected.has(c.id) ? '#F0EEFE' : 'transparent'; }}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} />
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: pm.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {c.company_id && (
                        <span onClick={e => { e.stopPropagation(); navigate('/sales/companies'); }}
                          title="View company" style={{ fontSize: 10, color: pm.accent, cursor: 'pointer', flexShrink: 0 }}>🏢</span>
                      )}
                      {c.company}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{c.contact || '—'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{c.role || '—'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{c.email || '—'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{c.country || '—'}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                    <ImportanceBadge value={c.importance} />
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                    <StarRating contact={c} showScore />
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setDrawerLeadId(c.id)} style={{ padding: '2px 8px', border: `1px solid ${pm.border}`, borderRadius: 5, fontSize: 10, cursor: 'pointer', background: pm.kpiBg, color: pm.textMid, fontFamily: 'inherit' }}>Edit</button>
                      <button onClick={() => softDelete([c.id], true)} style={{ padding: '2px 8px', border: '1px solid #FCA5A5', borderRadius: 5, fontSize: 10, cursor: 'pointer', background: '#FEF2F2', color: '#991B1B', fontFamily: 'inherit' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${pm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#64748B' }}>
          <span>
            Page {page + 1} of {totalPages || 1} · {total.toLocaleString()} contacts
            {selected.size > 0 && <span style={{ color: pm.accent, fontWeight: 600 }}> · {selected.size} selected</span>}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(0)} disabled={page === 0}
              style={{ padding: '4px 8px', border: `1px solid ${pm.border}`, borderRadius: 6, fontSize: 11, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? .5 : 1, background: pm.kpiBg, color: pm.textMid }}>«</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '4px 10px', border: `1px solid ${pm.border}`, borderRadius: 6, fontSize: 11, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? .5 : 1, background: pm.kpiBg, color: pm.textMid }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: '4px 10px', border: `1px solid ${pm.border}`, borderRadius: 6, fontSize: 11, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? .5 : 1, background: pm.kpiBg, color: pm.textMid }}>Next →</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              style={{ padding: '4px 8px', border: `1px solid ${pm.border}`, borderRadius: 6, fontSize: 11, cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? .5 : 1, background: pm.kpiBg, color: pm.textMid }}>»</button>
          </div>
        </div>
      </div>

      {drawerLeadId && <ContactDrawer leadId={drawerLeadId} onClose={() => setDrawerLeadId(null)} onSaved={() => load()} />}
      {showBin && <RecycleBin onClose={() => setShowBin(false)} onRestore={() => { load(); showToast('Contact restored'); setBinCount(c => Math.max(0, c - 1)); }} />}
      <Toast toast={toast} />
    </div>
  );
}
