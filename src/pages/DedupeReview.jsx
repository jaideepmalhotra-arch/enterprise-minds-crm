import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../data/supabase.js";
import { StarRating } from "../components/ContactDrawer.jsx";

async function logAudit(eventType, summary, detail) {
  try {
    await supabase.from('audit_log').insert({
      event_type: eventType, summary,
      detail: detail || null, performed_by: 'JM',
      created_at: new Date().toISOString(),
    });
  } catch (e) { console.warn('Audit log failed:', e.message); }
}

function normalizeCompany(name) {
  if (!name) return '';
  const suffixes = /\b(ltd|limited|llc|inc|corp|corporation|gmbh|sas|bv|ag|sa|pty|pvt|co|company|group|holdings|international|intl|solutions|services|technologies|tech)\b\.?/gi;
  return name.toLowerCase().replace(/[.,\-'&]/g, ' ').replace(suffixes, '').replace(/\s+/g, ' ').trim();
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getConfidence(a, b, reason) {
  if (reason === 'email+linkedin') return 99;
  if (reason === 'email') {
    let score = 95;
    if (a.country && b.country && a.country === b.country) score = Math.min(99, score + 2);
    if (a.contact && b.contact && normalizeName(a.contact) === normalizeName(b.contact)) score = Math.min(99, score + 2);
    return score;
  }
  if (reason === 'linkedin') return 90;
  if (reason === 'name+company') {
    let score = 80;
    if (a.country && b.country && a.country === b.country) score = Math.min(95, score + 8);
    if (a.email && b.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()) score = 99;
    if (a.role && b.role && a.role.toLowerCase() === b.role.toLowerCase()) score = Math.min(95, score + 5);
    return score;
  }
  if (reason === 'firstname+company') {
    let score = 72;
    if (a.country && b.country && a.country === b.country) score = Math.min(88, score + 8);
    if (a.role && b.role && a.role.toLowerCase() === b.role.toLowerCase()) score = Math.min(88, score + 8);
    const aPhone = (a.phone || '').replace(/\D/g,'');
    const bPhone = (b.phone || '').replace(/\D/g,'');
    if (aPhone && bPhone && aPhone === bPhone) score = Math.min(90, score + 10);
    return score;
  }
  if (reason === 'phone+company') return 75;
  return 70;
}

function ConfidenceBadge({ score }) {
  const color  = score >= 95 ? '#991B1B' : score >= 85 ? '#92600A' : '#065F46';
  const bg     = score >= 95 ? '#FEF2F2' : score >= 85 ? '#FFFBEB' : '#ECFDF5';
  const border = score >= 95 ? '#FCA5A5' : score >= 85 ? '#FCD34D' : '#86EFAC';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color, border: `1px solid ${border}` }}>
      {score}% match
    </span>
  );
}

function TierBadge({ tier }) {
  const map = {
    complete: { bg: '#ECFDF5', color: '#065F46', label: 'Complete' },
    partial:  { bg: '#FFFBEB', color: '#92600A', label: 'Partial'  },
    minimal:  { bg: '#F5F3FF', color: '#5B21B6', label: 'Minimal'  },
    empty:    { bg: '#F1F5F9', color: '#475569', label: 'Empty'    },
  };
  const s = map[tier] || map.empty;
  return <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{s.label}</span>;
}

function Field({ label, value, highlight }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: value ? (highlight ? '#1A56DB' : '#0F172A') : '#CBD5E1', fontWeight: highlight ? 700 : 400, wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  );
}

