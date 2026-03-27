import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../data/supabase.js';
import { upsertClient, deleteClient, upsertContact, deleteContact } from '../data/api.js';
import { Modal, Btn, Toast } from '../components/ui/UI.jsx';

const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina","Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","UAE","Uganda","Ukraine","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = search ? COUNTRIES.filter(c=>c.toLowerCase().includes(search.toLowerCase())) : COUNTRIES;
  return (
    <div style={{position:'relative'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{color:value?'#0F172A':'#94A3B8'}}>{value||'Select country...'}</span>
        <span style={{color:'#94A3B8',fontSize:9}}>▼</span>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'100%',left:0,zIndex:600,background:'#fff',border:'1px solid #E4E8F0',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,.12)',minWidth:220,maxHeight:260,display:'flex',flexDirection:'column'}}>
          <div style={{padding:'6px 8px',borderBottom:'1px solid #F1F5F9',flexShrink:0}}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search country..." style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:5,padding:'4px 8px',fontSize:11,fontFamily:'inherit',outline:'none'}}/>
          </div>
          <div style={{overflowY:'auto',flex:1}}>
            <div onClick={()=>{onChange('');setOpen(false);setSearch('');}} style={{padding:'7px 12px',fontSize:11,cursor:'pointer',color:'#94A3B8',borderBottom:'1px solid #F1F5F9'}}>None</div>
            {filtered.map(c=>(
              <div key={c} onClick={()=>{onChange(c);setOpen(false);setSearch('');}} style={{padding:'7px 12px',fontSize:11,cursor:'pointer',background:value===c?'#EFF6FF':'transparent',color:value===c?'#0D1F3C':'#475569',fontWeight:value===c?600:400}}>{c}</div>
            ))}
          </div>
        </div>
      )}
      {open&&<div style={{position:'fixed',inset:0,zIndex:599}} onClick={()=>{setOpen(false);setSearch('');}}/>}
    </div>
  );
}

function ClientModal({ client, onClose, onSave }) {
  const isNew = !client?.id;
  const [form, setForm] = useState(client || { company:'', industry:'', website:'', country:'', city:'', company_size:'', source:'', notes:'', status:'prospect' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function save() {
    if (!form.company.trim()) return;
    setSaving(true);
    try {
      await upsertClient(form);
      onSave();
      onClose();
    } catch(e) {
      alert('Error saving: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const F = (label, key, type='text', opts) => (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>{label}</div>
      {opts ? (
        <select value={form[key]||''} onChange={e=>set(key,e.target.value)} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit',background:'#fff'}}>
          <option value=''>Select...</option>
          {opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]||''} onChange={e=>set(key,e.target.value)} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit'}}/>
      )}
    </div>
  );

  return (
    <Modal title={isNew?'Add client':'Edit client'} onClose={onClose} width={540}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1'}}>{F('Company name *','company')}</div>
        {F('Industry','industry')}
        {F('Website','website')}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Country</div>
          <CountrySelect value={form.country||''} onChange={v=>set('country',v)}/>
        </div>
        {F('City','city')}
        {F('Company size','company_size')}
        {F('Source','source')}
        {F('Status','status','text',['prospect','active','inactive'])}
        <div style={{gridColumn:'1/-1'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Notes</div>
          <textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} rows={3} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit',resize:'vertical'}}/>
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving||!form.company.trim()}>{saving?'Saving...':isNew?'Add client':'Save'}</Btn>
      </div>
    </Modal>
  );
}

function ContactModal({ contact, clientId, onClose, onSave }) {
  const isNew = !contact?.id;
  const [form, setForm] = useState(contact || { name:'', role:'', email:'', phone:'', linkedin:'', is_primary:false, client_id: clientId });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await upsertContact({...form, client_id: clientId}); onSave(); onClose(); }
    catch(e) { alert('Error: '+e.message); }
    finally { setSaving(false); }
  }

  const F = (label, key, type='text') => (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>{label}</div>
      <input type={type} value={form[key]||''} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit'}}/>
    </div>
  );

  return (
    <Modal title={isNew?'Add contact':'Edit contact'} onClose={onClose} width={480}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1'}}>{F('Full name *','name')}</div>
        {F('Role / Title','role')}
        {F('Email','email','email')}
        {F('Phone','phone')}
        {F('LinkedIn URL','linkedin')}
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,gridColumn:'1/-1'}}>
          <input type="checkbox" checked={form.is_primary||false} onChange={e=>setForm(f=>({...f,is_primary:e.target.checked}))}/>
          Primary contact for this client
        </label>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving||!form.name.trim()}>{saving?'Saving...':isNew?'Add contact':'Save'}</Btn>
      </div>
    </Modal>
  );
}

