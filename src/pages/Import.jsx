import React, { useState, useRef } from 'react';
import { supabase } from '../data/supabase.js';
import { Btn, Toast } from '../components/UI.jsx';

function calcTier(row) {
  let s = 0;
  if (row.email) s++;
  if (row.phone) s++;
  if (row.contact) s++;
  if (row.role) s++;
  if (row.linkedin) s++;
  if (s >= 4) return 'complete';
  if (s >= 2) return 'partial';
  if (s >= 1) return 'minimal';
  return 'empty';
}

const COUNTRY_MAP = {
  'us':'United States','usa':'United States','u.s.':'United States','u.s.a.':'United States',
  'united states of america':'United States','america':'United States',
  'uk':'United Kingdom','gb':'United Kingdom','u.k.':'United Kingdom','great britain':'United Kingdom','england':'United Kingdom','britain':'United Kingdom',
  'uae':'UAE','u.a.e.':'UAE','united arab emirates':'UAE','dubai':'UAE','abu dhabi':'UAE',
  'de':'Germany','deutschland':'Germany','fr':'France','es':'Spain','espana':'Spain','españa':'Spain',
  'it':'Italy','italia':'Italy','nl':'Netherlands','holland':'Netherlands','the netherlands':'Netherlands',
  'ch':'Switzerland','schweiz':'Switzerland','suisse':'Switzerland','be':'Belgium','belgique':'Belgium',
  'in':'India','bharat':'India','cn':'China','prc':'China',"people's republic of china":'China',
  'au':'Australia','ca':'Canada','br':'Brazil','brasil':'Brazil','mx':'Mexico','méxico':'Mexico',
  'jp':'Japan','kr':'South Korea','korea':'South Korea','republic of korea':'South Korea',
  'sg':'Singapore','se':'Sweden','sverige':'Sweden','dk':'Denmark','danmark':'Denmark',
  'no':'Norway','norge':'Norway','fi':'Finland','suomi':'Finland','pl':'Poland','polska':'Poland',
  'pt':'Portugal','ie':'Ireland','eire':'Ireland','cz':'Czechia','czech republic':'Czechia','czech':'Czechia',
  'ru':'Russia','russian federation':'Russia','tr':'Turkey','turkiye':'Turkey','türkiye':'Turkey',
  'sa':'Saudi Arabia','ksa':'Saudi Arabia','kingdom of saudi arabia':'Saudi Arabia',
  'il':'Israel','eg':'Egypt','za':'South Africa','rsa':'South Africa','ng':'Nigeria','ke':'Kenya',
  'ma':'Morocco','maroc':'Morocco',
};

const STANDARD_COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","UAE","Uganda","Ukraine","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

