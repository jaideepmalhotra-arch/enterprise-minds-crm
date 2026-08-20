import React, { useState, useRef } from 'react';
import { supabase } from '../data/supabase.js';
import { Toast } from '../components/UI.jsx';
import { logAudit } from '../utils/audit.js';

// ── Constants ────────────────────────────────────────────────────────────────
const BATCH = 50;

const TECH_CONFERENCE_SUGGESTIONS = [
  'Gartner IT Symposium 2026', 'AWS re:Invent 2026', 'Microsoft Ignite 2026',
  'Google Cloud Next 2026', 'Salesforce Dreamforce 2026', 'Web Summit 2026',
  'Money 20/20 2026', 'Nasscom Technology & Leadership Forum 2026',
  'Nasscom Product Conclave 2026', 'TechSparks 2026', 'CES 2027', 'Davos WEF 2027',
];

const BUYER_TITLES = [
  'ceo','cto','cio','cdo','coo','chief','president','founder','co-founder',
  'vp','vice president','svp','evp','head of','director','managing director',
  'gm','general manager','partner','principal','owner','procurement',
  'purchase','supply chain','it manager','technology manager','digital',
];
const NOT_RELEVANT_TITLES = [
  'intern','student','assistant','coordinator','analyst','associate','junior',
  'executive assistant','receptionist','admin','hr generalist',
];
const TARGET_INDUSTRIES = [
  'technology','software','it ','information technology','banking','financial',
  'insurance','healthcare','pharma','manufacturing','retail','ecommerce',
  'logistics','telecom','media','education','consulting','professional services',
];
const NOT_RELEVANT_INDUSTRIES = [
  'restaurant','food service','hospitality','tourism','agriculture','farming',
  'construction','real estate','religion','non-profit','ngo',
];

function calcImportance(role = '', company = '', industry = '') {
  const r = (role||'').toLowerCase();
  const i = (industry||'').toLowerCase();
  const c = (company||'').toLowerCase();
  const signals = [];
  let score = 0;

  if (NOT_RELEVANT_TITLES.some(t => r.includes(t)))       return { importance: 'not_relevant', signals: ['Non-buyer title'] };
  if (NOT_RELEVANT_INDUSTRIES.some(t => i.includes(t) || c.includes(t.split(' ')[0]))) return { importance: 'not_relevant', signals: ['Non-target industry'] };

  if (BUYER_TITLES.some(t => r.includes(t)))      { score += 50; signals.push('Buyer title'); }
  if (TARGET_INDUSTRIES.some(t => i.includes(t))) { score += 25; signals.push('Target industry'); }
  if (r.includes('decision') || r.includes('strategy')) { score += 15; signals.push('Decision maker'); }
  if (r.includes('digital') || r.includes('transform'))  { score += 10; signals.push('Digital focus'); }

  if (score >= 70) return { importance: 'hot',      signals };
  if (score >= 35) return { importance: 'warm',     signals };
  if (score >= 10) return { importance: 'cold',     signals };
  return { importance: 'not_set', signals };
}

function calcTier({ email, phone, contact, role, linkedin }) {
  let s = 0;
  if (email) s++; if (phone) s++; if (contact) s++; if (role) s++; if (linkedin) s++;
  if (s >= 4) return 'complete'; if (s >= 2) return 'partial'; if (s >= 1) return 'minimal'; return 'empty';
}

const COUNTRY_MAP = {
  'us':'United States','usa':'United States','u.s.a.':'United States','united states of america':'United States',
  'uk':'United Kingdom','u.k.':'United Kingdom','great britain':'United Kingdom',
  'uae':'UAE','u.a.e.':'UAE','united arab emirates':'UAE',
  'in':'India','ind':'India',
  'sg':'Singapore','sin':'Singapore',
  'au':'Australia','aus':'Australia',
  'de':'Germany','deu':'Germany',
  'fr':'France','fra':'France',
  'ca':'Canada','can':'Canada',
  'jp':'Japan','jpn':'Japan',
};
function normalizeCountry(v) {
  if (!v) return null;
  const s = v.trim();
  return COUNTRY_MAP[s.toLowerCase()] || s;
}

function cleanVal(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || ['nan','null','undefined','none','n/a','#n/a','-'].includes(s.toLowerCase())) return null;
  return s;
}

function isApolloFile(headers) {
  return headers.some(h => ['apollo contact id','company name for emails','email confidence'].includes(h.toLowerCase()));
}

