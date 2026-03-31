import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { Toast } from '../components/UI.jsx';
import ContactDrawer, { StarRating, calcScore, scoreToStars } from '../components/ContactDrawer.jsx';

export default function EnrichmentPage() {
  const [contacts,     setContacts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [country,      setCountry]      = useState('');
  const [countries,    setCountries]    = useState([]);
  const [toast,        setToast]        = useState(null);
  const [drawerLeadId, setDrawerLeadId] = useState(null);
  const [starFilter,   setStarFilter]   = useState('');

  // Accurate KPI counts from DB (not from filtered subset)
  const [kpis, setKpis] = useState({ total: 0, missingEmail: 0, missingPhone: 0, missingContact: 0 });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Load country list once
  useEffect(() => {
    supabase.from('leads').select('country').then(({ data }) => {
      if (data) setCountries([...new Set(data.map(r => r.country).filter(Boolean))].sort());
    });
  }, []);

  // Load accurate KPIs separately — always from full DB
  const loadKpis = useCallback(async () => {
    const [totalRes, emailRes, phoneRes, contactRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).in('tier', ['minimal','empty','partial']),
      supabase.from('leads').select('id', { count: 'exact', head: true }).or('email.is.null,email.eq.'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).or('phone.is.null,phone.eq.'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).or('contact.is.null,contact.eq.'),
    ]);
    setKpis({
      total:          totalRes.count   || 0,
      missingEmail:   emailRes.count   || 0,
      missingPhone:   phoneRes.count   || 0,
      missingContact: contactRes.count || 0,
    });
  }, []);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  // Load filtered contact list
  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('leads').select('*').order('company');
      if (filter === 'missing_email')   q = q.or('email.is.null,email.eq.');
      else if (filter === 'missing_phone')   q = q.or('phone.is.null,phone.eq.');
      else if (filter === 'missing_contact') q = q.or('contact.is.null,contact.eq.');
      else q = q.in('tier', ['minimal','empty','partial']);
      if (country) q = q.eq('country', country);
      q = q.limit(300);
      const { data, error } = await q;
      if (error) throw error;
      setContacts(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter, country]);

  useEffect(() => { load(); }, [load]);

  const visible = starFilter
    ? contacts.filter(c => scoreToStars(calcScore(c)) === Number(starFilter))
    : contacts;

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* KPIs — from accurate DB counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['Need enrichment', kpis.total,          '#F59E0B'],
          ['Missing email',   kpis.missingEmail,   '#E24B4A'],
          ['Missing phone',   kpis.missingPhone,   '#E24B4A'],
          ['Missing contact', kpis.missingContact, '#E24B4A'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 7, padding: 3, gap: 3, flexWrap: 'wrap' }}>
          {[['all','All incomplete'],['missing_email','No email'],['missing_phone','No phone'],['missing_contact','No contact']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === v ? '#0D1F3C' : 'transparent', color: filter === v ? '#fff' : '#475569' }}>{l}</button>
          ))}
        </div>
        <select value={country} onChange={e => setCountry(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value=''>All countries</option>
          {countries.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>Quality:</span>
          {[1,2,3].map(s => (
            <button key={s} onClick={() => setStarFilter(starFilter === String(s) ? '' : String(s))}
              style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, border: `1px solid ${starFilter === String(s) ? '#F59E0B' : '#E4E8F0'}`, background: starFilter === String(s) ? '#FFFBEB' : '#fff', cursor: 'pointer' }}>
              {[...Array(s)].map((_,i) => <span key={i} style={{ color: '#F59E0B' }}>★</span>)}
              {[...Array(3-s)].map((_,i) => <span key={i} style={{ color: '#E2E8F0' }}>★</span>)}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#64748B', marginLeft: 'auto' }}>{visible.length} shown</span>
      </div>

      <div style={{ fontSize: 11, color: '#64748B', background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 7, padding: '7px 12px', marginBottom: 14 }}>
        💡 Click any card to open the enrichment drawer — edit fields, set relevancy, log activity, and draft emails in Outlook.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>All clear for this filter</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {visible.map(c => {
            const missing = [];
            if (!c.email)    missing.push('Email');
            if (!c.contact)  missing.push('Name');
            if (!c.phone)    missing.push('Phone');
            if (!c.linkedin) missing.push('LinkedIn');
            if (!c.role)     missing.push('Role');
            const relevancyColors = { high: '#065F46', medium: '#92600A', low: '#991B1B' };

            return (
              <div key={c.id} onClick={() => setDrawerLeadId(c.id)}
                style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A56DB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E8F0'; e.currentTarget.style.boxShadow = 'none'; }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1F3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{c.country || '—'}{c.source ? ' · '+c.source : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <StarRating contact={c} showScore />
                    {c.relevancy && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, fontWeight: 700, color: relevancyColors[c.relevancy] || '#64748B', background: '#F8FAFC', border: '1px solid #E4E8F0' }}>
                        {c.relevancy} fit
                      </span>
                    )}
                  </div>
                </div>

                {missing.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {missing.map(f => (
                      <span key={f} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: 600 }}>✗ {f}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                  {[['Contact', c.contact], ['Email', c.email], ['Phone', c.phone]].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#94A3B8', minWidth: 50, flexShrink: 0 }}>{l}</span>
                      {v ? <span style={{ color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{v}</span>
                         : <span style={{ color: '#E24B4A', fontWeight: 600 }}>Missing</span>}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#1A56DB', fontWeight: 600 }}>Click to enrich →</div>
              </div>
            );
          })}
        </div>
      )}

      {drawerLeadId && (
        <ContactDrawer
          leadId={drawerLeadId}
          onClose={() => setDrawerLeadId(null)}
          onSaved={() => { load(); loadKpis(); showToast('Contact enriched'); }}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