function ImportModal({ onClose, onDone }) {
  const fileRef = useRef();
  const [step,      setStep]      = useState(1);
  const [mode,      setMode]      = useState('contacts'); // 'clients' | 'contacts'
  const [rows,      setRows]      = useState([]);
  const [headers,   setHeaders]   = useState([]);
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);

  function isApollo(hdrs) {
    const j = hdrs.join(',').toLowerCase();
    return j.includes('apollo contact id') || j.includes('person linkedin url') || j.includes('first name');
  }

  function parseCSV(str) {
    const results = [];
    const lines = str.replace(/\r/g, '').split('\n');
    for (let li=0; li<lines.length; li++) {
      const line = lines[li];
      if (!line.trim()) continue;
      const row = []; let inQ=false, cell='';
      for (let i=0; i<line.length; i++) {
        const ch=line[i];
        if (ch==='"') { if(inQ&&line[i+1]==='"'){cell+='"';i++;}else inQ=!inQ; }
        else if (ch===','&&!inQ) { row.push(cell.trim()); cell=''; }
        else cell+=ch;
      }
      row.push(cell.trim());
      results.push(row);
    }
    return results;
  }

  async function handleFile(f) {
    if (!f) return;
    try {
      let hdrs=[], allRows=[];
      const ext = f.name.split('.').pop().toLowerCase();
      if (ext==='csv') {
        const parsed = parseCSV(await f.text());
        hdrs = parsed[0].map(h=>h.replace(/^"+|"+$/g,'').trim());
        allRows = parsed.slice(1).map(r=>r.map(v=>v.replace(/^"+|"+$/g,'').trim()));
      } else {
        const buf = await f.arrayBuffer();
        const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
        const wb = XLSX.read(buf,{type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws,{header:1});
        hdrs = data[0].map(h=>String(h||'').trim());
        allRows = data.slice(1).map(r=>hdrs.map((_,i)=>String(r[i]||'').trim()));
      }
      setHeaders(hdrs);
      const apollo = isApollo(hdrs);
      const detectedMode = apollo ? 'contacts' : 'clients';
      setMode(detectedMode);

      if (apollo) {
        // Apollo contacts import
        const parsed = allRows.filter(r=>r.some(Boolean)).map(r=>{
          const get = (exact) => { const i=hdrs.findIndex(h=>h.toLowerCase()===exact.toLowerCase()); return i>=0?String(r[i]||'').trim():''; };
          const fn=get('First Name'), ln=get('Last Name');
          const phone=(get('First Phone')||get('Work Direct Phone')||get('Corporate Phone')).replace(/^'+/,'');
          return {
            name: (fn+' '+ln).trim() || null,
            role: get('Title')||null,
            email: get('Email')||null,
            phone: phone||null,
            linkedin: get('Person Linkedin Url')||null,
            _company: get('Company')||null,
            _country: get('Country')||null,
          };
        }).filter(r=>r.name||r.email);
        setRows(parsed);
      } else {
        // Company list import
        const hl = hdrs.map(h=>h.toLowerCase());
        const get = (row,...keys) => { for(const k of keys){ const i=hl.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return String(row[i]).trim(); } return ''; };
        const parsed = allRows.filter(r=>r.some(Boolean)).map(r=>({
          company: get(r,'company','organisation','account')||'',
          industry: get(r,'industry','sector')||null,
          website: get(r,'website','domain')||null,
          country: get(r,'country')||null,
          city: get(r,'city')||null,
          source: get(r,'source')||null,
          status: 'prospect',
        })).filter(r=>r.company);
        setRows(parsed);
      }
      setStep(2);
    } catch(e) { alert('Error reading file: '+e.message); }
  }

  async function doImport() {
    setImporting(true);
    let imported=0, errors=0;

    if (mode==='contacts') {
      // For each contact, find or create the client, then insert contact
      const companyMap = {};
      // Load existing clients
      const {data:existing} = await supabase.from('clients').select('id,company');
      (existing||[]).forEach(c=>{ companyMap[c.company.toLowerCase().trim()] = c.id; });

      for (const row of rows) {
        try {
          const {name,role,email,phone,linkedin,_company,_country} = row;
          let clientId = null;
          if (_company) {
            const key = _company.toLowerCase().trim();
            if (companyMap[key]) {
              clientId = companyMap[key];
            } else {
              // Create new client
              const {data:newClient} = await supabase.from('clients')
                .insert({company:_company, country:_country||null, status:'prospect'})
                .select().single();
              if (newClient) { clientId=newClient.id; companyMap[key]=newClient.id; }
            }
          }
          if (name||email) {
            await supabase.from('contacts').insert({client_id:clientId, name:name||email, role, email, phone, linkedin, is_primary:false});
            imported++;
          }
        } catch(e) { errors++; }
        await new Promise(r=>setTimeout(r,20));
      }
    } else {
      const BATCH=50;
      for(let i=0;i<rows.length;i+=BATCH){
        const batch=rows.slice(i,i+BATCH);
        try{ const {error}=await supabase.from('clients').insert(batch); if(error){errors+=batch.length;}else{imported+=batch.length;} }
        catch(e){errors+=batch.length;}
        await new Promise(r=>setTimeout(r,60));
      }
    }

    setResult({imported,errors,mode});
    setImporting(false);
    setStep(3);
  }

  const previewCols = mode==='contacts'
    ? ['name','role','email','phone','_company']
    : ['company','country','industry'];

  return (
    <Modal title="Import" onClose={onClose} width={560}>
      {step===1&&(
        <div>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <div onClick={()=>setMode('contacts')} style={{flex:1,padding:'12px',background:mode==='contacts'?'#EFF6FF':'#fff',border:'1px solid '+(mode==='contacts'?'#0D1F3C':'#E4E8F0'),borderRadius:9,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:20,marginBottom:4}}>👤</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0D1F3C'}}>Contacts</div>
              <div style={{fontSize:10,color:'#64748B'}}>Apollo CSV with names & emails</div>
            </div>
            <div onClick={()=>setMode('clients')} style={{flex:1,padding:'12px',background:mode==='clients'?'#EFF6FF':'#fff',border:'1px solid '+(mode==='clients'?'#0D1F3C':'#E4E8F0'),borderRadius:9,cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:20,marginBottom:4}}>🏢</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0D1F3C'}}>Companies</div>
              <div style={{fontSize:10,color:'#64748B'}}>List of company names</div>
            </div>
          </div>
          <div style={{border:'2px dashed #D0D7E5',borderRadius:10,padding:32,textAlign:'center',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>
            <div style={{fontSize:28,marginBottom:8}}>↑</div>
            <div style={{fontSize:13,fontWeight:700,color:'#0D1F3C',marginBottom:4}}>Drop your file here</div>
            <div style={{fontSize:11,color:'#64748B'}}>Excel (.xlsx) or CSV — auto-detected</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>
        </div>
      )}
      {step===2&&(
        <div>
          <div style={{background:'#F8FAFC',border:'1px solid #E4E8F0',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12}}>
            <strong>{rows.length}</strong> {mode==='contacts'?'contacts':'companies'} detected · importing as <strong>{mode==='contacts'?'Contacts (linked to clients)':'Companies'}</strong>
          </div>
          <div style={{maxHeight:240,overflowY:'auto',border:'1px solid #E4E8F0',borderRadius:8,marginBottom:14}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead><tr>{previewCols.map(h=><th key={h} style={{padding:'6px 10px',background:'#F8FAFC',borderBottom:'1px solid #E4E8F0',textAlign:'left',fontSize:9,textTransform:'uppercase',color:'#64748B',fontWeight:600}}>{h.replace('_','')}</th>)}</tr></thead>
              <tbody>{rows.slice(0,8).map((r,i)=>(
                <tr key={i}>{previewCols.map(col=>(
                  <td key={col} style={{padding:'6px 10px',borderBottom:'1px solid #F1F5F9',color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:120}}>{r[col]||'—'}</td>
                ))}</tr>
              ))}</tbody>
            </table>
            {rows.length>8&&<div style={{padding:'6px 10px',fontSize:11,color:'#94A3B8',textAlign:'center'}}>...and {rows.length-8} more</div>}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Btn variant="outline" onClick={()=>setStep(1)}>Back</Btn>
            <Btn onClick={doImport} disabled={importing}>{importing?'Importing...':'Import '+rows.length+(mode==='contacts'?' contacts':' companies')}</Btn>
          </div>
        </div>
      )}
      {step===3&&result&&(
        <div style={{textAlign:'center',padding:24}}>
          <div style={{fontSize:36,marginBottom:12}}>✓</div>
          <div style={{fontSize:16,fontWeight:700,color:'#065F46',marginBottom:8}}>Import complete</div>
          <div style={{fontSize:13,color:'#64748B',marginBottom:20}}>{result.imported} {result.mode==='contacts'?'contacts':'companies'} imported · {result.errors} errors</div>
          <Btn onClick={()=>{onDone();onClose();}}>Done</Btn>
        </div>
      )}
    </Modal>
  );
}

function ClientRow({ client, onEdit, onDelete, onRefresh }) {
  const [expanded,       setExpanded]       = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editContact,    setEditContact]    = useState(null);
  const primary = client.contacts?.find(c=>c.is_primary) || client.contacts?.[0];
  const statusColors = { active:'#065F46', inactive:'#991B1B', prospect:'#92600A' };
  const statusBg    = { active:'#ECFDF5', inactive:'#FEF2F2', prospect:'#FFFBEB' };

  return (
    <>
      <tr onClick={()=>setExpanded(e=>!e)} style={{cursor:'pointer'}}>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{client.company}</td>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B'}}>{primary?.name||'—'}</td>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{primary?.email||'—'}</td>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B'}}>{client.country||'—'}</td>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B'}}>{client.industry||'—'}</td>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9'}}>
          <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:statusBg[client.status]||'#F1F5F9',color:statusColors[client.status]||'#475569'}}>{client.status}</span>
        </td>
        <td style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9'}}>
          <div style={{display:'flex',gap:4}}>
            <button onClick={e=>{e.stopPropagation();onEdit(client);}} style={{padding:'2px 8px',border:'1px solid #E4E8F0',borderRadius:5,fontSize:10,cursor:'pointer',background:'#F8FAFC',fontFamily:'inherit'}}>Edit</button>
            <button onClick={e=>{e.stopPropagation();onDelete(client.id);}} style={{padding:'2px 8px',border:'1px solid #FCA5A5',borderRadius:5,fontSize:10,cursor:'pointer',background:'#FEF2F2',color:'#991B1B',fontFamily:'inherit'}}>Del</button>
          </div>
        </td>
      </tr>
      {expanded&&(
        <tr>
          <td colSpan={7} style={{padding:'12px 16px',background:'#F8FAFC',borderBottom:'1px solid #E4E8F0'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0D1F3C',marginBottom:8}}>Contacts at {client.company}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              {(client.contacts||[]).map(c=>(
                <div key={c.id} style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:8,padding:'8px 12px',minWidth:200}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#0D1F3C',marginBottom:2}}>{c.name}{c.is_primary&&<span style={{marginLeft:6,fontSize:9,background:'#EFF6FF',color:'#0C447C',padding:'1px 6px',borderRadius:20,fontWeight:700}}>PRIMARY</span>}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>{c.role||'—'}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>{c.email||'—'}</div>
                  <div style={{fontSize:11,color:'#64748B'}}>{c.phone||'—'}</div>
                  <div style={{display:'flex',gap:4,marginTop:6}}>
                    <button onClick={()=>setEditContact(c)} style={{padding:'2px 7px',border:'1px solid #E4E8F0',borderRadius:4,fontSize:9,cursor:'pointer',background:'#fff',fontFamily:'inherit'}}>Edit</button>
                    <button onClick={async()=>{await deleteContact(c.id);onRefresh();}} style={{padding:'2px 7px',border:'1px solid #FCA5A5',borderRadius:4,fontSize:9,cursor:'pointer',background:'#FEF2F2',color:'#991B1B',fontFamily:'inherit'}}>Del</button>
                  </div>
                </div>
              ))}
              <div onClick={()=>setShowAddContact(true)} style={{background:'#fff',border:'1px dashed #D0D7E5',borderRadius:8,padding:'8px 12px',minWidth:120,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:11,color:'#94A3B8'}}>+ Add contact</div>
            </div>
            {client.notes&&<div style={{fontSize:11,color:'#64748B',background:'#fff',border:'1px solid #E4E8F0',borderRadius:6,padding:'8px 10px'}}>{client.notes}</div>}
          </td>
        </tr>
      )}
      {showAddContact&&<ContactModal clientId={client.id} contact={null} onClose={()=>setShowAddContact(false)} onSave={()=>{setShowAddContact(false);onRefresh();}}/>}
      {editContact&&<ContactModal clientId={client.id} contact={editContact} onClose={()=>setEditContact(null)} onSave={()=>{setEditContact(null);onRefresh();}}/>}
    </>
  );
}

