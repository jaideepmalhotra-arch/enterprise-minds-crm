import React, { useState } from 'react';
import { useEM } from '../data/EMContext.jsx';
import { completeTask } from '../data/api.js';
import { ACTIVITY_TYPES } from '../data/supabase.js';
import { Btn, Toast } from '../components/ui/UI.jsx';

export default function TasksPage() {
  const { tasks, overdueTasks, todayTasks, upcomingTasks, toast, showToast, refresh } = useEM();

  async function done(id) {
    try { await completeTask(id); showToast('Task completed'); refresh(); }
    catch(e) { showToast('Error','error'); }
  }

  function TaskCard({ task, urgency }) {
    const at = ACTIVITY_TYPES.find(x=>x.id===task.type);
    const colors = {
      overdue:  { bg:'#FEF2F2', border:'#E24B4A', label:'Overdue',  lc:'#A32D2D' },
      today:    { bg:'#FEF2F2', border:'#E24B4A', label:'Today',    lc:'#A32D2D' },
      upcoming: { bg:'#fff',    border:'#E4E8F0', label:'',         lc:'#475569' },
    };
    const c = colors[urgency];
    return (
      <div style={{background:c.bg,border:'1px solid '+c.border,borderRadius:9,padding:'12px 14px',display:'flex',gap:10,alignItems:'flex-start',marginBottom:8}}>
        <input type="checkbox" style={{marginTop:3,flexShrink:0,cursor:'pointer'}} onChange={()=>done(task.id)}/>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
            {at&&<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:at.color+'22',color:at.color}}>{at.label}</span>}
            {task.priority==='high'&&<span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:20,background:'#FEF2F2',color:'#A32D2D'}}>High</span>}
          </div>
          <div style={{fontSize:12,fontWeight:600,color:'#0D1F3C',marginBottom:2}}>{task.title}</div>
          {task.deals?.title&&<div style={{fontSize:11,color:'#64748B'}}>{task.deals.title}</div>}
          <div style={{fontSize:11,fontWeight:600,color:c.lc,marginTop:4}}>
            {c.label || (task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'No due date')}
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    { label:'Overdue', tasks:overdueTasks,  color:'#E24B4A', urgency:'overdue' },
    { label:'Today',   tasks:todayTasks,    color:'#E24B4A', urgency:'today' },
    { label:'Upcoming',tasks:upcomingTasks, color:'#0D1F3C', urgency:'upcoming' },
  ];

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[['Open tasks',tasks.length,'#0D1F3C'],['Due today',todayTasks.length,'#E24B4A'],['Overdue',overdueTasks.length,'#E24B4A'],['Upcoming',upcomingTasks.length,'#0D1F3C']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:9,padding:'10px 14px',flex:1,minWidth:100}}>
            <div style={{fontSize:10,color:'#64748B',marginBottom:3,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</div>
            <div style={{fontSize:19,fontWeight:600,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      {sections.map(sec=>sec.tasks.length>0&&(
        <div key={sec.label} style={{marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700,color:sec.color,fontFamily:"'Cormorant Garamond',serif"}}>{sec.label}</span>
            <span style={{fontSize:11,color:'#94A3B8',background:'#F1F5F9',borderRadius:20,padding:'1px 8px'}}>{sec.tasks.length}</span>
          </div>
          {sec.tasks.map(t=><TaskCard key={t.id} task={t} urgency={sec.urgency}/>)}
        </div>
      ))}
      {tasks.length===0&&(
        <div style={{textAlign:'center',padding:60,color:'#94A3B8'}}>
          <div style={{fontSize:32,marginBottom:8}}>✓</div>
          <div style={{fontSize:14,fontWeight:600,color:'#475569',fontFamily:"'Cormorant Garamond',serif"}}>All clear</div>
          <div style={{fontSize:12}}>No open tasks</div>
        </div>
      )}
      <Toast toast={toast}/>
    </div>
  );
}
