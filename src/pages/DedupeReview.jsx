import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase.js';
import { StarRating } from '../components/ContactDrawer.jsx';

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: value ? '#0F172A' : '#CBD5E1' }}>{value || '—'}</div>
    </div>
  );
}

export default function DedupeReview() {
  const navigate = useNavigate();
  const [pairs,   setPairs]   = useState([]);
  const [index,   setIndex]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [deleted, setDeleted] = useState(0);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: allLeads, error: err } = await supabase.from('leads')
        .select('id,company,contact,role,email,phone,country,city,linkedin,website,industry,source,tier,date_added,imported_at')
        .order('imported_at', { ascending: true });
      if (err) throw err;

      const emailMap = {}, linkedinMap = {}, pairSet = new Set(), foundPairs = [];
      allLeads.forEach(lead => {
        if (lead.email) { const k = lead.email.trim().toLowerCase(); if (!emailMap[k]) emailMap[k] = []; emailMap[k].push(lead); }
        if (lead.linkedin) { const k = lead.linkedin.trim().toLowerCase().replace(/\/$/, ''); if (!linkedinMap[k]) linkedinMap[k] = []; linkedinMap[k].push(lead); }
      });

      const addPairs = (map, reason) => {
        Object.values(map).forEach(group => {
          if (group.length < 2) return;
          for (let i = 0; i < group.length - 1; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const key = [group[i].id, group[j].id].sort().join('|');
              if (!pairSet.has(key)) { pairSet.add(key); foundPairs.push({ a: group[i], b: group[j], reason }); }
            }
          }
        });
      };
      addPairs(emailMap, 'email'); addPairs(linkedinMap, 'linkedin');
      foundPairs.forEach(p => {
        const aE = p.a.email?.trim().toLowerCase(), bE = p.b.email?.trim().toLowerCase();
        const aL = p.a.linkedin?.trim().toLowerCase().replace(/\/$/, ''), bL = p.b.linkedin?.trim().toLowerCase().replace(/\/$/, '');
        if (aE && aE === bE && aL && aL === bL) p.reason = 'both';
      });

      setPairs(foundPairs); setIndex(0); setDone(foundPairs.length === 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const advance = () => { const next = index + 1; if (next >= pairs.length) setDone(true); else setIndex(next); };

  async function keepOne(keepId, deleteId) {
    setWorking(true);
    try {
      await supabase.from('leads').delete().eq('id', deleteId);
      setDeleted(d => d + 1); advance();
    } catch (e) { setError(e.message); }
    finally { setWorking(false); }
  }

  const skip = () => { setSkipped(s => s + 1); advance(); };

  const s = { page: { minHeight: '100vh', background: '#F5F7FA', padding: '32px 24px', fontFamily: "'Plus Jakarta Sans', sans-serif" }, title: { fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 4 }, card: { background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, padding: '20px' } };

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, color: '#1A56DB', marginBottom: 8, fontWeight: 700 }}>Scanning for duplicates…</div><div style={{ fontSize: 12, color: '#64748B' }}>Checking email & LinkedIn</div></div></div>;
  if (error)   return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div><div style={{ color: '#E24B4A', marginBottom: 16 }}>{error}</div><button onClick={load} style={{ padding: '6px 14px', border: '1px solid #D0D7E5', borderRadius: 7, cursor: 'pointer' }}>Retry</button></div></div>;

  if (done) return (
    <div style={{ ...s.page, textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>✓</div>
      <h2 style={{ ...s.title, fontSize: 28 }}>{pairs.length === 0 ? 'No duplicates found' : 'All pairs reviewed'}</h2>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 24 }}>
        {[['Deleted', deleted, '#1A56DB'], ['Skipped', skipped, '#64748B'], ['Total pairs', pairs.length, '#0F172A']].map(([l, v, c]) => (
          <div key={l} style={{ textAlign: 'center' }}><div style={{ fontSize: 40, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 32 }}>
        <button onClick={() => navigate('/sales/contacts')} style={{ padding: '8px 20px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Back to Contacts</button>
        <button onClick={() => { setDone(false); setDeleted(0); setSkipped(0); load(); }} style={{ padding: '8px 14px', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff' }}>Re-scan</button>
      </div>
    </div>
  );

  const pair = pairs[index];
  if (!pair) return null;
  const { a, b, reason } = pair;
  const pct = Math.round((index / pairs.length) * 100);
  const reasonColors = { both: { bg: '#FFF7ED', color: '#C2410C' }, email: { bg: '#EFF6FF', color: '#1D4ED8' }, linkedin: { bg: '#F5F3FF', color: '#6D28D9' } };
  const rc = reasonColors[reason] || reasonColors.email;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={s.title}>Deduplicate Contacts</h1>
          <div style={{ fontSize: 12, color: '#64748B' }}>Review each pair and choose which record to keep</div>
        </div>
        <button onClick={() => navigate('/sales/contacts')} style={{ padding: '6px 14px', border: '1px solid #E4E8F0', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff' }}>← Contacts</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 4, background: '#E4E8F0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1A56DB', width: `${pct}%`, transition: 'width .4s', borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>{index + 1} / {pairs.length}</div>
        <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>{deleted} deleted</div>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: rc.bg, color: rc.color, fontSize: 11, padding: '4px 12px', borderRadius: 20, marginBottom: 16, fontWeight: 600 }}>
        {reason === 'both' ? '⚡ Matches on email + LinkedIn' : reason === 'email' ? '@ Email match' : 'in LinkedIn match'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 0, alignItems: 'start' }}>
        {[{ contact: a, other: b }, { contact: b, other: a }].map(({ contact, other }, idx) => (
          <React.Fragment key={idx}>
            {idx === 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}><div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E4E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#64748B' }}>VS</div></div>}
            <div style={{ ...s.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{contact.company}</div>
                <StarRating contact={contact} size={12} showScore={true} />
              </div>
              <Field label="Contact"  value={contact.contact} />
              <Field label="Role"     value={contact.role} />
              <Field label="Email"    value={contact.email} />
              <Field label="Phone"    value={contact.phone} />
              <Field label="Country"  value={contact.country} />
              <Field label="LinkedIn" value={contact.linkedin} />
              <Field label="Source"   value={contact.source} />
              <button onClick={() => keepOne(contact.id, other.id)} disabled={working}
                style={{ width: '100%', marginTop: 12, padding: '8px 0', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1 }}>
                {working ? '...' : '✓ Keep this'}
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={skip} disabled={working} style={{ padding: '8px 20px', border: '1px solid #E4E8F0', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#64748B' }}>
          ⏭ Skip — not a duplicate
        </button>
      </div>
    </div>
  );
}