function normalizeCountry(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const exact = STANDARD_COUNTRIES.find(c => c.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const mapped = COUNTRY_MAP[trimmed.toLowerCase()];
  if (mapped) return mapped;
  if (trimmed.length <= 2) return null;
  if (trimmed.length <= 35 && !/[0-9,]/.test(trimmed) && !/street|avenue|road|blvd|drive|lane|suite/i.test(trimmed)) return trimmed;
  return null;
}

const CONTACT_FIELDS   = ['company','contact','role','country','city','email','phone','linkedin','website','industry','source'];
const EXHIBITOR_FIELDS = ['company','category','booth','country','website','contact','email','notes'];

// Known exhibition names shown as datalist suggestions
const EXPO_SUGGESTIONS = [
  "Vitafoods Europe 2026",
  "SupplySide Connect NJ 2026",
  "Cosmet'Agora 2026",
  "SupplySide West 2026",
  "Natural Products Expo West 2026",
  "in-cosmetics Global 2026",
];

// ─── CSV parser — handles multiline quoted fields ─────────────────────────────
function parseCSV(str) {
  const results = [];
  let i = 0;
  const n = str.length;
  while (i < n) {
    const row = [];
    while (i < n) {
      if (str[i] === '"') {
        i++;
        let cell = '';
        while (i < n) {
          const ch = str[i];
          if (ch === '"') {
            if (i + 1 < n && str[i + 1] === '"') { cell += '"'; i += 2; }
            else { i++; break; }
          } else { cell += ch; i++; }
        }
        row.push(cell.trim());
      } else {
        let cell = '';
        while (i < n && str[i] !== ',' && str[i] !== '\n' && str[i] !== '\r') { cell += str[i]; i++; }
        row.push(cell.trim());
      }
      if (i < n && str[i] === ',') { i++; }
      else if (i < n && (str[i] === '\n' || str[i] === '\r')) {
        if (str[i] === '\r' && i + 1 < n && str[i + 1] === '\n') i += 2;
        else i++;
        break;
      } else { break; }
    }
    if (row.length > 0 && row.some(c => c !== '')) results.push(row);
  }
  return results;
}

// ─── Title-row detection ──────────────────────────────────────────────────────
// Returns true if the first row looks like a title/merged cell rather than real headers.
// Signals: only 1 non-empty cell, or cell contains the exhibition name / long descriptive text.
function looksLikeTitleRow(row) {
  const nonEmpty = row.filter(c => c && String(c).trim());
  if (nonEmpty.length === 1) return true; // single merged title cell
  // If >60% of cells are empty and the first cell is long text, it's a title
  const firstCell = String(row[0] || '').trim();
  if (nonEmpty.length <= 2 && firstCell.length > 20) return true;
  return false;
}

// ─── Auto-mapper ──────────────────────────────────────────────────────────────
function isApolloFile(hdrs) {
  const joined = hdrs.map(h => h.toLowerCase()).join(',');
  return joined.includes('apollo contact id') || joined.includes('person linkedin url') || joined.includes('company name for emails');
}

function autoMap(hdrs, isExhibitor) {
  const m = {};

  if (isApolloFile(hdrs)) {
    hdrs.forEach((h, i) => {
      const hl = h.toLowerCase().trim();
      if (hl === 'first name') m._firstname = i;
      else if (hl === 'last name') m._lastname = i;
      else if (hl === 'company') m.company = i;
      else if (hl === 'company name' && m.company === undefined) m.company = i;
      else if (hl === 'title') m.role = i;
      else if (hl === 'email') m.email = i;
      else if (hl === 'first phone') m.phone = i;
      else if (hl === 'work direct phone' && m.phone === undefined) m.phone = i;
      else if (hl === 'corporate phone' && m.phone === undefined) m.phone = i;
      else if (hl === 'mobile phone' && m.phone === undefined) m.phone = i;
      else if (hl === 'person linkedin url') m.linkedin = i;
      else if (hl === 'website') m.website = i;
      else if (hl === 'country') m.country = i;
      else if (hl === 'company country' && m.country === undefined) m.country = i;
      else if (hl === 'city') m.city = i;
      else if (hl === 'company city' && m.city === undefined) m.city = i;
      else if (hl === 'industry') m.industry = i;
    });
    return m;
  }

  hdrs.forEach((h, i) => {
    // Normalise: lowercase, strip spaces/punctuation
    const hl = h.toLowerCase().replace(/[\s_\-\.#\(\)]/g, '');

    // Skip pure index columns like "#", "no", "num"
    if (['','no','num','sr','sno','index','row'].includes(hl)) return;

    // Company — covers "Company", "Company Name", "CompanyName", "Organisation"
    if (!m.company && (hl === 'company' || hl === 'companyname' || hl.includes('organisation') || hl === 'exhibitor')) {
      m.company = i;
    }
    // Booth — covers "Booth", "Booth Number", "Booth Number(s)", "Stand", "Stall", "Hall"
    else if (!m.booth && (hl.includes('booth') || hl.includes('stand') || hl.includes('stall') || hl === 'hall')) {
      m.booth = i;
    }
    // Country
    else if (!m.country && hl.includes('country')) {
      m.country = i;
    }
    // Category / type (exhibitor mode only)
    else if (isExhibitor && !m.category && (hl.includes('category') || hl.includes('sector') || hl.includes('type') || hl.includes('segment'))) {
      m.category = i;
    }
    // Contact name
    else if (!m.contact && !isExhibitor && (hl.includes('contact') || (hl.includes('name') && !hl.includes('company')))) {
      m.contact = i;
    }
    // Role / title
    else if (!m.role && !isExhibitor && (hl.includes('role') || hl.includes('title') || hl.includes('position') || hl.includes('jobtitle'))) {
      m.role = i;
    }
    // Email
    else if (!m.email && hl.includes('email')) {
      m.email = i;
    }
    // Phone
    else if (!m.phone && (hl.includes('phone') || hl.includes('mobile') || hl.includes('tel'))) {
      m.phone = i;
    }
    // LinkedIn
    else if (!m.linkedin && hl.includes('linkedin')) {
      m.linkedin = i;
    }
    // Website
    else if (!m.website && (hl.includes('website') || hl.includes('web') || hl.includes('domain') || hl.includes('url'))) {
      m.website = i;
    }
    // Industry
    else if (!m.industry && (hl.includes('industry') || hl.includes('sector'))) {
      m.industry = i;
    }
    // Source
    else if (!m.source && hl.includes('source')) {
      m.source = i;
    }
    // Notes
    else if (!m.notes && hl.includes('note')) {
      m.notes = i;
    }
    // City
    else if (!m.city && hl.includes('city')) {
      m.city = i;
    }
  });

  return m;
}

function detectMode(hdrs) {
  const joined = hdrs.map(h => h.toLowerCase()).join(' ');
  if (joined.includes('stand') || joined.includes('booth') || joined.includes('exhibitor')) return 'exhibitors';
  return 'contacts';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ImportPage() {
  const [step,      setStep]      = useState(1);
  const [mode,      setMode]      = useState(null);
  const [expo,      setExpo]      = useState('');
  const [file,      setFile]      = useState(null);
  const [headers,   setHeaders]   = useState([]);
  const [preview,   setPreview]   = useState([]);
  const [rawRows,   setRawRows]   = useState([]);
  const [mapping,   setMapping]   = useState({});
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);
  const [toast,     setToast]     = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  function reset() { setStep(1); setMode(null); setFile(null); setHeaders([]); setPreview([]); setRawRows([]); setMapping({}); setResult(null); }

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    const ext = f.name.split('.').pop().toLowerCase();
    try {
      let hdrs = [], allRows = [], prevRows = [];

      if (ext === 'csv') {
        const text = await f.text();
        const parsed = parseCSV(text);

        // Title-row detection: if first row looks like a title, skip it
        let startIdx = 0;
        if (parsed.length > 1 && looksLikeTitleRow(parsed[0])) startIdx = 1;

        hdrs = parsed[startIdx].map(h => h.replace(/^"+|"+$/g, '').trim());
        allRows = parsed.slice(startIdx + 1).map(r => r.map(v => v.replace(/^"+|"+$/g, '').trim()));
        prevRows = allRows.slice(0, 5);

      } else {
        const buf = await f.arrayBuffer();
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Title-row detection for Excel
        let startIdx = 0;
        if (data.length > 1 && looksLikeTitleRow(data[0].map(c => String(c||'')))) startIdx = 1;

        hdrs = data[startIdx].map(h => String(h||'').trim());
        allRows = data.slice(startIdx + 1).map(r => hdrs.map((_, i) => String(r[i]||'').trim()));
        prevRows = allRows.slice(0, 5);
      }

      // Filter out completely empty rows
      allRows = allRows.filter(r => r.some(c => c && c.trim()));

      // Respect manual mode selection — only auto-detect if user hasn't chosen yet
      const detectedMode = mode || detectMode(hdrs);
      setHeaders(hdrs);
      setPreview(prevRows);
      setRawRows(allRows);
      setMode(detectedMode);
      setMapping(autoMap(hdrs, detectedMode === 'exhibitors'));
      setStep(2);
    } catch(e) { showToast('Error reading file: ' + e.message, 'error'); }
  }

  async function doImport() {
    setImporting(true);
    setStep(3);
    let imported = 0, errors = 0;
    const BATCH = 30;
    const isApollo = headers.some(h => h.toLowerCase().includes('apollo contact id') || h.toLowerCase().includes('company name for emails'));
    const expoName = expo.trim() || 'Unknown Exhibition';

    if (mode === 'exhibitors') {
      const mapped = rawRows.map(row => {
        const get = k => mapping[k] !== undefined ? String(row[mapping[k]]||'').trim() : '';
        const company = get('company');
        if (!company) return null;
        return {
          exhibition: expoName,
          company,
          category:  get('category')||null,
          booth:     get('booth')||null,
          country:   normalizeCountry(get('country')),
          website:   get('website')||null,
          contact:   get('contact')||null,
          email:     get('email')||null,
          notes:     get('notes')||null,
          status:    'new',
          imported_at: new Date().toISOString(),
        };
      }).filter(Boolean);

      for (let i = 0; i < mapped.length; i += BATCH) {
        const batch = mapped.slice(i, i + BATCH);
        try {
          const { error } = await supabase.from('exhibitors').insert(batch);
          if (error) { errors += batch.length; console.error(error.message); }
          else imported += batch.length;
        } catch(e) { errors += batch.length; }
        await new Promise(r => setTimeout(r, 60));
      }
    } else {
      // ── Clean + map rows ─────────────────────────────────────────────────
      const clean = v => {
        if (!v) return null;
        const s = String(v).trim();
        if (!s || s.toLowerCase() === 'nan' || s === 'undefined' || s === 'null') return null;
        return s;
      };

      const mapped = [];
      for (const row of rawRows) {
        const get = k => mapping[k] !== undefined ? String(row[mapping[k]]||'').trim() : '';
        const company = clean(get('company'));
        if (!company) continue;
        let contact = clean(get('contact'));
        if (isApollo && mapping['_firstname'] !== undefined) {
          const fn = clean(String(row[mapping['_firstname']]||''));
          const ln = clean(String(row[mapping['_lastname']]||''));
          if (fn || ln) contact = [fn,ln].filter(Boolean).join(' ');
        }
        const email   = clean(get('email'));
        const phone   = clean(get('phone'))?.replace(/^'+/, '').trim() || null;
        const linkedin = clean(get('linkedin'));
        const role    = clean(get('role'));
        mapped.push({
          company,
          contact:      contact || null,
          role:         role || null,
          country:      normalizeCountry(get('country')),
          city:         clean(get('city')) || null,
          email:        email || null,
          phone:        phone || null,
          linkedin:     linkedin || null,
          website:      clean(get('website')) || null,
          industry:     clean(get('industry')) || null,
          source:       clean(get('source')) || null,
          tier:         calcTier({ email, phone, contact, role, linkedin }),
          imported_at:  new Date().toISOString(),
          last_synced:  new Date().toISOString(),
        });
      }

      // ── Dedup within file ────────────────────────────────────────────────
      let skipped = 0;
      const seenEmails   = new Set();
      const seenNameKeys = new Set();
      const fileDeduped  = mapped.filter(row => {
        const ek = row.email ? row.email.toLowerCase() : null;
        const nk = (row.company && row.contact) ? (row.company + '|||' + row.contact).toLowerCase() : null;
        if (ek && seenEmails.has(ek))   { skipped++; return false; }
        if (nk && seenNameKeys.has(nk)) { skipped++; return false; }
        if (ek) seenEmails.add(ek);
        if (nk) seenNameKeys.add(nk);
        return true;
      });

      // ── Insert in batches — plain insert, catch duplicates as skipped ─────────
      for (let i = 0; i < fileDeduped.length; i += BATCH) {
        const batch = fileDeduped.slice(i, i + BATCH);
        try {
          const { error } = await supabase.from('leads').insert(batch);
          if (error) {
            if (error.code === '23505') {
              // Unique violation — insert row by row to save non-duplicates
              for (const row of batch) {
                try {
                  const { error: e2 } = await supabase.from('leads').insert(row);
                  if (e2 && e2.code === '23505') skipped++;
                  else if (e2) errors++;
                  else imported++;
                } catch(ex) { errors++; }
              }
            } else {
              errors += batch.length;
              console.error('Insert error:', error.message, error.code);
            }
          } else {
            imported += batch.length;
          }
        } catch(e) { errors += batch.length; }
        await new Promise(r => setTimeout(r, 80));
      }
    }

    setResult({ imported, errors, skipped: skipped || 0, mode, total: rawRows.length });
    setImporting(false);
    setStep(4);
  }

  const fields = mode === 'exhibitors' ? EXHIBITOR_FIELDS : CONTACT_FIELDS;

  return (
    <div style={{padding:'16px 20px', maxWidth:800}}>

      {/* Step indicator */}
      <div style={{display:'flex',gap:0,marginBottom:24,background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
        {['Upload file','Map columns','Importing','Done'].map((label,i) => (
          <div key={i} style={{flex:1,padding:'10px 16px',background:step===i+1?'#0D1F3C':step>i+1?'#ECFDF5':'#F8FAFC',color:step===i+1?'#fff':step>i+1?'#065F46':'#94A3B8',fontSize:12,fontWeight:step===i+1?700:500,textAlign:'center',borderRight:i<3?'1px solid #E4E8F0':'none'}}>
            {step>i+1?'✓ ':''}{label}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step===1 && (
        <div>
          {/* Mode selector */}
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <div onClick={()=>setMode('contacts')} style={{flex:1,padding:'16px',background:mode==='contacts'?'#EFF6FF':'#fff',border:'1px solid '+(mode==='contacts'?'#0D1F3C':'#E4E8F0'),borderRadius:9,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>👥</div>
              <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C'}}>Contacts</div>
              <div style={{fontSize:11,color:'#64748B'}}>Apollo, LinkedIn, trade shows CSV/Excel</div>
            </div>
            <div onClick={()=>setMode('exhibitors')} style={{flex:1,padding:'16px',background:mode==='exhibitors'?'#EFF6FF':'#fff',border:'1px solid '+(mode==='exhibitors'?'#0D1F3C':'#E4E8F0'),borderRadius:9,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>🏢</div>
              <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C'}}>Event</div>
              <div style={{fontSize:11,color:'#64748B'}}>Conference or event attendee list</div>
            </div>
          </div>

          {/* Exhibition name — free text + suggestions */}
          {mode==='exhibitors' && (
            <div style={{background:'#F8FAFC',border:'1px solid #E4E8F0',borderRadius:9,padding:'14px 16px',marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Exhibition name</div>
              <input
                list="expo-suggestions"
                value={expo}
                onChange={e => setExpo(e.target.value)}
                placeholder="Type or select — e.g. Cosmet'Agora 2026"
                style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'8px 10px',fontSize:12,background:'#fff',fontFamily:'inherit',boxSizing:'border-box'}}
              />
              <datalist id="expo-suggestions">
                {EXPO_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
              {expo.trim() && (
                <div style={{fontSize:10,color:'#64748B',marginTop:6}}>
                  Exhibitors will be tagged as: <strong style={{color:'#0D1F3C'}}>{expo.trim()}</strong>
                </div>
              )}
            </div>
          )}

          {/* Drop zone */}
          <div style={{background:'#fff',border:'2px dashed #D0D7E5',borderRadius:12,padding:40,textAlign:'center',cursor:'pointer'}}
            onClick={()=>fileRef.current.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
            <div style={{fontSize:36,marginBottom:10}}>↑</div>
            <div style={{fontSize:14,fontWeight:700,color:'#0D1F3C',marginBottom:5}}>Drop your file here</div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:14}}>Supports Excel (.xlsx) and CSV files</div>
            <div style={{display:'inline-block',padding:'7px 18px',background:'#0D1F3C',color:'#fff',borderRadius:8,fontSize:12,fontWeight:600}}>Browse file</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>
        </div>
      )}

      {/* ── Step 2: Map columns ── */}
      {step===2 && (
        <div>
          {/* File info */}
          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C',marginBottom:2}}>{file?.name}</div>
            <div style={{fontSize:12,color:'#64748B'}}>
              {rawRows.length} rows · {headers.length} columns · importing as{' '}
              <strong>{mode==='exhibitors' ? (expo.trim()||'Exhibitors') : 'Contacts'}</strong>
            </div>
          </div>

          {/* Exhibition name edit — visible in step 2 for exhibitors */}
          {mode==='exhibitors' && (
            <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:9,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:11,color:'#92600A',fontWeight:600,flexShrink:0}}>Exhibition:</span>
              <input
                list="expo-suggestions-2"
                value={expo}
                onChange={e => setExpo(e.target.value)}
                placeholder="Enter exhibition name..."
                style={{flex:1,border:'1px solid #FCD34D',borderRadius:6,padding:'5px 8px',fontSize:11,background:'#fff',fontFamily:'inherit'}}
              />
              <datalist id="expo-suggestions-2">
                {EXPO_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          )}

          {/* Column mapping */}
          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0D1F3C',marginBottom:12}}>Map columns</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {fields.map(field => (
                <div key={field}>
                  <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>
                    {field}
                    {mapping[field] !== undefined && <span style={{color:'#10B981',marginLeft:4}}>✓</span>}
                  </div>
                  <select
                    value={mapping[field]!==undefined ? mapping[field] : ''}
                    onChange={e => setMapping(m => ({...m,[field]: e.target.value===''?undefined:Number(e.target.value)}))}
                    style={{width:'100%',border:'1px solid '+(mapping[field]!==undefined?'#86EFAC':'#D0D7E5'),borderRadius:7,padding:'5px 8px',fontSize:11,background:'#fff',fontFamily:'inherit'}}>
                    <option value=''>not mapped</option>
                    {headers.map((h,i) => <option key={i} value={i}>{h || `Column ${i+1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden',marginBottom:14}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #E4E8F0',fontSize:12,fontWeight:700}}>Preview (first 5 rows)</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr>{fields.filter(f=>mapping[f]!==undefined).map(f=>(
                    <th key={f} style={{padding:'6px 10px',background:'#F8FAFC',borderBottom:'1px solid #E4E8F0',textAlign:'left',fontSize:9,letterSpacing:'.07em',textTransform:'uppercase',color:'#64748B',fontWeight:600}}>{f}</th>
                  ))}</tr>
                </thead>
                <tbody>{preview.map((row,i)=>(
                  <tr key={i}>{fields.filter(f=>mapping[f]!==undefined).map(f=>(
                    <td key={f} style={{padding:'5px 10px',borderBottom:'1px solid #F1F5F9',color:'#475569',whiteSpace:'nowrap',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis'}}>{row[mapping[f]]||'--'}</td>
                  ))}</tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <Btn variant="outline" onClick={reset}>Back</Btn>
            <Btn
              onClick={doImport}
              disabled={mapping.company===undefined && mapping['_firstname']===undefined || (mode==='exhibitors' && !expo.trim())}>
              Import {rawRows.length} {mode==='exhibitors'?'exhibitors':'contacts'}{mode==='exhibitors' && expo.trim() ? ` → ${expo.trim()}` : ' → Contacts DB'}
            </Btn>
          </div>
          {mode==='exhibitors' && !expo.trim() && (
            <div style={{fontSize:11,color:'#E24B4A',marginTop:8}}>⚠ Please enter an exhibition name before importing</div>
          )}
        </div>
      )}

      {/* ── Step 3: Importing ── */}
      {step===3 && (
        <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:12,padding:48,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:14}}>⋯</div>
          <div style={{fontSize:15,fontWeight:700,color:'#0D1F3C',marginBottom:6}}>Importing {mode==='exhibitors'?'exhibitors':'contacts'}…</div>
          <div style={{fontSize:13,color:'#64748B',marginBottom:4}}>Processing rows — please wait, do not close this tab</div>
          <div style={{fontSize:12,color:'#94A3B8'}}>Large files may take up to 60 seconds</div>
          <div style={{height:6,background:'#F1F5F9',borderRadius:3,marginTop:20,overflow:'hidden'}}>
            <div style={{height:'100%',background:'#0D1F3C',borderRadius:3,width:'100%',animation:'progress 2s ease-in-out infinite'}}/>
          </div>
          <style>{`@keyframes progress { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step===4 && result && (
        <div style={{background:'#ECFDF5',border:'1px solid #86EFAC',borderRadius:12,padding:32,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>✓</div>
          <div style={{fontSize:18,fontWeight:700,color:'#065F46',marginBottom:16}}>Import complete</div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
            <div style={{background:'#fff',border:'1px solid #86EFAC',borderRadius:9,padding:'12px 20px',minWidth:120}}>
              <div style={{fontSize:22,fontWeight:600,color:'#065F46'}}>{result.imported.toLocaleString()}</div>
              <div style={{fontSize:11,color:'#64748B'}}>{mode==='exhibitors'?'Exhibitors':'Contacts'} imported</div>
            </div>
            {result.skipped > 0 && (
              <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',borderRadius:9,padding:'12px 20px',minWidth:120}}>
                <div style={{fontSize:22,fontWeight:600,color:'#92600A'}}>{result.skipped}</div>
                <div style={{fontSize:11,color:'#64748B'}}>Skipped (duplicates)</div>
              </div>
            )}
            {result.errors > 0 && (
              <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:9,padding:'12px 20px',minWidth:120}}>
                <div style={{fontSize:22,fontWeight:600,color:'#E24B4A'}}>{result.errors}</div>
                <div style={{fontSize:11,color:'#64748B'}}>Errors</div>
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            <Btn variant="outline" onClick={reset}>Import another file</Btn>
            <Btn onClick={()=>window.location.href=mode==='exhibitors'?'/sales/exhibitors':'/sales/contacts'}>
              {mode==='exhibitors'?'View Exhibitor Library':'View Contacts'}
            </Btn>
          </div>
        </div>
      )}

      <Toast toast={toast}/>
    </div>
  );
}