const REASON_CONFIG = {
  'email+linkedin':    { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: '⚡ Email + LinkedIn match' },
  'email':             { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: '@ Email match' },
  'linkedin':          { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE', label: 'in LinkedIn match' },
  'name+company':      { bg: '#ECFDF5', color: '#065F46', border: '#86EFAC', label: '👤 Same person · same company' },
  'firstname+company': { bg: '#ECFDF5', color: '#065F46', border: '#86EFAC', label: '👤 First name · same company' },
  'phone+company':     { bg: '#FFFBEB', color: '#92600A', border: '#FCD34D', label: '📞 Same phone · same company' },
};

export default function DedupeReview() {
  const navigate = useNavigate();
  const [pairs,        setPairs]        = useState([]);
  const [index,        setIndex]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [working,      setWorking]      = useState(false);
  const [skipped,      setSkipped]      = useState(0);
  const [deleted,      setDeleted]      = useState(0);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState(null);
  const [filterReason, setFilterReason] = useState('all');
  const [filterCountry,setFilterCountry]= useState('');
  const [filterCompany,setFilterCompany]= useState('');
  const [filterInput,  setFilterInput]  = useState({ country: '', company: '' });
  const [totalScanned, setTotalScanned] = useState(0);

  const loadDuplicates = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const allLeads = [];
      let from = 0;
      const BATCH = 1000;
      while (true) {
        let q = supabase
          .from('leads')
          .select('id,company,contact,role,email,phone,country,city,linkedin,website,industry,source,tier,date_added,imported_at')
          .order('imported_at', { ascending: true })
          .range(from, from + BATCH - 1);
        if (filterCountry) q = q.eq('country', filterCountry);
        if (filterCompany) q = q.ilike('company', '%' + filterCompany + '%');
        const { data, error: err } = await q;
        if (err) throw err;
        if (!data || data.length === 0) break;
        allLeads.push(...data);
        if (data.length < BATCH) break;
        from += BATCH;
      }
      setTotalScanned(allLeads.length);

      const pairSet = new Set(), foundPairs = [];

      // Pass 1: Email
      const emailMap = {};
      allLeads.forEach(lead => {
        if (!lead.email) return;
        const k = lead.email.trim().toLowerCase();
        if (!emailMap[k]) emailMap[k] = [];
        emailMap[k].push(lead);
      });
      Object.values(emailMap).forEach(group => {
        if (group.length < 2) return;
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const key = [group[i].id, group[j].id].sort().join('|');
            if (!pairSet.has(key)) { pairSet.add(key); foundPairs.push({ a: group[i], b: group[j], reason: 'email' }); }
          }
        }
      });

      // Pass 1b: LinkedIn
      const linkedinMap = {};
      allLeads.forEach(lead => {
        if (!lead.linkedin) return;
        const k = lead.linkedin.trim().toLowerCase().replace(/\/$/, '');
        if (!linkedinMap[k]) linkedinMap[k] = [];
        linkedinMap[k].push(lead);
      });
      Object.values(linkedinMap).forEach(group => {
        if (group.length < 2) return;
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const key = [group[i].id, group[j].id].sort().join('|');
            if (!pairSet.has(key)) { pairSet.add(key); foundPairs.push({ a: group[i], b: group[j], reason: 'linkedin' }); }
          }
        }
      });

      // Upgrade email → email+linkedin
      foundPairs.forEach(p => {
        if (p.reason !== 'email') return;
        const aL = p.a.linkedin?.trim().toLowerCase().replace(/\/$/, '');
        const bL = p.b.linkedin?.trim().toLowerCase().replace(/\/$/, '');
        if (aL && bL && aL === bL) p.reason = 'email+linkedin';
      });

      // Pass 2: Name + company
      const nameCompanyMap = {};
      allLeads.forEach(lead => {
        const name    = normalizeName(lead.contact || '');
        const company = normalizeCompany(lead.company || '');
        if (!name || name.length < 4 || !company) return;
        const fullKey = name + '|' + company;
        if (!nameCompanyMap[fullKey]) nameCompanyMap[fullKey] = [];
        nameCompanyMap[fullKey].push(lead);
        const first = name.split(' ')[0];
        if (first && first.length >= 4 && first !== name) {
          const firstKey = '__fn__' + first + '|' + company;
          if (!nameCompanyMap[firstKey]) nameCompanyMap[firstKey] = [];
          nameCompanyMap[firstKey].push(lead);
        }
      });
      Object.entries(nameCompanyMap).forEach(([mapKey, group]) => {
        if (group.length < 2) return;
        const isFirstNameKey = mapKey.startsWith('__fn__');
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            if (group[i].id === group[j].id) continue;
            const eA = group[i].email?.trim().toLowerCase(), eB = group[j].email?.trim().toLowerCase();
            if (eA && eB && eA !== eB) continue;
            if (isFirstNameKey) {
              const sameRole = group[i].role && group[j].role && group[i].role.toLowerCase() === group[j].role.toLowerCase();
              const pA = (group[i].phone || '').replace(/\D/g,''), pB = (group[j].phone || '').replace(/\D/g,'');
              if (!sameRole && !(pA.length > 6 && pA === pB)) continue;
            }
            const key = [group[i].id, group[j].id].sort().join('|');
            if (!pairSet.has(key)) { pairSet.add(key); foundPairs.push({ a: group[i], b: group[j], reason: isFirstNameKey ? 'firstname+company' : 'name+company' }); }
          }
        }
      });

      // Pass 3: Phone + company
      const phoneCompanyMap = {};
      allLeads.forEach(lead => {
        if (!lead.phone) return;
        const name = normalizeName(lead.contact || '');
        if (name.length >= 4) return;
        const phone   = lead.phone.replace(/\D/g,'').trim();
        const company = normalizeCompany(lead.company || '');
        if (!phone || phone.length < 7 || !company) return;
        const key = phone + '|' + company;
        if (!phoneCompanyMap[key]) phoneCompanyMap[key] = [];
        phoneCompanyMap[key].push(lead);
      });
      Object.values(phoneCompanyMap).forEach(group => {
        if (group.length < 2) return;
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const eA = group[i].email?.trim().toLowerCase(), eB = group[j].email?.trim().toLowerCase();
            if (eA && eB && eA !== eB) continue;
            const key = [group[i].id, group[j].id].sort().join('|');
            if (!pairSet.has(key)) { pairSet.add(key); foundPairs.push({ a: group[i], b: group[j], reason: 'phone+company' }); }
          }
        }
      });

      foundPairs.forEach(p => { p.confidence = getConfidence(p.a, p.b, p.reason); });
      foundPairs.sort((a, b) => b.confidence - a.confidence);
      setPairs(foundPairs); setIndex(0); setDone(foundPairs.length === 0);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterCountry, filterCompany]);

  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);

  function applyFilters() { setFilterCountry(filterInput.country); setFilterCompany(filterInput.company); setIndex(0); setDone(false); setDeleted(0); setSkipped(0); }

  const advance = () => {
    let next = index + 1;
    if (filterReason !== 'all') { while (next < pairs.length && pairs[next].reason !== filterReason) next++; }
    if (next >= pairs.length) setDone(true); else setIndex(next);
  };

  const keepOne = async (keepId, deleteId) => {
    setWorking(true);
    try {
      const { data } = await supabase.from('leads').select('*').eq('id', deleteId).single();
      if (data) {
        await supabase.from('leads_deleted').insert({
          original_id: data.id, company: data.company, contact: data.contact,
          role: data.role, email: data.email, phone: data.phone,
          country: data.country, city: data.city, linkedin: data.linkedin,
          website: data.website, industry: data.industry, source: data.source,
          tier: data.tier, notes: data.notes, services: data.services || [],
          deleted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
      }
      await supabase.from('leads').delete().eq('id', deleteId);
      await logAudit('dedupe_delete',
        `Duplicate removed: ${pair.b?.company || deleteId}`,
        { kept_id: keepId, deleted_id: deleteId, reason: pair.reason, confidence: pair.confidence }
      );
      setDeleted(d => d + 1); advance();
    } catch(e) { setError(e.message); }
    finally { setWorking(false); }
  };

  const skip = () => { setSkipped(s => s + 1); advance(); };

  const counts = {
    all: pairs.length,
    'email+linkedin':    pairs.filter(p => p.reason === 'email+linkedin').length,
    email:               pairs.filter(p => p.reason === 'email').length,
    linkedin:            pairs.filter(p => p.reason === 'linkedin').length,
    'name+company':      pairs.filter(p => p.reason === 'name+company').length,
    'firstname+company': pairs.filter(p => p.reason === 'firstname+company').length,
    'phone+company':     pairs.filter(p => p.reason === 'phone+company').length,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1A56DB' }}>Scanning for duplicates…</div>
      <div style={{ fontSize: 12, color: '#64748B' }}>Running 4 detection passes across all contacts</div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: '#E24B4A', fontSize: 13 }}>{error}</div>
      <button onClick={loadDuplicates} style={{ padding: '6px 14px', border: '1px solid #D0D7E5', borderRadius: 7, cursor: 'pointer', background: '#fff', fontSize: 12 }}>Retry</button>
    </div>
  );

  if (done) return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{pairs.length === 0 ? 'No duplicates found' : 'All pairs reviewed'}</div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 28 }}>Deleted contacts are in the recycle bin for 7 days.</div>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 32 }}>
        {[['Deleted', deleted, '#1A56DB'], ['Skipped', skipped, '#64748B'], ['Total pairs', pairs.length, '#0F172A']].map(([l, v, c]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => navigate('/sales/contacts')} style={{ padding: '8px 20px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>← Back to Contacts</button>
        <button onClick={() => { setDone(false); setDeleted(0); setSkipped(0); loadDuplicates(); }} style={{ padding: '8px 14px', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff' }}>Re-scan</button>
      </div>
    </div>
  );

  const pair = pairs[index];
  if (!pair) return null;
  const { a, b, reason, confidence } = pair;
  const pct = Math.round((index / pairs.length) * 100);
  const rc = REASON_CONFIG[reason] || REASON_CONFIG['email'];
  const emailMatch    = a.email && b.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase();
  const linkedinMatch = a.linkedin && b.linkedin && a.linkedin.trim().toLowerCase().replace(/\/$/, '') === b.linkedin.trim().toLowerCase().replace(/\/$/, '');
  const nameMatch     = reason === 'name+company' || reason === 'firstname+company';

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748B' }}>Review each pair · choose which to keep · deleted go to recycle bin (7 days)</div>
        </div>
        <button onClick={() => navigate('/sales/contacts')} style={{ padding: '6px 14px', border: '1px solid #E4E8F0', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748B' }}>← Contacts</button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
          Filter scan · {totalScanned.toLocaleString()} contacts loaded
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Country</div>
            <input value={filterInput.country} onChange={e => setFilterInput(f => ({ ...f, country: e.target.value }))}
              placeholder="e.g. India, UAE..." style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Company contains</div>
            <input value={filterInput.company} onChange={e => setFilterInput(f => ({ ...f, company: e.target.value }))}
              placeholder="e.g. Emirates, Mashreq..." style={{ width: '100%', border: '1px solid #D0D7E5', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <button onClick={applyFilters} style={{ padding: '6px 16px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Scan</button>
          {(filterCountry || filterCompany) && (
            <button onClick={() => { setFilterInput({ country: '', company: '' }); setFilterCountry(''); setFilterCompany(''); }}
              style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #D0D7E5', borderRadius: 6, fontSize: 11, color: '#64748B', cursor: 'pointer' }}>Clear</button>
          )}
        </div>
      </div>

      {/* Reason filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['all', `All (${counts.all})`],
          ['email+linkedin', `⚡ Email+LinkedIn (${counts['email+linkedin']})`],
          ['email', `@ Email (${counts.email})`],
          ['linkedin', `in LinkedIn (${counts.linkedin})`],
          ['name+company', `👤 Name+Company (${counts['name+company']})`],
          ['firstname+company', `👤 First name (${counts['firstname+company']})`],
          ['phone+company', `📞 Phone (${counts['phone+company']})`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => { setFilterReason(val); setIndex(val === 'all' ? 0 : pairs.findIndex(p => p.reason === val)); }}
            style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: filterReason === val ? '#EFF6FF' : '#fff', color: filterReason === val ? '#1A56DB' : '#64748B', borderColor: filterReason === val ? '#BFDBFE' : '#E4E8F0' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 4, background: '#E4E8F0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1A56DB', borderRadius: 2, width: `${pct}%`, transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>{index + 1} / {pairs.length}</span>
        <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>{deleted} deleted</span>
      </div>

      {/* Reason + confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: rc.bg, color: rc.color, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: `1px solid ${rc.border}` }}>{rc.label}</span>
        <ConfidenceBadge score={confidence} />
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 0, alignItems: 'start' }}>
        {[{ contact: a, other: b }, { contact: b, other: a }].map(({ contact, other }, idx) => (
          <>
            {idx === 1 && (
              <div key="vs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 48 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E4E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#64748B' }}>VS</div>
              </div>
            )}
            <div key={idx} style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', flex: 1, marginRight: 8 }}>{contact.company}</div>
                <TierBadge tier={contact.tier} />
              </div>
              <StarRating contact={contact} size={12} showScore />
              <div style={{ marginTop: 10 }}>
                <Field label="Contact"  value={contact.contact}  highlight={nameMatch} />
                <Field label="Role"     value={contact.role} />
                <Field label="Email"    value={contact.email}    highlight={emailMatch} />
                <Field label="Phone"    value={contact.phone} />
                <Field label="Country"  value={contact.country} />
                <Field label="City"     value={contact.city} />
                <Field label="LinkedIn" value={contact.linkedin} highlight={linkedinMatch} />
                <Field label="Source"   value={contact.source} />
                <Field label="Imported" value={contact.imported_at ? new Date(contact.imported_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : null} />
              </div>
              <button onClick={() => keepOne(contact.id, other.id)} disabled={working}
                style={{ width: '100%', marginTop: 16, padding: '9px 0', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1 }}>
                {working ? '...' : '✓ Keep this · delete other'}
              </button>
            </div>
          </>
        ))}
      </div>

      {/* Skip */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={skip} disabled={working} style={{ padding: '8px 24px', border: '1px solid #E4E8F0', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#64748B' }}>
          ⏭ Skip — not a duplicate
        </button>
      </div>
    </div>
  );
}
