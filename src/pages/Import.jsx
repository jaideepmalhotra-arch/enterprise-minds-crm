import React, { useState, useRef } from 'react';
import { supabase } from '../data/supabase.js';
import { Btn, Toast } from '../components/ui/UI.jsx';

const COUNTRY_MAP = {
  // United States variations
  'us':'United States','usa':'United States','u.s.':'United States','u.s.a.':'United States',
  'united states of america':'United States','america':'United States',
  // United Kingdom variations
  'uk':'United Kingdom','gb':'United Kingdom','u.k.':'United Kingdom','great britain':'United Kingdom','england':'United Kingdom','britain':'United Kingdom',
  // UAE variations
  'uae':'UAE','u.a.e.':'UAE','united arab emirates':'UAE','dubai':'UAE','abu dhabi':'UAE',
  // Germany
  'de':'Germany','deutschland':'Germany',
  // France
  'fr':'France',
  // Spain
  'es':'Spain','espana':'Spain','españa':'Spain',
  // Italy
  'it':'Italy','italia':'Italy',
  // Netherlands
  'nl':'Netherlands','holland':'Netherlands','the netherlands':'Netherlands',
  // Switzerland
  'ch':'Switzerland','schweiz':'Switzerland','suisse':'Switzerland',
  // Belgium
  'be':'Belgium','belgique':'Belgium',
  // India
  'in':'India','bharat':'India',
  // China
  'cn':'China','prc':'China',"people's republic of china":'China',
  // Australia
  'au':'Australia',
  // Canada
  'ca':'Canada',
  // Brazil
  'br':'Brazil','brasil':'Brazil',
  // Mexico
  'mx':'Mexico','méxico':'Mexico',
  // Japan
  'jp':'Japan',
  // South Korea
  'kr':'South Korea','korea':'South Korea','republic of korea':'South Korea',
  // Singapore
  'sg':'Singapore',
  // Sweden
  'se':'Sweden','sverige':'Sweden',
  // Denmark
  'dk':'Denmark','danmark':'Denmark',
  // Norway
  'no':'Norway','norge':'Norway',
  // Finland
  'fi':'Finland','suomi':'Finland',
  // Poland
  'pl':'Poland','polska':'Poland',
  // Portugal
  'pt':'Portugal',
  // Ireland
  'ie':'Ireland','eire':'Ireland',
  // Czech
  'cz':'Czechia','czech republic':'Czechia','czech':'Czechia',
  // Russia
  'ru':'Russia','russian federation':'Russia',
  // Turkey
  'tr':'Turkey','turkiye':'Turkey','türkiye':'Turkey',
  // Saudi Arabia
  'sa':'Saudi Arabia','ksa':'Saudi Arabia','kingdom of saudi arabia':'Saudi Arabia',
  // Israel
  'il':'Israel',
  // Egypt
  'eg':'Egypt',
  // South Africa
  'za':'South Africa','rsa':'South Africa',
  // Nigeria
  'ng':'Nigeria',
  // Kenya
  'ke':'Kenya',
  // Morocco
  'ma':'Morocco','maroc':'Morocco',
};

const STANDARD_COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","UAE","Uganda","Ukraine","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

