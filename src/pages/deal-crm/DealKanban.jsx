import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../data/supabase.js';
import { useNavigate } from 'react-router-dom';

const d = {
  pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
  accent:'#059669', textDark:'#27500A', textMid:'#3B6D11',
  kpiBg:'#EDF7EA', badgeBg:'#DCFCE7', badgeText:'#166534',
};

function AddDealModal({ pipelines, onClose, onSaved }) {
  const [name,      setName]     = useState('');
  const [account,   setAccount]  = useState('');
  const [value,     setValue]    = useState('');
  const [closeDate, setCloseDate]= useState('');
  const [pipeline,  setPipeline] = useState(pipelines[0]?.id||'');
  const [accounts,  setAccounts] = useState([]);
  const [saving,    setSaving]   = useState(false);

  useEffect(() => {
    supabase.from('deal_accounts').select('id,name').order('name').then(({data})=>setAccounts(data||[]));
  }, []);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const pl = pipelines.find(p=>p.id===pipeline);
    const firstStage = pl?.stages?.[0]?.id || 'qualified';
    await supabase.from('deals').insert({
      name: name.trim(), account_id: account||null,
      value: value ? Number(value) : null, close_date: closeDate||null,
      stage: firstStage, pipeline_id: pipeline||null,
      last_activity: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', borderRadius:12, width:440, zIndex:401, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${d.border}`, fontSize:14, fontWeight:700, color:d.textDark }}>Add deal</div>
        <div style={{ padding:18, display:'flex', flexDirection:'column', gap:12 }}>
          {[
            ['Deal name *', <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. AI Strategy Consulting" style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />],
            ['Account', <select value={account} onChange={e=>setAccount(e.target.value)} style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, fontFamily:'inherit' }}>
              <option value="">Select account…</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>],
            ['Value (USD)', <input type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g. 50000" style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />],
            ['Close date', <input type="date" value={closeDate} onChange={e=>setCloseDate(e.target.value)} style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />],
            ['Pipeline', <select value={pipeline} onChange={e=>setPipeline(e.target.value)} style={{ width:'100%', border:`1px solid ${d.border}`, borderRadius:7, padding:'7px 10px', fontSize:13, fontFamily:'inherit' }}>
              {pipelines.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>],
          ].map(([label,el])=>(
            <div key={label}>
              <div style={{ fontSize:11, fontWeight:600, color:d.textMid, marginBottom:4 }}>{label}</div>
              {el}
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 18px', borderTop:`1px solid ${d.border}`, display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 14px', border:`1px solid ${d.border}`, borderRadius:7, fontSize:12, cursor:'pointer', background:'#fff', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ padding:'7px 18px', background:d.accent, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>
            {saving?'Saving…':'Create deal'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function DealKanban() {
  const navigate = useNavigate();
  const [pipeline,   setPipeline]   = useState(null);
  const [pipelines,  setPipelines]  = useState([]);
  const [dealsByStage, setDealsByStage] = useState({});
  const [fieldDefs,  setFieldDefs]  = useState([]);
  const [showModal,  setShowModal]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: pls }, { data: deals }, { data: fds }] = await Promise.all([
      supabase.from('deal_pipelines').select('*'),
      supabase.from('deals').select('id,name,value,stage,close_date,rotting,rotting_days,last_activity,custom_fields,deal_accounts(name,industry)').neq('stage','lost'),
      supabase.from('deal_custom_fields').select('*').eq('object_type','deal').order('position'),
    ]);
    setPipelines(pls||[]);
    setFieldDefs(fds||[]);
    const pl = pls?.[0];
    setPipeline(pl);
    const map = {};
    (pl?.stages||[]).forEach(s => { map[s.id] = []; });
    (deals||[]).forEach(d => { if (map[d.stage]) map[d.stage].push(d); else if (map['qualified']) map['qualified'].push(d); });
    setDealsByStage(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v||0}`;

  const cfBadge = (deal) => {
    const cf = deal.custom_fields || {};
    return fieldDefs.filter(f=>['dropdown'].includes(f.type) && cf[f.field_key]).slice(0,2).map(f=>({label:cf[f.field_key], field:f}));
  };

  const isRotting = deal => {
    if (!deal.last_activity) return true;
    return (new Date() - new Date(deal.last_activity)) / 86400000 > 14;
  };

  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((new Date() - new Date(dateStr)) / 86400000);
  };

  const stages = pipeline?.stages?.filter(s=>s.id!=='lost') || [];

  return (
    <div style={{ background:d.pageBg, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <div style={{ background:d.headerBg, borderBottom:`1px solid ${d.border}`, padding:'14px 20px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:d.badgeBg, color:d.badgeText }}>💼 Deal CRM</span>
          <span style={{ color:d.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:d.textDark }}>Deals</span>
        </div>
      </div>

      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${d.border}`, background:'#fff', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <select value={pipeline?.id||''} onChange={e=>{ const p=pipelines.find(x=>x.id===e.target.value); setPipeline(p); }}
          style={{ border:`1px solid ${d.border}`, borderRadius:7, padding:'5px 10px', fontSize:12, fontFamily:'inherit', background:d.kpiBg, color:d.textDark }}>
          {pipelines.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span style={{ fontSize:12, color:'#64748B' }}>{Object.values(dealsByStage).flat().length} deals</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={()=>setShowModal(true)}
            style={{ padding:'7px 14px', background:d.accent, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add deal
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowX:'auto', padding:'14px 16px' }}>
        {loading ? <div style={{ textAlign:'center', padding:40, color:'#94A3B8' }}>Loading…</div> : (
          <div style={{ display:'flex', gap:12, minHeight:'calc(100vh - 220px)' }}>
            {stages.map(stage => {
              const deals = dealsByStage[stage.id] || [];
              const isWon = stage.id === 'won';
              const totalVal = deals.reduce((s,d)=>s+(d.value||0),0);
              return (
                <div key={stage.id} style={{ width:220, flexShrink:0, background:'#fff', border:`1px solid ${isWon?'#A7D99F':d.border}`, borderRadius:10, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ padding:'8px 12px', borderBottom:`1px solid ${d.border}`, background:isWon?d.kpiBg:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:isWon?d.accent:d.textDark }}>{stage.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:10, color:'#94A3B8', background:'#F1F5F9', borderRadius:20, padding:'1px 6px' }}>{deals.length}</span>
                    </div>
                  </div>
                  {totalVal > 0 && <div style={{ padding:'4px 12px', fontSize:10, color:d.textMid, background:d.kpiBg, borderBottom:`1px solid ${d.border}` }}>{fmt(totalVal)}</div>}
                  <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
                    {deals.map(deal => {
                      const rot = isRotting(deal);
                      const ds = daysSince(deal.last_activity);
                      const badges = cfBadge(deal);
                      return (
                        <div key={deal.id} onClick={()=>navigate(`/deals/pipeline/${deal.id}`)}
                          style={{ background:rot?'#FFF8F8':'#F8FAFC', border:`1px solid ${rot?'#FCA5A5':d.border}`, borderRadius:7, padding:'9px 10px', cursor:'pointer' }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=d.accent}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=rot?'#FCA5A5':d.border}>
                          <div style={{ fontSize:11, fontWeight:700, color:d.textDark, marginBottom:2 }}>{deal.name}</div>
                          <div style={{ fontSize:10, color:'#64748B', marginBottom:5 }}>{deal.deal_accounts?.name||'—'}</div>
                          {badges.length > 0 && (
                            <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginBottom:5 }}>
                              {badges.map((b,i)=>(
                                <span key={i} style={{ padding:'1px 6px', borderRadius:20, fontSize:9, fontWeight:600, background:'#F5F3FF', color:'#534AB7' }}>{b.label}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:d.accent }}>{fmt(deal.value)}</span>
                            <span style={{ fontSize:9, color:'#94A3B8' }}>{deal.close_date?new Date(deal.close_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''}</span>
                          </div>
                          {rot && (
                            <div style={{ marginTop:5, paddingTop:5, borderTop:'1px solid #FCA5A5', fontSize:9, color:'#a32d2d', display:'flex', alignItems:'center', gap:3 }}>
                              🔥 Rotting · {ds}d no activity
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {deals.length === 0 && <div style={{ padding:12, textAlign:'center', fontSize:11, color:'#94A3B8' }}>No deals</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <AddDealModal pipelines={pipelines} onClose={()=>setShowModal(false)} onSaved={load} />}
    </div>
  );
}