export default function ClientsPage() {
  const [clients,   setClients]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [sortField, setSortField] = useState('company');
  const [sortAsc,   setSortAsc]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [showImport,setShowImport]= useState(false);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('clients')
        .select('*, contacts(id,name,role,email,phone,linkedin,is_primary)')
        .order(sortField, {ascending:sortAsc});
      if (search) q = q.ilike('company','%'+search+'%');
      if (status) q = q.eq('status', status);
      const {data,error} = await q;
      if (error) throw error;
      setClients(data||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, status, sortField, sortAsc]);

  useEffect(()=>{ load(); },[load]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this client and all their contacts?')) return;
    try { await deleteClient(id); showToast('Client deleted'); load(); }
    catch(e) { showToast('Delete failed','error'); }
  }

  function toggleSort(field) {
    if (sortField===field) setSortAsc(a=>!a);
    else { setSortField(field); setSortAsc(true); }
  }

  const activeCount   = clients.filter(c=>c.status==='active').length;
  const prospectCount = clients.filter(c=>c.status==='prospect').length;

  const SortIcon = ({field}) => sortField!==field
    ? <span style={{color:'#D0D7E5',marginLeft:3}}>↕</span>
    : <span style={{color:'#0D1F3C',marginLeft:3}}>{sortAsc?'↑':'↓'}</span>;

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {[['Total clients',clients.length,'#0D1F3C'],['Active',activeCount,'#065F46'],['Prospects',prospectCount,'#92600A']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:9,padding:'10px 14px',flex:1,minWidth:100}}>
            <div style={{fontSize:10,color:'#64748B',marginBottom:3,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</div>
            <div style={{fontSize:19,fontWeight:600,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients..." style={{flex:1,minWidth:180,border:'1px solid #D0D7E5',borderRadius:8,padding:'6px 12px',fontSize:12,fontFamily:'inherit'}}/>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{border:'1px solid #D0D7E5',borderRadius:7,padding:'5px 9px',fontSize:11,background:'#fff'}}>
          <option value=''>All statuses</option>
          {['active','prospect','inactive'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <button onClick={()=>setShowImport(true)} style={{padding:'6px 12px',border:'1px solid #D0D7E5',borderRadius:7,fontSize:11,cursor:'pointer',background:'#fff',fontFamily:'inherit',fontWeight:500}}>↑ Import</button>
        <button onClick={()=>setModal('new')} style={{padding:'6px 14px',background:'#0D1F3C',color:'#C9A84C',border:'none',borderRadius:7,fontSize:12,cursor:'pointer',fontWeight:600,fontFamily:'inherit'}}>+ Add client</button>
        <span style={{fontSize:12,color:'#64748B',marginLeft:'auto'}}>{clients.length} clients</span>
      </div>

      <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,tableLayout:'fixed'}}>
          <thead><tr>
            {[['Company','company'],['Primary Contact',''],['Email',''],['Country','country'],['Industry','industry'],['Status','status'],['','']].map(([h,field])=>(
              <th key={h} onClick={()=>field&&toggleSort(field)}
                style={{padding:'8px 12px',background:'#F8FAFC',borderBottom:'1px solid #E4E8F0',textAlign:'left',fontSize:9,letterSpacing:'.07em',textTransform:'uppercase',color:sortField===field?'#0D1F3C':'#64748B',fontWeight:600,cursor:field?'pointer':'default',whiteSpace:'nowrap'}}>
                {h}{field?<SortIcon field={field}/>:null}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#94A3B8'}}>Loading...</td></tr>
            : clients.length===0 ? (
              <tr><td colSpan={7} style={{padding:48,textAlign:'center',color:'#94A3B8'}}>
                <div style={{fontSize:24,marginBottom:8}}>○</div>
                <div style={{fontSize:13,fontWeight:600,color:'#475569',marginBottom:4}}>No clients yet</div>
                <div style={{fontSize:11,marginBottom:16}}>Add your first client or import from Excel</div>
                <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                  <button onClick={()=>setShowImport(true)} style={{padding:'6px 14px',border:'1px solid #D0D7E5',borderRadius:7,fontSize:12,cursor:'pointer',background:'#fff',fontFamily:'inherit'}}>↑ Import Excel</button>
                  <button onClick={()=>setModal('new')} style={{padding:'6px 14px',background:'#0D1F3C',color:'#C9A84C',border:'none',borderRadius:7,fontSize:12,cursor:'pointer',fontWeight:600,fontFamily:'inherit'}}>+ Add client</button>
                </div>
              </td></tr>
            ) : clients.map(c=>(
              <ClientRow key={c.id} client={c} onEdit={cl=>setModal(cl)} onDelete={handleDelete} onRefresh={load}/>
            ))}
          </tbody>
        </table>
      </div>

      {modal&&<ClientModal client={modal==='new'?null:modal} onClose={()=>setModal(null)} onSave={()=>{load();showToast(modal==='new'?'Client added':'Client updated');}}/>}
      {showImport&&<ImportModal onClose={()=>setShowImport(false)} onDone={load}/>}
      <Toast toast={toast}/>
    </div>
  );
}