function normalizeCountry(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Check if already a standard country (case-insensitive)
  const exact = STANDARD_COUNTRIES.find(c => c.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  // Check abbreviation/variation map
  const mapped = COUNTRY_MAP[trimmed.toLowerCase()];
  if (mapped) return mapped;
  // If it looks like a city/state (no match), return null to avoid bad data
  if (trimmed.length <= 2) return null; // 2-letter code not in map = unknown
  // Return as-is only if it looks like a country name (no digits, not too long)
  if (trimmed.length <= 35 && !/[0-9,]/.test(trimmed) && !/street|avenue|road|blvd|drive|lane|suite/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

const CONTACT_FIELDS   = ['company','contact','role','country','city','email','phone','linkedin','website','industry','source'];
const EXHIBITOR_FIELDS = ['company','category','booth','country','website','contact','email','notes'];

const EXPO_OPTIONS = [
  'Vitafoods Europe 2026',
  'SupplySide Connect NJ 2026',
  'Other',
];

export default function ImportPage() {
  const [step,      setStep]      = useState(1);
  const [mode,      setMode]      = useState(null); // 'contacts' | 'exhibitors'
  const [expo,      setExpo]      = useState('Vitafoods Europe 2026');
  const [file,      setFile]      = useState(null);
  const [headers,   setHeaders]   = useState([]);
  const [preview,   setPreview]   = useState([]);
  const [rawRows,   setRawRows]   = useState([]);
  const [mapping,   setMapping]   = useState({});
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);
  const [toast,     setToast]     = useState(null);
  const fileRef = useRef();

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  function reset() { setStep(1); setMode(null); setFile(null); setHeaders([]); setPreview([]); setRawRows([]); setMapping({}); setResult(null); }

  function isApolloFile(hdrs) {
    const joined = hdrs.map(h=>h.toLowerCase()).join(',');
    return joined.includes('apollo contact id') || joined.includes('person linkedin url') || joined.includes('company name for emails');
  }

  function autoMap(hdrs, isExhibitor) {
    const m = {};
    // Special handling for Apollo.io exports
    if (isApolloFile(hdrs)) {
      hdrs.forEach((h,i) => {
        const hl = h.toLowerCase().trim();
        // Name fields
        if (hl === 'first name') m._firstname = i;
        else if (hl === 'last name') m._lastname = i;
        // Company — prefer 'company' over 'company name for emails'
        else if (hl === 'company') m.company = i;
        else if (hl === 'company name' && m.company === undefined) m.company = i;
        // Role
        else if (hl === 'title') m.role = i;
        // Email
        else if (hl === 'email') m.email = i;
        // Phone — priority order: first phone > work direct > corporate > mobile
        else if (hl === 'first phone') m.phone = i;
        else if (hl === 'work direct phone' && m.phone === undefined) m.phone = i;
        else if (hl === 'corporate phone' && m.phone === undefined) m.phone = i;
        else if (hl === 'mobile phone' && m.phone === undefined) m.phone = i;
        // LinkedIn
        else if (hl === 'person linkedin url') m.linkedin = i;
        // Website
        else if (hl === 'website') m.website = i;
        // Country — prefer person country over company country
        else if (hl === 'country') m.country = i;
        else if (hl === 'company country' && m.country === undefined) m.country = i;
        // City — prefer person city over company city
        else if (hl === 'city') m.city = i;
        else if (hl === 'company city' && m.city === undefined) m.city = i;
        // Industry
        else if (hl === 'industry') m.industry = i;
      });
      return m;
    }
    // Standard auto-map for other files
    hdrs.forEach((h,i) => {
      const hl = h.toLowerCase().replace(/[\s_\-\.#]/g,'');
      if (hl.includes('company') || hl.includes('organisation') || hl.includes('companyname')) m.company = i;
      else if ((hl.includes('contact') || hl.includes('name')) && !hl.includes('company')) m.contact = i;
      else if (hl.includes('role') || hl.includes('title') || hl.includes('position') || hl.includes('jobtitle') || hl.includes('type') || hl.includes('category')) {
        if (isExhibitor) m.category = i;
        else m.role = i;
      }
      else if (hl.includes('stand') || hl.includes('booth') || hl.includes('stall')) m.booth = i;
      else if (hl.includes('country')) m.country = i;
      else if (hl.includes('city')) m.city = i;
      else if (hl.includes('email')) m.email = i;
      else if (hl.includes('phone') || hl.includes('mobile')) m.phone = i;
      else if (hl.includes('linkedin')) m.linkedin = i;
      else if (hl.includes('website') || hl.includes('domain') || hl.includes('web')) m.website = i;
      else if (hl.includes('industry') || hl.includes('sector')) m.industry = i;
      else if (hl.includes('source')) m.source = i;
      else if (hl.includes('note')) m.notes = i;
    });
    return m;
  }

  // Detect if file is exhibitor based on column names
  function detectMode(hdrs) {
    const joined = hdrs.map(h=>h.toLowerCase()).join(' ');
    if (joined.includes('stand') || joined.includes('booth') || joined.includes('exhibitor')) return 'exhibitors';
    return 'contacts';
  }

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    const ext = f.name.split('.').pop().toLowerCase();
    try {
      let hdrs = [], allRows = [], prevRows = [];
      if (ext === 'csv') {
        const text = await f.text();
        // Proper CSV parser that handles quoted fields with commas inside
        function parseCSV(str) {
          const results = [];
          const lines = str.split(/\r?\n/);
          for (const line of lines) {
            if (!line.trim()) continue;
            const row = [];
            let inQuote = false, cell = '';
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') {
                if (inQuote && line[i+1] === '"') { cell += '"'; i++; }
                else inQuote = !inQuote;
              } else if (ch === ',' && !inQuote) {
                row.push(cell.trim()); cell = '';
              } else {
                cell += ch;
              }
            }
            row.push(cell.trim());
            results.push(row);
          }
          return results;
        }
        const parsed = parseCSV(text);
        hdrs = parsed[0].map(h=>h.replace(/^"+|"+$/g,'').trim());
        allRows = parsed.slice(1).map(r=>r.map(v=>v.replace(/^"+|"+$/g,'').trim()));
        prevRows = allRows.slice(0,5);
      } else {
        const buf = await f.arrayBuffer();
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        const wb = XLSX.read(buf, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {header:1});
        hdrs = data[0].map(h=>String(h||'').trim());
        allRows = data.slice(1).map(r=>hdrs.map((_,i)=>String(r[i]||'').trim()));
        prevRows = allRows.slice(0,5);
      }
      const detectedMode = detectMode(hdrs);
      setHeaders(hdrs);
      setPreview(prevRows);
      setRawRows(allRows);
      setMode(detectedMode);
      setMapping(autoMap(hdrs, detectedMode==='exhibitors'));
      setStep(2);
    } catch(e) { showToast('Error reading file: '+e.message,'error'); }
  }

  async function doImport() {
    setImporting(true);
    setStep(3);
    let imported = 0, errors = 0;
    const BATCH = 150;

    // Apollo-specific: combine first+last name, strip leading apostrophes from phones
    const isApollo = headers.some(h => h.toLowerCase().includes('apollo contact id') || h.toLowerCase().includes('company name for emails'));

    if (mode === 'exhibitors') {
      const mapped = rawRows.map(row => {
        const get = k => mapping[k]!==undefined ? String(row[mapping[k]]||'').trim() : '';
        const company = get('company');
        if (!company) return null;
        return {
          exhibition: expo,
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

      for (let i=0; i<mapped.length; i+=BATCH) {
        const batch = mapped.slice(i,i+BATCH);
        try {
          const {error} = await supabase.from('exhibitors').insert(batch);
          if (error) { errors+=batch.length; console.error(error.message); }
          else imported+=batch.length;
        } catch(e) { errors+=batch.length; }
        await new Promise(r=>setTimeout(r,60));
      }
    } else {
      const mapped = rawRows.map(row => {
        const get = k => mapping[k]!==undefined ? String(row[mapping[k]]||'').trim() : '';
        const company = get('company');
        if (!company) return null;
        let contact2=get('contact'); if(isApollo&&mapping['_firstname']!==undefined){const fn=String(row[mapping['_firstname']]||'').trim();const ln=String(row[mapping['_lastname']]||'').trim();contact2=(fn+' '+ln).trim()||contact2;} const phone=get('phone').replace(/^'+/,'').trim(),contact=contact2,email=get('email'),linkedin=get('linkedin'),role=get('role');
        return {
          company,
          country: normalizeCountry(get('country')),
          city:    get('city')||null,
          website: get('website')||null,
          industry:get('industry')||null,
          source:  get('source')||null,
          status:  'prospect',
        };
      }).filter(Boolean);

      for (let i=0; i<mapped.length; i+=BATCH) {
        const batch = mapped.slice(i,i+BATCH);
        try {
          const {error} = await supabase.from('clients').insert(batch);
          if (error) { errors+=batch.length; }
          else imported+=batch.length;
        } catch(e) { errors+=batch.length; }
        await new Promise(r=>setTimeout(r,60));
      }
    }

    setResult({imported,errors,mode,total:rawRows.length});
    setImporting(false);
    setStep(4);
  }

  const fields = mode==='exhibitors' ? EXHIBITOR_FIELDS : CONTACT_FIELDS;

  return (
    <div style={{padding:'16px 20px',maxWidth:800}}>
      <div style={{display:'flex',gap:0,marginBottom:24,background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
        {['Upload file','Map columns','Importing','Done'].map((label,i)=>(
          <div key={i} style={{flex:1,padding:'10px 16px',background:step===i+1?'#0D1F3C':step>i+1?'#ECFDF5':'#F8FAFC',color:step===i+1?'#fff':step>i+1?'#065F46':'#94A3B8',fontSize:12,fontWeight:step===i+1?700:500,textAlign:'center',borderRight:i<3?'1px solid #E4E8F0':'none'}}>
            {step>i+1?'Done ':''}{label}
          </div>
        ))}
      </div>

      {step===1 && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <div onClick={()=>setMode('contacts')} style={{flex:1,padding:'16px',background:mode==='contacts'?'#EFF6FF':'#fff',border:'1px solid '+(mode==='contacts'?'#0D1F3C':'#E4E8F0'),borderRadius:9,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>👥</div>
              <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C'}}>Contacts</div>
              <div style={{fontSize:11,color:'#64748B'}}>Apollo, LinkedIn, CRM exports CSV/Excel</div>
            </div>
            <div onClick={()=>setMode('exhibitors')} style={{flex:1,padding:'16px',background:false?'#EFF6FF':'#fff',border:'1px solid '+(false?'#0D1F3C':'#E4E8F0'),borderRadius:9,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:24,marginBottom:6}}>🏢</div>
              <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C'}}>Exhibitors</div>
              <div style={{fontSize:11,color:'#64748B'}}>Vitafoods, SupplySide exhibitor lists</div>
            </div>
          </div>

          {mode==='exhibitors' && (
            <div style={{background:'#F8FAFC',border:'1px solid #E4E8F0',borderRadius:9,padding:'14px 16px',marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>Exhibition name</div>
              <select value={expo} onChange={e=>setExpo(e.target.value)} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,background:'#fff',fontFamily:'inherit'}}>
                {EXPO_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          <div style={{background:'#fff',border:'2px dashed #D0D7E5',borderRadius:12,padding:40,textAlign:'center',cursor:'pointer'}} onClick={()=>fileRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
            <div style={{fontSize:36,marginBottom:10}}>↑</div>
            <div style={{fontSize:14,fontWeight:700,color:'#0D1F3C',marginBottom:5}}>Drop your file here</div>
            <div style={{fontSize:12,color:'#64748B',marginBottom:14}}>Supports Excel (.xlsx) and CSV files</div>
            <div style={{display:'inline-block',padding:'7px 18px',background:'#0D1F3C',color:'#fff',borderRadius:8,fontSize:12,fontWeight:600}}>Browse file</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>
        </div>
      )}

      {step===2 && (
        <div>
          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C',marginBottom:2}}>{file?.name}</div>
            <div style={{fontSize:12,color:'#64748B'}}>{rawRows.length} rows · {headers.length} columns · importing as <strong>{false?expo:'Contacts'}</strong></div>
          </div>

          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0D1F3C',marginBottom:12}}>Map columns</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {fields.map(field=>(
                <div key={field}>
                  <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>{field}</div>
                  <select value={mapping[field]!==undefined?mapping[field]:''} onChange={e=>setMapping(m=>({...m,[field]:e.target.value===''?undefined:Number(e.target.value)}))} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'5px 8px',fontSize:11,background:'#fff',fontFamily:'inherit'}}>
                    <option value=''>not mapped</option>
                    {headers.map((h,i)=><option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden',marginBottom:14}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #E4E8F0',fontSize:12,fontWeight:700}}>Preview (first 5 rows)</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead><tr>{fields.filter(f=>mapping[f]!==undefined).map(f=><th key={f} style={{padding:'6px 10px',background:'#F8FAFC',borderBottom:'1px solid #E4E8F0',textAlign:'left',fontSize:9,letterSpacing:'.07em',textTransform:'uppercase',color:'#64748B',fontWeight:600}}>{f}</th>)}</tr></thead>
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
            <Btn onClick={doImport} disabled={mapping.company === undefined && mapping["_firstname"] === undefined}>Import {rawRows.length} {false?'exhibitors':'contacts'} to {false?expo:'Contacts DB'}</Btn>
          </div>
        </div>
      )}

      {step===3 && (
        <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:12,padding:48,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:14}}>...</div>
          <div style={{fontSize:15,fontWeight:700,color:'#0D1F3C',marginBottom:6}}>Importing {false?'exhibitors':'contacts'}...</div>
          <div style={{fontSize:13,color:'#64748B'}}>Saving {rawRows.length} rows to Supabase</div>
          <div style={{height:6,background:'#F1F5F9',borderRadius:3,marginTop:20,overflow:'hidden'}}>
            <div style={{height:'100%',background:'#0D1F3C',borderRadius:3,width:'70%'}}/>
          </div>
        </div>
      )}

      {step===4 && result && (
        <div style={{background:'#ECFDF5',border:'1px solid #86EFAC',borderRadius:12,padding:32,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>done</div>
          <div style={{fontSize:18,fontWeight:700,color:'#065F46',marginBottom:16}}>Import complete</div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
            <div style={{background:'#fff',border:'1px solid #86EFAC',borderRadius:9,padding:'12px 20px',minWidth:120}}>
              <div style={{fontSize:22,fontWeight:600,color:'#065F46'}}>{result.imported.toLocaleString()}</div>
              <div style={{fontSize:11,color:'#64748B'}}>{false?'Exhibitors':'Contacts'} imported</div>
            </div>
            <div style={{background:'#fff',border:'1px solid #86EFAC',borderRadius:9,padding:'12px 20px',minWidth:120}}>
              <div style={{fontSize:22,fontWeight:600,color:result.errors>0?'#E24B4A':'#065F46'}}>{result.errors}</div>
              <div style={{fontSize:11,color:'#64748B'}}>Errors</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            <Btn variant="outline" onClick={reset}>Import another file</Btn>
            <Btn onClick={()=>window.location.href='/em/clients'}>{false?'View Exhibitor Library':'View Contacts'}</Btn>
          </div>
        </div>
      )}
      <Toast toast={toast}/>
    </div>
  );
}
