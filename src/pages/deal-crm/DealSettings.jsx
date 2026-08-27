import React, { useState, useEffect } from 'react';
import { supabase } from '../../data/supabase.js';

const d = {
  pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
  accent:'#059669', textDark:'#27500A', textMid:'#3B6D11',
  kpiBg:'#EDF7EA', badgeBg:'#DCFCE7', badgeText:'#166534',
};

const TYPE_LABELS = { dropdown:'Dropdown', text:'Free text', number:'Number', date:'Date', checkbox:'Checkbox' };

function Modal({ field, onClose, onSave }) {
  const [name,     setName]     = useState(field?.name     || '');
  const [type,     setType]     = useState(field?.type     || 'dropdown');
  const [object,   setObject]   = useState(field?.object_type || 'deal');
  const [required, setRequired] = useState(field?.required || false);
  const [opts,     setOpts]     = useState(field?.options  || []);
  const [newOpt,   setNewOpt]   = useState('');

  function addOpt() {
    if (!newOpt.trim()) return;
    setOpts(o => [...o, newOpt.trim()]);
    setNewOpt('');
  }

  function removeOpt(i) { setOpts(o => o.filter((_,j)=>j!==i)); }

  async function save() {
    if (!name.trim()) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const payload = { name:name.trim(), field_key:key, type, object_type:object, required, options:opts, position: field?.position||0 };
    if (field?.id) {
      await supabase.from('deal_custom_fields').update(payload).eq('id', field.id);
    } else {
      await supabase.from('deal_custom_fields').insert(payload);
    }
    onSave();
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:400 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', borderRadius:14, width:500, maxHeight:'85vh', overflowY:'auto', zIndex:401, boxShadow:'0 12px 40px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${d.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:15, fontWeight:700, color:d.textDark }}>{field?.id ? 'Edit field' : 'Add custom field'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#64748B' }}>✕</button>
        </div>
        <div style={{ padding:20 }}>
          {[
            ['Field name', <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Practice Area" style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none' }} />],
            ['Field type', <select value={type} onChange={e=>setType(e.target.value)} style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'8px 10px', fontSize:13, fontFamily:'inherit' }}>
              {Object.entries(TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>],
            ['Apply to', <select value={object} onChange={e=>setObject(e.target.value)} style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'8px 10px', fontSize:13, fontFamily:'inherit' }}>
              <option value="deal">Deal</option><option value="lead">Lead</option><option value="account">Account</option>
            </select>],
          ].map(([label, el]) => (
            <div key={label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:d.textMid, marginBottom:5 }}>{label}</div>
              {el}
            </div>
          ))}

          {type === 'dropdown' && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:d.textMid, marginBottom:5 }}>Dropdown options</div>
              <div style={{ border:`1px solid ${d.border}`, borderRadius:7, overflow:'hidden', marginBottom:8 }}>
                {opts.length === 0 ? (
                  <div style={{ padding:'10px 12px', fontSize:12, color:'#94A3B8' }}>No options yet — add below</div>
                ) : opts.map((o,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:`1px solid ${d.border}` }}>
                    <div style={{ flex:1, fontSize:13 }}>{o}</div>
                    <button onClick={()=>removeOpt(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#a32d2d', fontSize:16 }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={newOpt} onChange={e=>setNewOpt(e.target.value)} placeholder="Type new option…"
                  onKeyDown={e => e.key==='Enter' && addOpt()}
                  style={{ flex:1, border:`1px solid ${d.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, fontFamily:'inherit', outline:'none' }} />
                <button onClick={addOpt} style={{ padding:'7px 14px', background:d.accent, color:'#fff', border:'none', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>+ Add</button>
              </div>
            </div>
          )}

          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
            <input type="checkbox" checked={required} onChange={e=>setRequired(e.target.checked)} />
            Required field
          </label>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${d.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'7px 16px', border:`1px solid ${d.border}`, borderRadius:7, fontSize:12, cursor:'pointer', background:'#fff', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={save}    style={{ padding:'7px 16px', background:d.accent, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save field</button>
        </div>
      </div>
    </>
  );
}

export default function DealSettings() {
  const [fields,   setFields]   = useState([]);
  const [tab,      setTab]      = useState('deal');
  const [modal,    setModal]    = useState(null); // null | 'new' | field object
  const [pipelines,setPipelines]= useState([]);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),2500); };

  async function load() {
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from('deal_custom_fields').select('*').order('position'),
      supabase.from('deal_pipelines').select('*'),
    ]);
    setFields(f||[]);
    setPipelines(p||[]);
  }

  useEffect(() => { load(); }, []);

  async function deleteField(id) {
    if (!window.confirm('Delete this field?')) return;
    await supabase.from('deal_custom_fields').delete().eq('id', id);
    showToast('Field deleted');
    load();
  }

  const filtered = fields.filter(f => f.object_type === tab);

  return (
    <div style={{ background:d.pageBg, minHeight:'100vh' }}>
      <div style={{ background:d.headerBg, borderBottom:`1px solid ${d.border}`, padding:'14px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:d.badgeBg, color:d.badgeText }}>💼 Deal CRM</span>
          <span style={{ color:d.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:d.textDark }}>Settings</span>
        </div>
        <div style={{ fontSize:11, color:d.textMid }}>Custom fields · stage templates · users · email sync</div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* Custom fields */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:d.textDark }}>Custom fields</div>
            <div style={{ fontSize:12, color:d.textMid, marginTop:2 }}>Define extra fields for deals, leads, and accounts</div>
          </div>
          <button onClick={()=>setModal('new')}
            style={{ padding:'8px 16px', background:d.accent, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add field
          </button>
        </div>

        {/* Object tabs */}
        <div style={{ display:'flex', background:d.kpiBg, borderRadius:8, padding:3, gap:2, width:'fit-content', marginBottom:16 }}>
          {['deal','lead','account'].map(t => (
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:'5px 14px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:tab===t?d.accent:'transparent', color:tab===t?'#fff':d.textMid, fontFamily:'inherit', textTransform:'capitalize' }}>
              {t === 'deal' ? 'Deals' : t === 'lead' ? 'Leads' : 'Accounts'}
            </button>
          ))}
        </div>

        {/* Fields table */}
        <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden', marginBottom:24 }}>
          {/* Header row */}
          <div style={{ display:'grid', gridTemplateColumns:'180px 120px 80px 1fr 80px', gap:12, padding:'8px 14px', background:d.kpiBg, borderBottom:`1px solid ${d.border}` }}>
            {['Field name','Type','Required','Options',''].map(h=>(
              <div key={h} style={{ fontSize:9, color:d.textMid, fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em' }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#94A3B8', fontSize:13 }}>
              No custom fields for this object. Click "Add field" to create one.
            </div>
          ) : filtered.map(f => (
            <div key={f.id} style={{ display:'grid', gridTemplateColumns:'180px 120px 80px 1fr 80px', gap:12, padding:'10px 14px', borderBottom:`1px solid #F1F5F9`, alignItems:'center' }}
              onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:d.textDark }}>{f.name}</div>
                <div style={{ fontSize:10, color:'#94A3B8' }}>{f.field_key}</div>
              </div>
              <div>
                <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:d.kpiBg, color:d.textMid }}>
                  {TYPE_LABELS[f.type]||f.type}
                </span>
              </div>
              <div style={{ fontSize:12, color:f.required?'#a32d2d':'#94A3B8' }}>{f.required?'Yes':'No'}</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {(f.options||[]).slice(0,4).map((o,i)=>(
                  <span key={i} style={{ padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:600, background:'#F5F3FF', color:'#534AB7' }}>{o}</span>
                ))}
                {(f.options||[]).length > 4 && <span style={{ fontSize:10, color:'#94A3B8' }}>+{f.options.length-4} more</span>}
              </div>
              <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                <button onClick={()=>setModal(f)} style={{ padding:'4px 8px', border:`1px solid ${d.border}`, borderRadius:6, fontSize:11, cursor:'pointer', background:'#fff', fontFamily:'inherit' }}>Edit</button>
                <button onClick={()=>deleteField(f.id)} style={{ padding:'4px 8px', border:'1px solid #FCA5A5', borderRadius:6, fontSize:11, cursor:'pointer', background:'#FEF2F2', color:'#a32d2d', fontFamily:'inherit' }}>Del</button>
              </div>
            </div>
          ))}
        </div>

        {/* Stage templates */}
        <div style={{ fontSize:16, fontWeight:700, color:d.textDark, marginBottom:12 }}>Stage templates</div>
        <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden', marginBottom:24 }}>
          {pipelines.map((p,i) => (
            <div key={p.id} style={{ padding:'12px 16px', borderBottom:i<pipelines.length-1?`1px solid #F1F5F9`:'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:d.textDark }}>{p.name} {p.is_default && <span style={{ fontSize:10, background:d.badgeBg, color:d.badgeText, padding:'1px 7px', borderRadius:20, marginLeft:6 }}>Default</span>}</div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{(p.stages||[]).filter(s=>!['won','lost'].includes(s.id)).length} active stages</div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(p.stages||[]).filter(s=>!['won','lost'].includes(s.id)).map(s=>(
                  <span key={s.id} style={{ padding:'2px 8px', borderRadius:20, fontSize:10, background:d.kpiBg, color:d.textMid }}>{s.name}</span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ padding:'10px 16px', borderTop:`1px solid #F1F5F9` }}>
            <button style={{ padding:'6px 14px', background:d.accent, color:'#fff', border:'none', borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>+ New template</button>
          </div>
        </div>

        {/* Email sync */}
        <div style={{ fontSize:16, fontWeight:700, color:d.textDark, marginBottom:12 }}>Email sync</div>
        <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
          {[
            ['Microsoft 365 / Outlook', 'Two-way email sync via Microsoft SSO', 'Connect'],
            ['Smart BCC address',       'BCC deals-crm@emindsscale.com to log emails', 'Copy'],
            ['Gmail / Google Workspace','Connect via Google OAuth', 'Connect'],
          ].map(([label,sub,action])=>(
            <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid #F1F5F9` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{label}</div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{sub}</div>
              </div>
              <button style={{ padding:'6px 14px', border:`1px solid ${d.border}`, borderRadius:7, fontSize:12, cursor:'pointer', background:'#fff', fontFamily:'inherit', color:d.accent }}>{action}</button>
            </div>
          ))}
        </div>
      </div>

      {modal && <Modal field={modal==='new'?null:modal} onClose={()=>setModal(null)} onSave={()=>{showToast('Field saved ✓');load();}} />}
      {toast && <div style={{ position:'fixed', bottom:20, right:20, background:'#0F172A', color:'#fff', padding:'10px 16px', borderRadius:8, fontSize:12, zIndex:999 }}>{toast}</div>}
    </div>
  );
}
