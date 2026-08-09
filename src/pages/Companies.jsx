import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { Toast } from '../components/UI.jsx';

const m = {
  pageBg: '#F2F7FD', headerBg: '#EBF4FD', border: '#B5D4F4',
  accent: '#2563EB', textDark: '#0C447C', textMid: '#185FA5',
  kpiBg: '#EBF4FD', kpiBorder: '#B5D4F4',
  badgeBg: '#DBEAFE', badgeText: '#1E40AF',
};

const BADGE_COLORS = [
  { bg: '#EFF6FF', color: '#1D4ED8' },
  { bg: '#F5F3FF', color: '#5B21B6' },
  { bg: '#ECFDF5', color: '#065F46' },
  { bg: '#FFFBEB', color: '#92600A' },
];

function Badge({ text, i = 0 }) {
  const c = BADGE_COLORS[i % BADGE_COLORS.length];
  return <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color, display: 'inline-block', margin: '1px' }}>{text}</span>;
}

function MaturityDot({ level }) {
  const map = { High: '#059669', Medium: '#F59E0B', Low: '#DC2626' };
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: map[level] || '#94A3B8', flexShrink: 0 }} title={level} />;
}

function CompanyDrawer({ company, onClose, onSaved }) {
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const e = company.ai_enrichment || {};

  useEffect(() => {
    supabase.from('leads')
      .select('id, contact, role, email, phone, linkedin, tier')
      .eq('company_id', company.id)
      .not('contact', 'is', null)
      .neq('contact', '')
      .order('contact')
      .then(({ data }) => { setContacts(data || []); setLoading(false); });
  }, [company.id]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 400 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 500, background: '#fff', zIndex: 401, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,.12)' }}>
        {/* Header */}
        <div style={{ background: m.headerBg, padding: '18px 20px', borderBottom: `1px solid ${m.border}`, position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: m.textDark, marginBottom: 4 }}>{company.name}</div>
              {company.website && (
                <a href={`https://${company.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: m.accent }}>{company.website}</a>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B', padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {company.industry && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: m.badgeBg, color: m.badgeText }}>{company.industry}</span>}
            {company.country  && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, background: '#F1F5F9', color: '#475569' }}>📍 {company.country}</span>}
            {company.size     && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, background: '#F1F5F9', color: '#475569' }}>👥 {company.size}</span>}
            {e.digital_maturity && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: e.digital_maturity === 'High' ? '#ECFDF5' : e.digital_maturity === 'Medium' ? '#FFFBEB' : '#FEF2F2', color: e.digital_maturity === 'High' ? '#065F46' : e.digital_maturity === 'Medium' ? '#92600A' : '#991B1B' }}>{e.digital_maturity} maturity</span>}
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* AI enrichment */}
          {e.overview && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Company overview</div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, background: m.kpiBg, border: `1px solid ${m.kpiBorder}`, borderRadius: 8, padding: '10px 12px' }}>{e.overview}</div>
            </div>
          )}

          {e.tech_stack?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Technology stack</div>
              <div>{e.tech_stack.map((t,i) => <Badge key={i} text={t} i={i} />)}</div>
            </div>
          )}

          {e.summary && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Sales notes</div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{e.summary}</div>
            </div>
          )}

          {!e.overview && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92600A' }}>
              ✦ Not yet AI enriched — go to AI Enrichment to research this company
            </div>
          )}

          {/* Contacts */}
          <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
            Contacts ({contacts.length})
          </div>
          {loading ? (
            <div style={{ color: '#94A3B8', fontSize: 12 }}>Loading...</div>
          ) : contacts.length === 0 ? (
            <div style={{ color: '#94A3B8', fontSize: 12 }}>No contacts with names linked to this company</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {contacts.map(c => (
                <div key={c.id} style={{ background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1 }}>{c.contact}</div>
                    {c.tier && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: c.tier === 'complete' ? '#ECFDF5' : '#F1F5F9', color: c.tier === 'complete' ? '#065F46' : '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>{c.tier}</span>}
                  </div>
                  {c.role && <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{c.role}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {c.email    && <a href={`mailto:${c.email}`}    style={{ fontSize: 10, color: m.accent }}>✉ {c.email}</a>}
                    {c.phone    && <span style={{ fontSize: 10, color: '#64748B' }}>📞 {c.phone}</span>}
                    {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#0A66C2' }}>in LinkedIn</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const PAGE_SIZE = 50;

export default function CompaniesPage() {
  const [companies,   setCompanies]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(0);
  const [search,      setSearch]      = useState('');
  const [industry,    setIndustry]    = useState('');
  const [enriched,    setEnriched]    = useState('');
  const [industries,  setIndustries]  = useState([]);
  const [drawer,      setDrawer]      = useState(null);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    supabase.from('companies').select('industry').not('industry','is',null).neq('industry','')
      .then(({ data }) => {
        const unique = [...new Set((data||[]).map(r => r.industry))].sort();
        setIndustries(unique);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('companies')
        .select('id, name, website, country, industry, size, ai_enrichment, ai_enriched_at', { count: 'exact' })
        .order('name')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search)   q = q.ilike('name', `%${search}%`);
      if (industry) q = q.eq('industry', industry);
      if (enriched === 'yes') q = q.not('ai_enriched_at', 'is', null);
      if (enriched === 'no')  q = q.is('ai_enriched_at', null);

      const { data, count, error } = await q;
      if (error) throw error;
      setCompanies(data || []);
      setTotal(count || 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, industry, enriched]);

  useEffect(() => { setPage(0); }, [search, industry, enriched]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ background: m.pageBg, minHeight: '100vh' }}>
      <div style={{ background: m.headerBg, borderBottom: `1px solid ${m.border}`, padding: '14px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: m.badgeBg, color: m.badgeText }}>📥 Input</span>
          <span style={{ color: m.border }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: m.textDark }}>Companies</span>
        </div>
        <div style={{ fontSize: 11, color: m.textMid }}>Account-level view · one row per company · linked to all contacts</div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['Total companies', total,                                      m.textDark],
            ['Showing',         companies.length,                           m.accent],
            ['This page',       `${page * PAGE_SIZE + 1}–${Math.min((page+1)*PAGE_SIZE, total)}`, '#475569'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background: m.kpiBg, border: `1px solid ${m.kpiBorder}`, borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: 10, color: m.textMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company name..."
            style={{ flex: 1, minWidth: 200, border: `1px solid ${m.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, background: '#fff', fontFamily: 'inherit' }} />
          <select value={industry} onChange={e => setIndustry(e.target.value)}
            style={{ border: `1px solid ${m.border}`, borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff', fontFamily: 'inherit' }}>
            <option value="">All industries</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={enriched} onChange={e => setEnriched(e.target.value)}
            style={{ border: `1px solid ${m.border}`, borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff', fontFamily: 'inherit' }}>
            <option value="">All</option>
            <option value="yes">✦ AI Enriched</option>
            <option value="no">Not enriched</option>
          </select>
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{total.toLocaleString()} companies</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: `1px solid ${m.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Company','Website','Industry','Country','Size','AI',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', background: m.kpiBg, borderBottom: `1px solid ${m.border}`, textAlign: 'left', fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', color: m.textMid, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading...</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No companies found</td></tr>
              ) : companies.map((co, i) => {
                const e = co.ai_enrichment || {};
                return (
                  <tr key={co.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFF', cursor: 'pointer' }}
                    onClick={() => setDrawer(co)}
                    onMouseEnter={e2 => { e2.currentTarget.style.background = m.kpiBg; }}
                    onMouseLeave={e2 => { e2.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFF'; }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: m.textDark, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.name}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={`https://${(co.website||'').replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" style={{ color: m.accent, fontSize: 11 }} onClick={ev => ev.stopPropagation()}>{co.website}</a>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{e.industry || co.industry || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{co.country || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{e.size || co.size || '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                      {co.ai_enriched_at
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MaturityDot level={e.digital_maturity} />
                            <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>✦ Enriched</span>
                          </div>
                        : <span style={{ fontSize: 10, color: '#94A3B8' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: 10, color: m.accent, fontWeight: 600 }}>View →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Page {page+1} of {totalPages||1} · {total.toLocaleString()} companies</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(0)} disabled={page===0} style={{ padding: '5px 10px', border: `1px solid ${m.border}`, borderRadius: 6, fontSize: 11, cursor: page===0?'not-allowed':'pointer', opacity: page===0?.4:1, background: m.kpiBg, color: m.textMid }}>«</button>
            <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} style={{ padding: '5px 12px', border: `1px solid ${m.border}`, borderRadius: 6, fontSize: 11, cursor: page===0?'not-allowed':'pointer', opacity: page===0?.4:1, background: m.kpiBg, color: m.textMid }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} style={{ padding: '5px 12px', border: `1px solid ${m.border}`, borderRadius: 6, fontSize: 11, cursor: page>=totalPages-1?'not-allowed':'pointer', opacity: page>=totalPages-1?.4:1, background: m.kpiBg, color: m.textMid }}>Next →</button>
            <button onClick={() => setPage(totalPages-1)} disabled={page>=totalPages-1} style={{ padding: '5px 10px', border: `1px solid ${m.border}`, borderRadius: 6, fontSize: 11, cursor: page>=totalPages-1?'not-allowed':'pointer', opacity: page>=totalPages-1?.4:1, background: m.kpiBg, color: m.textMid }}>»</button>
          </div>
        </div>
      </div>

      {drawer && <CompanyDrawer company={drawer} onClose={() => setDrawer(null)} onSaved={load} />}
      <Toast toast={toast} />
    </div>
  );
}
