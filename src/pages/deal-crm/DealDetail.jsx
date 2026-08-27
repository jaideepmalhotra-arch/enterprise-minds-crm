import React, { useState, useEffect } from 'react';
import { supabase } from '../../data/supabase.js';
import { useParams, useNavigate } from 'react-router-dom';

const d = {
  pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
  accent:'#059669', textDark:'#27500A', textMid:'#3B6D11',
  kpiBg:'#EDF7EA', badgeBg:'#DCFCE7', badgeText:'#166534',
};

const ACT_ICONS  = { email:'✉', call:'📞', meeting:'📅', note:'📝', task:'✓', demo:'🖥' };
const ACT_COLORS = { email:d.kpiBg, call:'#ECFDF5', meeting:'#FFFBEB', note:'#F1F5F9', task:'#FFFBEB', demo:d.kpiBg };

function LogActivityModal({ dealId, onClose, onSaved }) {
  const [type,  setType]  = useState('call');
  const [title, setTitle] = useState('');
  const [body,  setBody]  = useState('');
  const [due,   setDue]   = useState('');
  const [saving,setSaving]= useState(false);

  async function save() {
    setSaving(true);
    await supabase.from('deal_activities').insert({ deal_id:dealId, type, title:title||type, body, due_at:due||null, done:type!=='task' });
    await supabase.from('deals').update({ last_activity:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',dealId);
    setSaving(false); onSaved(); onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:400 }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',borderRadius:12,width:420,zIndex:401,overflow:'hidden' }}>
        <div style={{ padding:'14px 18px',borderBottom:`1px solid ${d.border}`,fontSize:14,fontWeight:700,color:d.textDark }}>Log activity</div>
        <div style={{ padding:18,display:'flex',flexDirection:'column',gap:12 }}>
          <div>
            <div style={{ fontSize:11,fontWeight:600,color:d.textMid,marginBottom:6 }}>Type</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {Object.keys(ACT_ICONS).map(t=>(
                <button key={t} onClick={()=>setType(t)}
                  style={{ padding:'5px 12px',borderRadius:20,fontSize:11,border:`1px solid ${type===t?d.accent:d.border}`,background:type===t?d.kpiBg:'#fff',color:type===t?d.accent:'#64748B',cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize' }}>
                  {ACT_ICONS[t]} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11,fontWeight:600,color:d.textMid,marginBottom:4 }}>Title</div>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`e.g. Discovery call with CTO`}
              style={{ width:'100%',border:`1px solid ${d.border}`,borderRadius:7,padding:'7px 10px',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize:11,fontWeight:600,color:d.textMid,marginBottom:4 }}>Notes</div>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={3} placeholder="Outcome, key points…"
              style={{ width:'100%',border:`1px solid ${d.border}`,borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box' }} />
          </div>
          {type==='task' && (
            <div>
              <div style={{ fontSize:11,fontWeight:600,color:d.textMid,marginBottom:4 }}>Due date</div>
              <input type="date" value={due} onChange={e=>setDue(e.target.value)}
                style={{ width:'100%',border:`1px solid ${d.border}`,borderRadius:7,padding:'7px 10px',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }} />
            </div>
          )}
        </div>
        <div style={{ padding:'10px 18px',borderTop:`1px solid ${d.border}`,display:'flex',gap:8,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 14px',border:`1px solid ${d.border}`,borderRadius:7,fontSize:12,cursor:'pointer',background:'#fff',fontFamily:'inherit' }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ padding:'7px 16px',background:d.accent,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
            {saving?'Saving…':'Log activity'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal,       setDeal]       = useState(null);
  const [activities, setActivities] = useState([]);
  const [fieldDefs,  setFieldDefs]  = useState([]);
  const [pipeline,   setPipeline]   = useState(null);
  const [contacts,   setContacts]   = useState([]);
  const [showLog,    setShowLog]    = useState(false);
  const [loading,    setLoading]    = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: deal }, { data: acts }, { data: fds }, { data: cons }] = await Promise.all([
      supabase.from('deals').select('*,deal_accounts(id,name,website,industry,country,size)').eq('id',id).single(),
      supabase.from('deal_activities').select('*').eq('deal_id',id).order('created_at',{ascending:false}),
      supabase.from('deal_custom_fields').select('*').eq('object_type','deal').order('position'),
      supabase.from('deal_contacts').select('*,leads(contact,role,email,phone,linkedin)').eq('deal_id',id),
    ]);
    setDeal(deal);
    setActivities(acts||[]);
    setFieldDefs(fds||[]);
    setContacts(cons||[]);
    if (deal?.pipeline_id) {
      const { data: pl } = await supabase.from('deal_pipelines').select('*').eq('id',deal.pipeline_id).single();
      setPipeline(pl);
    }
    setLoading(false);
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function moveStage(stageId) {
    await supabase.from('deals').update({ stage:stageId, updated_at:new Date().toISOString() }).eq('id',id);
    setDeal(d => ({...d, stage:stageId}));
  }

  const fmt = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v||0}`;
  const daysSince = ds => ds ? Math.floor((new Date()-new Date(ds))/86400000) : null;
  const stages = pipeline?.stages?.filter(s=>!['lost'].includes(s.id)) || [];
  const stageIdx = stages.findIndex(s=>s.id===deal?.stage);

  function renderCFValue(def, val) {
    if (val === undefined || val === null || val === '') return <span style={{ color:'#94A3B8' }}>—</span>;
    switch(def.type) {
      case 'checkbox': return val ? <span style={{ color:d.accent }}>✓ Yes</span> : <span style={{ color:'#94A3B8' }}>No</span>;
      case 'dropdown': return <span style={{ padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:'#F5F3FF',color:'#534AB7' }}>{val}</span>;
      default: return <span>{val}</span>;
    }
  }

  if (loading) return <div style={{ padding:40,textAlign:'center',color:'#94A3B8' }}>Loading deal…</div>;
  if (!deal)   return <div style={{ padding:40,textAlign:'center',color:'#94A3B8' }}>Deal not found</div>;

  const cf = deal.custom_fields || {};
  const ds = daysSince(deal.last_activity);
  const rotting = !deal.last_activity || ds > 14;

  return (
    <div style={{ background:d.pageBg, minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:d.headerBg, borderBottom:`1px solid ${d.border}`, padding:'12px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <button onClick={()=>navigate('/deals/pipeline')}
            style={{ background:'none',border:`1px solid ${d.border}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:12,color:d.accent,fontFamily:'inherit' }}>← Back</button>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:d.textDark }}>{deal.name}</div>
            <div style={{ fontSize:11, color:d.textMid }}>{deal.deal_accounts?.name} · {deal.deal_accounts?.industry}</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={()=>setShowLog(true)}
              style={{ padding:'7px 14px',background:d.accent,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
              + Log activity
            </button>
          </div>
        </div>
        {/* Stage tracker */}
        {stages.length > 0 && (
          <div style={{ display:'flex', gap:0 }}>
            {stages.map((s,i)=>{
              const done  = i < stageIdx;
              const active= i === stageIdx;
              const isWon = s.id === 'won';
              return (
                <div key={s.id} onClick={()=>moveStage(s.id)}
                  style={{ flex:1,padding:'5px 4px',textAlign:'center',fontSize:10,fontWeight:active?700:500,cursor:'pointer',
                    borderTop:`3px solid ${active?d.accent:done?d.accent:'#E2E8F0'}`,
                    color:active?d.accent:done?d.textMid:isWon?d.accent:'#94A3B8',
                    background:active?d.kpiBg:isWon&&active?'#ECFDF5':'transparent' }}>
                  {s.name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
        {/* Main */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Core fields */}
          <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${d.border}`, fontSize:12, fontWeight:700, color:d.textDark }}>Deal details</div>
            <div style={{ padding:'12px 14px' }}>
              {[
                ['Deal value',     fmt(deal.value), false],
                ['Currency',       deal.currency||'USD', false],
                ['Probability',    deal.probability ? `${deal.probability}%` : '—', false],
                ['Close date',     deal.close_date ? new Date(deal.close_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—', false],
                ['Stage',          deal.stage, true],
                ['Last activity',  ds !== null ? (ds === 0 ? 'Today' : `${ds} days ago`) : 'Never', ds > 14],
              ].map(([label,val,warn])=>(
                <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #F1F5F9' }}>
                  <span style={{ fontSize:11,color:'#64748B' }}>{label}</span>
                  <span style={{ fontSize:12,fontWeight:600,color:warn?'#a32d2d':d.textDark }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom fields */}
          {fieldDefs.length > 0 && (
            <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', borderBottom:`1px solid ${d.border}`, fontSize:12, fontWeight:700, color:d.textDark, background:d.kpiBg, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ color:d.accent }}>⬡ Custom fields</span>
                <button onClick={()=>navigate('/deals/settings')} style={{ fontSize:11,color:d.textMid,background:'none',border:'none',cursor:'pointer' }}>Manage →</button>
              </div>
              <div style={{ padding:'12px 14px' }}>
                {fieldDefs.map(def=>(
                  <div key={def.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #F1F5F9' }}>
                    <span style={{ fontSize:11,color:'#64748B' }}>{def.name}{def.required&&<span style={{ color:'#a32d2d',marginLeft:2 }}>*</span>}</span>
                    <span style={{ fontSize:12,fontWeight:600 }}>{renderCFValue(def, cf[def.field_key])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${d.border}`, fontSize:12, fontWeight:700, color:d.textDark, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              Activity timeline
              <button onClick={()=>setShowLog(true)}
                style={{ padding:'4px 10px',background:d.accent,color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:'inherit' }}>+ Log</button>
            </div>
            <div style={{ padding:'12px 14px' }}>
              {activities.length === 0 ? (
                <div style={{ textAlign:'center',padding:20,color:'#94A3B8',fontSize:12 }}>No activities yet. Log a call, email, or note.</div>
              ) : activities.map(a=>(
                <div key={a.id} style={{ display:'flex',gap:10,paddingBottom:12,marginBottom:12,borderBottom:'1px solid #F1F5F9' }}>
                  <div style={{ width:28,height:28,borderRadius:'50%',background:ACT_COLORS[a.type]||'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0 }}>
                    {ACT_ICONS[a.type]||'📌'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:'#0F172A',marginBottom:2 }}>{a.title}</div>
                    {a.body && <div style={{ fontSize:11,color:'#64748B',lineHeight:1.5 }}>{a.body}</div>}
                  </div>
                  <div style={{ fontSize:10,color:'#94A3B8',flexShrink:0,marginTop:2 }}>
                    {new Date(a.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Rotting alert */}
          {rotting && (
            <div style={{ background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:10,padding:'12px 14px' }}>
              <div style={{ fontSize:12,fontWeight:700,color:'#a32d2d',marginBottom:4 }}>🔥 Deal at risk</div>
              <div style={{ fontSize:11,color:'#a32d2d' }}>{ds !== null ? `No activity for ${ds} days` : 'No activity logged yet'}</div>
              <button onClick={()=>setShowLog(true)}
                style={{ marginTop:8,padding:'5px 12px',background:'#a32d2d',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:'inherit',width:'100%' }}>
                Log activity now
              </button>
            </div>
          )}

          {/* Account */}
          {deal.deal_accounts && (
            <div style={{ background:'#fff',border:`1px solid ${d.border}`,borderRadius:10,overflow:'hidden' }}>
              <div style={{ padding:'10px 14px',borderBottom:`1px solid ${d.border}`,fontSize:12,fontWeight:700,color:d.textDark }}>Account</div>
              <div style={{ padding:'12px 14px' }}>
                <div style={{ fontSize:14,fontWeight:700,color:d.textDark,marginBottom:4 }}>{deal.deal_accounts.name}</div>
                {deal.deal_accounts.website && <a href={`https://${deal.deal_accounts.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" style={{ fontSize:11,color:d.accent,display:'block',marginBottom:8 }}>{deal.deal_accounts.website}</a>}
                {[['Industry',deal.deal_accounts.industry],['Region',deal.deal_accounts.country],['Size',deal.deal_accounts.size]].map(([l,v])=>v?(
                  <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #F1F5F9',fontSize:11 }}>
                    <span style={{ color:'#64748B' }}>{l}</span>
                    <span style={{ fontWeight:500,color:'#0F172A' }}>{v}</span>
                  </div>
                ):null)}
              </div>
            </div>
          )}

          {/* Contacts */}
          <div style={{ background:'#fff',border:`1px solid ${d.border}`,borderRadius:10,overflow:'hidden' }}>
            <div style={{ padding:'10px 14px',borderBottom:`1px solid ${d.border}`,fontSize:12,fontWeight:700,color:d.textDark }}>Contacts ({contacts.length})</div>
            <div style={{ padding:'8px 14px' }}>
              {contacts.length === 0 ? (
                <div style={{ fontSize:11,color:'#94A3B8',padding:'8px 0' }}>No contacts linked</div>
              ) : contacts.map(c=>(
                <div key={c.id} style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #F1F5F9' }}>
                  <div style={{ width:28,height:28,borderRadius:'50%',background:d.kpiBg,color:d.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0 }}>
                    {(c.leads?.contact||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.leads?.contact||'Unknown'}</div>
                    <div style={{ fontSize:10,color:'#64748B' }}>{c.leads?.role}</div>
                    {c.leads?.email && <a href={`mailto:${c.leads.email}`} style={{ fontSize:10,color:d.accent }}>{c.leads.email}</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLog && <LogActivityModal dealId={id} onClose={()=>setShowLog(false)} onSaved={load} />}
    </div>
  );
}
