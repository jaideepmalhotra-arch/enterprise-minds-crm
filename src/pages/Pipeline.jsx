import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useEM } from '../data/EMContext.jsx';
import { moveDeal, logActivity, createTask } from '../data/api.js';
import { PIPELINE_STAGES, STAGE_NEXT, SERVICES, ACTIVITY_TYPES } from '../data/supabase.js';
import { Modal, Btn, Toast, ActivityBadge } from '../components/ui/UI.jsx';

function LogModal({ deal, onClose, refresh, showToast }) {
  const [type,    setType]    = useState('call');
  const [note,    setNote]    = useState('');
  const [outcome, setOutcome] = useState('');
  const [advance, setAdvance] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const nextStage = STAGE_NEXT[deal.stage];

  async function save() {
    setSaving(true);
    try {
      await logActivity({ dealId: deal.id, clientId: deal.client_id, type, note, outcome });
      if (advance && nextStage) await moveDeal({ dealId: deal.id, stage: nextStage });
      showToast('Activity logged');
      refresh(); onClose();
    } catch(e) { showToast('Error: '+e.message,'error'); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={'Log activity · '+deal.title} onClose={onClose} width={440}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:7}}>Type</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {ACTIVITY_TYPES.map(a=>(
              <button key={a.id} onClick={()=>setType(a.id)} style={{padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',border:'1px solid '+(type===a.id?a.color:'#E4E8F0'),background:type===a.id?a.color+'22':'#fff',color:type===a.id?a.color:'#475569',fontFamily:'inherit'}}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Note</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="What happened? Key details..." style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'8px 10px',fontSize:12,resize:'vertical',fontFamily:'inherit'}}/>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Outcome</div>
          <input value={outcome} onChange={e=>setOutcome(e.target.value)} placeholder="e.g. Interested, Follow up needed..." style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit'}}/>
        </div>
        {nextStage&&(
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12}}>
            <input type="checkbox" checked={advance} onChange={e=>setAdvance(e.target.checked)}/>
            Move to next stage ({PIPELINE_STAGES.find(s=>s.id===nextStage)?.label})
          </label>
        )}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Saving...':'Log activity'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

function DealModal({ deal, onClose, refresh, showToast }) {
  const isNew = !deal?.id;
  const [form, setForm] = useState(deal || { title:'', company:'', contact_name:'', contact_email:'', contact_phone:'', service:'', value:'', currency:'USD', stage:'lead', expected_close:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const { upsertDeal } = await import('../data/api.js');
      await upsertDeal(form);
      showToast(isNew ? 'Deal created' : 'Deal updated');
      refresh(); onClose();
    } catch(e) { showToast('Error: '+e.message,'error'); }
    finally { setSaving(false); }
  }

  const F = (label, key, type='text', opts) => (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>{label}</div>
      {opts ? (
        <select value={form[key]||''} onChange={e=>set(key,e.target.value)} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit',background:'#fff'}}>
          <option value=''>Select...</option>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]||''} onChange={e=>set(key,e.target.value)} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit'}}/>
      )}
    </div>
  );

  return (
    <Modal title={isNew?'New deal':'Edit deal'} onClose={onClose} width={560}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{gridColumn:'1/-1'}}>{F('Deal title *','title')}</div>
        {F('Company','company')}
        {F('Contact name','contact_name')}
        {F('Contact email','contact_email','email')}
        {F('Contact phone','contact_phone')}
        {F('Service','service','text',SERVICES)}
        {F('Value (USD)','value','number')}
        {F('Expected close','expected_close','date')}
        {F('Stage','stage','text',PIPELINE_STAGES.map(s=>s.id))}
        <div style={{gridColumn:'1/-1'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#64748B',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Notes</div>
          <textarea value={form.notes||''} onChange={e=>set('notes',e.target.value)} rows={3} style={{width:'100%',border:'1px solid #D0D7E5',borderRadius:7,padding:'7px 10px',fontSize:12,fontFamily:'inherit',resize:'vertical'}}/>
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving||!form.title.trim()}>{saving?'Saving...':isNew?'Create deal':'Save changes'}</Btn>
      </div>
    </Modal>
  );
}

function DealCard({ deal, index }) {
  const { showToast, refresh } = useEM();
  const [showLog,  setShowLog]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const stage  = PIPELINE_STAGES.find(s=>s.id===deal.stage);
  const nextId = STAGE_NEXT[deal.stage];
  const next   = PIPELINE_STAGES.find(s=>s.id===nextId);

  async function advance() {
    if (!nextId) return;
    try { await moveDeal({ dealId:deal.id, stage:nextId }); showToast(deal.title+' moved to '+next.label); refresh(); }
    catch(e) { showToast('Error','error'); }
  }

  async function markLost() {
    try { await moveDeal({ dealId:deal.id, stage:'lost' }); showToast('Marked as lost'); refresh(); }
    catch(e) { showToast('Error','error'); }
  }

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          style={{ background:'#fff', border:deal.stage==='won'?'1.5px solid #97C459':deal.stage==='lost'?'1px solid #D0D7E5':'1px solid #E4E8F0', borderRadius:8, padding:12, marginBottom:7, opacity:snapshot.isDragging?.85:1, boxShadow:snapshot.isDragging?'0 4px 12px rgba(0,0,0,.12)':'none', cursor:'grab', ...provided.draggableProps.style }}>
          <div style={{fontSize:12,fontWeight:700,color:'#0D1F3C',marginBottom:2}}>{deal.title}</div>
          <div style={{fontSize:11,color:'#64748B',marginBottom:6}}>{deal.company||'—'}</div>
          {deal.contact_name&&<div style={{fontSize:10,color:'#94A3B8',marginBottom:5}}>{deal.contact_name}{deal.contact_email?' · '+deal.contact_email:''}</div>}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4,marginBottom:6}}>
            {deal.service&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:9,fontWeight:600,background:'#F1F5F9',color:'#475569'}}>{deal.service}</span>}
            {deal.value&&<span style={{fontSize:12,fontWeight:700,color:'#0D1F3C',fontFamily:"'DM Mono',monospace"}}>${Number(deal.value).toLocaleString()}</span>}
          </div>
          {deal.expected_close&&<div style={{fontSize:10,color:'#94A3B8',marginBottom:6}}>Close: {new Date(deal.expected_close).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>}
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {next&&deal.stage!=='won'&&deal.stage!=='lost'&&(
              <button onClick={advance} style={{padding:'3px 8px',borderRadius:5,fontSize:9,fontWeight:700,background:'#0D1F3C',color:'#C9A84C',border:'none',cursor:'pointer',fontFamily:'inherit'}}>{next.label} →</button>
            )}
            {deal.stage==='negotiation'&&(
              <button onClick={()=>moveDeal({dealId:deal.id,stage:'won'}).then(()=>{showToast('Deal Won!');refresh();})} style={{padding:'3px 8px',borderRadius:5,fontSize:9,fontWeight:700,background:'#ECFDF5',color:'#065F46',border:'1px solid #86EFAC',cursor:'pointer',fontFamily:'inherit'}}>Won ✓</button>
            )}
            <button onClick={()=>setShowLog(true)} style={{padding:'3px 8px',borderRadius:5,fontSize:9,border:'1px solid #E4E8F0',background:'#F8FAFC',color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>Log</button>
            <button onClick={()=>setShowEdit(true)} style={{padding:'3px 8px',borderRadius:5,fontSize:9,border:'1px solid #E4E8F0',background:'#F8FAFC',color:'#475569',cursor:'pointer',fontFamily:'inherit'}}>Edit</button>
            {!['won','lost'].includes(deal.stage)&&(
              <button onClick={markLost} style={{padding:'3px 8px',borderRadius:5,fontSize:9,border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#991B1B',cursor:'pointer',fontFamily:'inherit'}}>Lost</button>
            )}
          </div>
          {showLog  && <LogModal  deal={deal} onClose={()=>setShowLog(false)}  refresh={refresh} showToast={showToast}/>}
          {showEdit && <DealModal deal={deal} onClose={()=>setShowEdit(false)} refresh={refresh} showToast={showToast}/>}
        </div>
      )}
    </Draggable>
  );
}

function KanbanView() {
  const { dealsByStage, deals, showToast, refresh } = useEM();

  async function onDragEnd({ destination, source, draggableId }) {
    if (!destination) return;
    if (destination.droppableId===source.droppableId && destination.index===source.index) return;
    const newStage = destination.droppableId;
    try {
      await moveDeal({ dealId: draggableId, stage: newStage });
      const s = PIPELINE_STAGES.find(x=>x.id===newStage);
      showToast('Moved to '+s?.label);
      refresh();
    } catch(e) { showToast('Error','error'); }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{display:'flex',gap:10,overflowX:'auto',alignItems:'flex-start',paddingBottom:12}}>
        {PIPELINE_STAGES.map(stage=>(
          <div key={stage.id} style={{width:200,flexShrink:0}}>
            <div style={{background:'#fff',border:'1px solid #E4E8F0',borderBottom:'none',borderRadius:'9px 9px 0 0',padding:'9px 12px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:stage.color}}/>
                  <span style={{fontSize:11,fontWeight:700}}>{stage.label}</span>
                </div>
                <span style={{fontSize:10,color:'#64748B',background:'#F1F5F9',borderRadius:20,padding:'1px 7px',fontWeight:600}}>{(dealsByStage[stage.id]||[]).length}</span>
              </div>
              <div style={{height:3,borderRadius:2,background:stage.bar}}/>
            </div>
            <Droppable droppableId={stage.id}>
              {(provided, snapshot)=>(
                <div ref={provided.innerRef} {...provided.droppableProps}
                  style={{background:snapshot.isDraggingOver?'#F0F4FF':'#F1F5F9',border:'1px solid #E4E8F0',borderTop:'none',borderRadius:'0 0 9px 9px',padding:7,minHeight:480,transition:'background .15s'}}>
                  {(dealsByStage[stage.id]||[]).map((deal,index)=>(
                    <DealCard key={deal.id} deal={deal} index={index}/>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

function ListView() {
  const { deals } = useEM();
  const { showToast, refresh } = useEM();
  const [editDeal, setEditDeal] = useState(null);

  return (
    <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,tableLayout:'fixed'}}>
        <thead><tr>
          {['Title','Company','Contact','Service','Value','Stage','Close Date',''].map(h=>(
            <th key={h} style={{padding:'8px 12px',background:'#F8FAFC',borderBottom:'1px solid #E4E8F0',textAlign:'left',fontSize:9,letterSpacing:'.07em',textTransform:'uppercase',color:'#64748B',fontWeight:600}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {deals.length===0?(
            <tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'#94A3B8'}}>No deals yet — click + New deal to add one</td></tr>
          ):deals.map(d=>{
            const s = PIPELINE_STAGES.find(x=>x.id===d.stage);
            return(
              <tr key={d.id}>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.title}</td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.company||'—'}</td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.contact_name||'—'}</td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.service||'—'}</td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{d.value?'$'+Number(d.value).toLocaleString():'—'}</td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9'}}>
                  <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:s?.color+'22',color:s?.color}}>{s?.label}</span>
                </td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9',color:'#64748B'}}>{d.expected_close?new Date(d.expected_close).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}</td>
                <td style={{padding:'9px 12px',borderBottom:'1px solid #F1F5F9'}}>
                  <button onClick={()=>setEditDeal(d)} style={{padding:'2px 8px',border:'1px solid #E4E8F0',borderRadius:5,fontSize:10,cursor:'pointer',background:'#F8FAFC',fontFamily:'inherit'}}>Edit</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {editDeal&&<DealModal deal={editDeal} onClose={()=>setEditDeal(null)} refresh={refresh} showToast={showToast}/>}
    </div>
  );
}

export default function PipelinePage() {
  const { deals, dealsByStage, pipelineValue, toast, showToast, refresh } = useEM();
  const [view,     setView]     = useState('kanban');
  const [showNew,  setShowNew]  = useState(false);

  const activePipeline = deals.filter(d=>!['won','lost'].includes(d.stage));
  const wonDeals = dealsByStage['won']||[];

  function fmt(val) {
    if (!val) return '$0';
    if (val>=1000000) return '$'+(val/1000000).toFixed(1)+'M';
    if (val>=1000)    return '$'+(val/1000).toFixed(0)+'K';
    return '$'+Number(val).toFixed(0);
  }

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:9,padding:'10px 14px',flex:1,minWidth:110}}>
          <div style={{fontSize:10,color:'#64748B',marginBottom:3,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>Pipeline value</div>
          <div style={{fontSize:19,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmt(pipelineValue)}</div>
        </div>
        <div style={{background:'#ECFDF5',border:'1px solid #86EFAC',borderRadius:9,padding:'10px 14px',flex:1,minWidth:110}}>
          <div style={{fontSize:10,color:'#065F46',marginBottom:3,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>Deals won</div>
          <div style={{fontSize:19,fontWeight:600,color:'#065F46'}}>{wonDeals.length}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:9,padding:'10px 14px',flex:1,minWidth:110}}>
          <div style={{fontSize:10,color:'#64748B',marginBottom:3,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>Active deals</div>
          <div style={{fontSize:19,fontWeight:600}}>{activePipeline.length}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <div style={{display:'flex',background:'#F1F5F9',borderRadius:7,padding:3,gap:3}}>
            <button onClick={()=>setView('kanban')} style={{padding:'4px 12px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:view==='kanban'?'#0D1F3C':'transparent',color:view==='kanban'?'#C9A84C':'#0F172A',fontFamily:'inherit'}}>Kanban</button>
            <button onClick={()=>setView('list')}   style={{padding:'4px 12px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:view==='list'?'#0D1F3C':'transparent',color:view==='list'?'#C9A84C':'#0F172A',fontFamily:'inherit'}}>List</button>
          </div>
          <button onClick={()=>setShowNew(true)} style={{padding:'7px 14px',background:'#0D1F3C',color:'#C9A84C',border:'none',borderRadius:7,fontSize:12,cursor:'pointer',fontWeight:600,fontFamily:'inherit'}}>+ New deal</button>
        </div>
      </div>
      {view==='kanban' ? <KanbanView/> : <ListView/>}
      {showNew&&<DealModal deal={null} onClose={()=>setShowNew(false)} refresh={refresh} showToast={showToast}/>}
      <Toast toast={toast}/>
    </div>
  );
}