function autoMap(headers) {
  const map = {};
  const hl = headers.map(h => h.toLowerCase().trim());

  // Exact match first, then partial
  const findExact = (terms) => {
    for (const t of terms) {
      const i = hl.findIndex(h => h === t.toLowerCase());
      if (i >= 0) return i;
    }
    return undefined;
  };
  const findPartial = (terms) => {
    const i = hl.findIndex(h => terms.some(t => h.includes(t.toLowerCase())));
    return i >= 0 ? i : undefined;
  };

  // Apollo-specific exact matches first
  map._firstname = findExact(['first name', 'firstname']);
  map._lastname  = findExact(['last name', 'lastname']);
  map.company    = findExact(['company name for emails']) !== undefined
    ? findPartial(['company name for emails'])
    : findExact(['company']) ?? findPartial(['company name', 'company']);

  // Email — must be 'Email' exactly, not 'Company Name for Emails'
  map.email = findExact(['email']);

  // Phone — prefer Work Direct, then Mobile, then First Phone, then Corporate
  map.phone = findExact(['work direct phone'])
    ?? findExact(['mobile phone'])
    ?? findExact(['first phone'])
    ?? findExact(['corporate phone'])
    ?? findPartial(['direct phone', 'mobile', 'phone']);

  map.role      = findExact(['title']) ?? findPartial(['job title', 'role', 'position']);
  map.country   = findExact(['country']);
  map.city      = findExact(['city']);
  map.linkedin  = findExact(['person linkedin url']) ?? findPartial(['linkedin url', 'linkedin']);
  map.website   = findExact(['website']) ?? findPartial(['web site', 'url']);
  map.industry  = findExact(['industry']) ?? findPartial(['sector']);
  map.source    = findExact(['primary email source']) ?? findPartial(['source', 'lead source']);
  map.contact   = findExact(['contact']) ?? findPartial(['full name']);

  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────
const m = {
  pageBg: '#F2F7FD', headerBg: '#EBF4FD', border: '#B5D4F4',
  accent: '#2563EB', textDark: '#0C447C', textMid: '#185FA5',
  kpiBg: '#EBF4FD', kpiBorder: '#B5D4F4',
  badgeBg: '#DBEAFE', badgeText: '#1E40AF',
};

export default function ImportPage() {
  const [step,         setStep]         = useState(1);
  const [mode,         setMode]         = useState(null);      // contacts | exhibitors
  const [file,         setFile]         = useState(null);
  const [headers,      setHeaders]      = useState([]);
  const [preview,      setPreview]      = useState([]);
  const [rawRows,      setRawRows]      = useState([]);
  const [mapping,      setMapping]      = useState({});
  const [expo,         setExpo]         = useState('');
  const [expoSuggest,  setExpoSuggest]  = useState(false);
  const [processing,   setProcessing]   = useState(false);
  const [stagingResult,setStagingResult]= useState(null);
  const [merging,      setMerging]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [toast,        setToast]        = useState(null);
  const [batchId,      setBatchId]      = useState(null);
  const [impBreakdown, setImpBreakdown] = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  function reset() {
    setStep(1); setMode(null); setFile(null); setHeaders([]); setPreview([]);
    setRawRows([]); setMapping({}); setExpo(''); setStagingResult(null);
    setResult(null); setBatchId(null); setImpBreakdown(null); setProcessing(false);
  }

  // ── File parse ──────────────────────────────────────────────────────────────
  async function onFile(f) {
    setFile(f);
    const ext = f.name.split('.').pop().toLowerCase();
    let rows = [];

    if (ext === 'csv') {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const parseCSV = line => {
        const out = []; let cur = ''; let inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        out.push(cur.trim()); return out;
      };
      // Skip title rows
      let start = 0;
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        if (parseCSV(lines[i]).length > 3) { start = i; break; }
      }
      const hdrs = parseCSV(lines[start]).map(h => h.replace(/^["'\s]+|["'\s]+$/g,''));
      rows = lines.slice(start+1).filter(Boolean).map(l => {
        const vals = parseCSV(l);
        return Object.fromEntries(hdrs.map((h,i) => [h, vals[i]||'']));
      });
      setHeaders(hdrs);
      setMapping(autoMap(hdrs));
    } else {
      // XLSX via CDN
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
      const buf  = await f.arrayBuffer();
      const wb   = XLSX.read(buf, { type:'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      let startRow = 0;
      for (let i = 0; i < Math.min(5, data.length); i++) {
        if (data[i].filter(Boolean).length > 3) { startRow = i; break; }
      }
      const hdrs = data[startRow].map(h => String(h).trim());
      rows = data.slice(startRow+1).map(r => Object.fromEntries(hdrs.map((h,i) => [h, String(r[i]||'').trim()])));
      setHeaders(hdrs);
      setMapping(autoMap(hdrs));
    }

    setRawRows(rows);
    setPreview(rows.slice(0, 5));

    // Auto-detect mode
    const hdrs = Object.keys(rows[0]||{});
    const isExhibitor = hdrs.some(h => ['booth','stand','category','exhibition'].includes(h.toLowerCase()));
    if (isExhibitor) setMode('exhibitors');
    else setMode('contacts');

    setStep(2);
  }

  // ── Process: map → stage → dedup ───────────────────────────────────────────
  async function doProcess() {
    setProcessing(true);
    setStep(3);
    const bid = `batch_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    setBatchId(bid);

    try {
      const apollo = isApolloFile(headers);
      const stagingRows = [];
      const iBreakdown = { hot:0, warm:0, cold:0, not_relevant:0, not_set:0 };

      for (const row of rawRows) {
        const get = k => mapping[k] !== undefined ? cleanVal(String(row[Object.keys(row)[mapping[k]]]||'')) : null;
        const company = get('company');
        if (!company) continue;

        let contact = get('contact');
        if (apollo && mapping['_firstname'] !== undefined) {
          const fn = cleanVal(String(row[Object.keys(row)[mapping['_firstname']]]||''));
          const ln = cleanVal(String(row[Object.keys(row)[mapping['_lastname']]]||''));
          if (fn || ln) contact = [fn,ln].filter(Boolean).join(' ');
        }

        const email    = get('email');
        const rawPhone = get('phone') || null;
        const phone    = rawPhone ? rawPhone.replace(/^['+\s]+/, '').trim() || null : null;
        const linkedin = get('linkedin');
        const role     = get('role');
        const country  = normalizeCountry(get('country'));
        const industry = get('industry');
        const imp      = calcImportance(role||'', company||'', industry||'');
        iBreakdown[imp.importance] = (iBreakdown[imp.importance]||0) + 1;

        stagingRows.push({
          import_batch_id: bid,
          company, contact, role, email, phone, linkedin,
          country, city: get('city'),
          website: get('website'),
          industry, source: get('source') || (mode === 'exhibitors' ? expo : 'Apollo'),
          importance: imp.importance,
          tier: calcTier({ email, phone, contact, role, linkedin }),
          status: 'pending',
        });
      }

      setImpBreakdown(iBreakdown);

      // Insert to staging in batches
      for (let i = 0; i < stagingRows.length; i += BATCH) {
        const { error } = await supabase.from('leads_staging').insert(stagingRows.slice(i, i+BATCH));
        if (error) throw error;
        await new Promise(r => setTimeout(r, 30));
      }

      // Sync companies first
      await supabase.rpc('sync_staging_companies', { p_batch_id: bid });

      // Run dedup
      const { data: dedupData, error: dedupErr } = await supabase.rpc('process_staging_dedup', { p_batch_id: bid });
      if (dedupErr) throw dedupErr;

      setStagingResult(dedupData);
      setStep(4);
    } catch(e) {
      showToast('Processing failed: ' + e.message, 'error');
      setStep(2);
    } finally {
      setProcessing(false);
    }
  }

  // ── Merge ────────────────────────────────────────────────────────────────────
  async function doMerge(includeFlagged = false) {
    setMerging(true);
    try {
      const { data, error } = await supabase.rpc('merge_staging_batch', {
        p_batch_id:       batchId,
        p_include_flagged: includeFlagged,
      });
      if (error) throw error;

      logAudit('import_contacts',
        `Imported ${data.inserted} contacts (${includeFlagged ? 'incl flagged' : 'clean only'})`,
        { batch_id: batchId, inserted: data.inserted, staging: stagingResult }
      );

      setResult({ inserted: data.inserted, stagingResult, impBreakdown });
      setStep(5);
    } catch(e) {
      showToast('Merge failed: ' + e.message, 'error');
    } finally {
      setMerging(false);
    }
  }

  const STEPS = ['Upload file','Map columns','Processing','Review & merge','Done'];

  const IMP_CONFIG = {
    hot:          { label:'🔴 Hot',          bg:'#FEF2F2', color:'#991B1B', desc:'Senior buyer in target industry' },
    warm:         { label:'🟡 Warm',         bg:'#FFFBEB', color:'#92600A', desc:'Decision maker or adjacent' },
    cold:         { label:'🔵 Cold',         bg:'#EFF6FF', color:'#1E40AF', desc:'Weak signals' },
    not_relevant: { label:'⬜ Not relevant', bg:'#F1F5F9', color:'#475569', desc:'Non-buyer or wrong industry' },
    not_set:      { label:'⚪ Not set',      bg:'#F8FAFC', color:'#94A3B8', desc:'No role/industry data' },
  };

  return (
    <div style={{ background: m.pageBg, minHeight:'100vh' }}>
      {/* Module header */}
      <div style={{ background: m.headerBg, borderBottom:`1px solid ${m.border}`, padding:'14px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:m.badgeBg, color:m.badgeText }}>📥 Input</span>
          <span style={{ color:m.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:m.textDark }}>Import</span>
        </div>
        <div style={{ fontSize:11, color:m.textMid }}>Upload CSV or Excel · auto-dedup · company sync · importance rating</div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Step indicator */}
        <div style={{ display:'flex', background:'#fff', border:`1px solid ${m.border}`, borderRadius:10, overflow:'hidden', marginBottom:20 }}>
          {STEPS.map((label,i) => (
            <div key={i} style={{ flex:1, padding:'10px 8px', textAlign:'center', fontSize:11, fontWeight: step===i+1?700:400,
              background: step===i+1?m.accent : step>i+1?'#ECFDF5':'#F8FAFC',
              color: step===i+1?'#fff' : step>i+1?'#065F46':'#94A3B8',
              borderRight: i<4?`1px solid ${m.border}`:'none' }}>
              {step>i+1?'✓ ':''}{label}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step===1 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Contacts */}
            <div onClick={() => { setMode('contacts'); fileRef.current?.click(); }}
              style={{ background:'#fff', border:`2px dashed ${mode==='contacts'?m.accent:m.border}`, borderRadius:12, padding:32, textAlign:'center', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = m.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = mode==='contacts'?m.accent:m.border}>
              <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
              <div style={{ fontSize:15, fontWeight:700, color:m.textDark, marginBottom:6 }}>Contacts</div>
              <div style={{ fontSize:12, color:m.textMid }}>Apollo, LinkedIn, any CSV/Excel</div>
              <div style={{ fontSize:11, color:'#94A3B8', marginTop:6 }}>Auto-detects Apollo format</div>
            </div>
            {/* Events */}
            <div style={{ background:'#fff', border:`2px dashed ${m.border}`, borderRadius:12, padding:32 }}>
              <div style={{ fontSize:32, marginBottom:10, textAlign:'center' }}>🏢</div>
              <div style={{ fontSize:15, fontWeight:700, color:m.textDark, marginBottom:10, textAlign:'center' }}>Event / Conference</div>
              <div style={{ fontSize:11, color:m.textMid, marginBottom:10 }}>Exhibition name</div>
              <div style={{ position:'relative' }}>
                <input value={expo} onChange={e => { setExpo(e.target.value); setExpoSuggest(true); }}
                  onFocus={() => setExpoSuggest(true)} onBlur={() => setTimeout(()=>setExpoSuggest(false),200)}
                  placeholder="e.g. Gartner IT Symposium 2026"
                  style={{ width:'100%', border:`1px solid ${m.border}`, borderRadius:8, padding:'7px 10px', fontSize:12, fontFamily:'inherit', boxSizing:'border-box' }} />
                {expoSuggest && expo.length === 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:`1px solid ${m.border}`, borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,.1)', zIndex:50, maxHeight:200, overflowY:'auto' }}>
                    {TECH_CONFERENCE_SUGGESTIONS.map(s => (
                      <div key={s} onClick={() => { setExpo(s); setMode('exhibitors'); }}
                        style={{ padding:'8px 12px', fontSize:12, cursor:'pointer', color:m.textDark }}
                        onMouseEnter={e => e.currentTarget.style.background=m.kpiBg}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
              <div onClick={() => { if(!expo.trim()){showToast('Enter exhibition name first','warn');return;} setMode('exhibitors'); fileRef.current?.click(); }}
                style={{ marginTop:12, padding:'8px 0', background:m.accent, color:'#fff', borderRadius:8, textAlign:'center', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Upload exhibitor file
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }}
              onChange={e => { if(e.target.files[0]) onFile(e.target.files[0]); e.target.value=''; }} />
          </div>
        )}

        {/* ── Step 2: Map columns ── */}
        {step===2 && headers.length > 0 && (
          <div>
            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:m.textDark, marginBottom:12 }}>
                {file?.name} · {rawRows.length.toLocaleString()} rows · {isApolloFile(headers) ? '✦ Apollo detected' : 'Standard format'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {['company','contact','email','phone','role','country','city','linkedin','website','industry','source'].map(field => (
                  <div key={field}>
                    <div style={{ fontSize:10, fontWeight:600, color:m.textMid, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{field}</div>
                    <select value={mapping[field]??''} onChange={e => setMapping(p=>({...p,[field]:e.target.value===''?undefined:Number(e.target.value)}))}
                      style={{ width:'100%', border:`1px solid ${m.border}`, borderRadius:6, padding:'5px 8px', fontSize:11, background:'#fff', fontFamily:'inherit' }}>
                      <option value="">— skip —</option>
                      {headers.map((h,i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            {/* Preview */}
            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:10, overflow:'hidden', marginBottom:14 }}>
              <div style={{ padding:'8px 14px', background:m.kpiBg, borderBottom:`1px solid ${m.border}`, fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase' }}>Preview (5 rows)</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead><tr>
                    {['Company','Contact','Email','Role','Country','Importance'].map(h => (
                      <th key={h} style={{ padding:'6px 10px', background:'#F8FAFC', borderBottom:`1px solid ${m.border}`, textAlign:'left', fontSize:9, color:m.textMid, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {preview.map((row,i) => {
                      const get = k => mapping[k]!==undefined ? cleanVal(String(row[Object.keys(row)[mapping[k]]]||'')) : null;
                      const apollo = isApolloFile(headers);
                      let contact = get('contact');
                      if (apollo && mapping['_firstname']!==undefined) {
                        const fn = cleanVal(String(row[Object.keys(row)[mapping['_firstname']]]||''));
                        const ln = cleanVal(String(row[Object.keys(row)[mapping['_lastname']]]||''));
                        if (fn||ln) contact = [fn,ln].filter(Boolean).join(' ');
                      }
                      const imp = calcImportance(get('role')||'', get('company')||'', get('industry')||'');
                      const ic = IMP_CONFIG[imp.importance];
                      return (
                        <tr key={i}>
                          <td style={{ padding:'6px 10px', borderBottom:'1px solid #F1F5F9', fontWeight:600, color:m.textDark }}>{get('company')||'—'}</td>
                          <td style={{ padding:'6px 10px', borderBottom:'1px solid #F1F5F9', color:'#475569' }}>{contact||'—'}</td>
                          <td style={{ padding:'6px 10px', borderBottom:'1px solid #F1F5F9', color:'#475569' }}>{get('email')||'—'}</td>
                          <td style={{ padding:'6px 10px', borderBottom:'1px solid #F1F5F9', color:'#475569' }}>{get('role')||'—'}</td>
                          <td style={{ padding:'6px 10px', borderBottom:'1px solid #F1F5F9', color:'#475569' }}>{normalizeCountry(get('country'))||'—'}</td>
                          <td style={{ padding:'6px 10px', borderBottom:'1px solid #F1F5F9' }}>
                            <span style={{ padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700, background:ic.bg, color:ic.color }}>{ic.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={reset} style={{ padding:'8px 16px', border:`1px solid ${m.border}`, borderRadius:8, fontSize:12, cursor:'pointer', background:'#fff', color:m.textMid, fontFamily:'inherit' }}>← Back</button>
              <button onClick={doProcess} style={{ padding:'8px 24px', background:m.accent, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Process {rawRows.length.toLocaleString()} rows →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Processing ── */}
        {step===3 && (
          <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:14 }}>⋯</div>
            <div style={{ fontSize:15, fontWeight:700, color:m.textDark, marginBottom:6 }}>Processing {rawRows.length.toLocaleString()} rows…</div>
            <div style={{ fontSize:12, color:m.textMid, marginBottom:4 }}>Staging · syncing companies · checking duplicates</div>
            <div style={{ height:6, background:m.kpiBg, borderRadius:3, marginTop:20, overflow:'hidden' }}>
              <div style={{ height:'100%', background:m.accent, borderRadius:3, width:'100%', animation:'progress 2s ease-in-out infinite' }}/>
            </div>
            <style>{`@keyframes progress{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
          </div>
        )}

        {/* ── Step 4: Review & Merge ── */}
        {step===4 && stagingResult && (
          <div>
            {/* Dedup results */}
            <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
              <div style={{ padding:'12px 18px', background:m.kpiBg, borderBottom:`1px solid ${m.border}`, fontSize:13, fontWeight:700, color:m.textDark }}>
                Dedup results — {stagingResult.total} rows checked
              </div>
              <div style={{ display:'flex', gap:0 }}>
                {[
                  ['✅ Clean',   stagingResult.clean,   '#ECFDF5','#065F46', 'Ready to import'],
                  ['🟡 Flagged', stagingResult.flagged, '#FFFBEB','#92600A', 'Same name+company'],
                  ['🔴 Blocked', stagingResult.blocked, '#FEF2F2','#991B1B', 'Exact email/LinkedIn match'],
                ].map(([label,count,bg,color,desc]) => (
                  <div key={label} style={{ flex:1, padding:'16px 18px', background:bg, borderRight:`1px solid ${m.border}` }}>
                    <div style={{ fontSize:24, fontWeight:700, color, marginBottom:4 }}>{count}</div>
                    <div style={{ fontSize:12, fontWeight:600, color, marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:10, color:'#64748B' }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Importance breakdown */}
            {impBreakdown && (
              <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                <div style={{ padding:'12px 18px', background:m.kpiBg, borderBottom:`1px solid ${m.border}`, fontSize:13, fontWeight:700, color:m.textDark }}>
                  Importance auto-rating
                </div>
                <div style={{ display:'flex', gap:0 }}>
                  {Object.entries(IMP_CONFIG).map(([k,ic]) => (
                    impBreakdown[k] > 0 && (
                      <div key={k} style={{ flex:1, padding:'14px 16px', background:ic.bg, borderRight:`1px solid ${m.border}` }}>
                        <div style={{ fontSize:20, fontWeight:700, color:ic.color, marginBottom:2 }}>{impBreakdown[k]}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:ic.color }}>{ic.label}</div>
                        <div style={{ fontSize:10, color:'#64748B', marginTop:2 }}>{ic.desc}</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {stagingResult.clean > 0 && (
                <button onClick={() => doMerge(false)} disabled={merging}
                  style={{ padding:'10px 24px', background:'#059669', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:merging?'not-allowed':'pointer', fontFamily:'inherit', opacity:merging?.6:1 }}>
                  {merging ? 'Importing…' : `✅ Import ${stagingResult.clean} clean contacts`}
                </button>
              )}
              {stagingResult.flagged > 0 && (
                <button onClick={() => doMerge(true)} disabled={merging}
                  style={{ padding:'10px 20px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:merging?'not-allowed':'pointer', fontFamily:'inherit', opacity:merging?.6:1 }}>
                  {merging ? '…' : `🟡 Import all incl. ${stagingResult.flagged} flagged`}
                </button>
              )}
              {stagingResult.clean === 0 && stagingResult.flagged === 0 && (
                <div style={{ padding:'10px 18px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, fontSize:13, color:'#991B1B', fontWeight:600 }}>
                  All {stagingResult.blocked} contacts already exist in your database
                </div>
              )}
              <button onClick={reset} style={{ padding:'10px 16px', border:`1px solid ${m.border}`, borderRadius:8, fontSize:12, cursor:'pointer', background:'#fff', color:m.textMid, fontFamily:'inherit' }}>
                Cancel
              </button>
            </div>

            {stagingResult.blocked > 0 && (
              <div style={{ marginTop:12, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, fontSize:12, color:'#991B1B' }}>
                🔴 {stagingResult.blocked} contacts blocked — exact email or LinkedIn match already in database
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step===5 && result && (
          <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:12, padding:48, textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:20, fontWeight:700, color:m.textDark, marginBottom:6 }}>Import complete</div>
            <div style={{ display:'flex', gap:24, justifyContent:'center', marginBottom:28 }}>
              {[
                ['Imported',  result.inserted,                     m.accent],
                ['Blocked',   result.stagingResult?.blocked||0,    '#DC2626'],
                ['🔴 Hot',    result.impBreakdown?.hot||0,         '#991B1B'],
                ['🟡 Warm',   result.impBreakdown?.warm||0,        '#92600A'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:32, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1, marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:'#64748B', marginBottom:20 }}>
              All imported contacts automatically linked to companies table
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={reset} style={{ padding:'8px 20px', background:m.accent, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
