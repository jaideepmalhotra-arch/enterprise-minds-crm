import React, { useEffect, useState } from 'react';
import { useEM } from '../data/EMContext.jsx';
import { PIPELINE_STAGES, ACTIVITY_TYPES } from '../data/supabase.js';
import { KpiCard } from '../components/ui/UI.jsx';
import { fetchActivities } from '../data/api.js';

function fmt(val) {
  if (!val) return '$0';
  if (val >= 1000000) return '$' + (val/1000000).toFixed(1) + 'M';
  if (val >= 1000)    return '$' + (val/1000).toFixed(0) + 'K';
  return '$' + Number(val).toFixed(0);
}

export default function DashboardPage() {
  const { deals, dealsByStage, tasks, overdueTasks, todayTasks, pipelineValue, wonValue } = useEM();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const since = new Date(Date.now() - 7*86400000).toISOString();
    fetchActivities({ since }).then(setActivities).catch(console.error);
  }, []);

  const activePipeline = deals.filter(d => !['won','lost'].includes(d.stage));
  const wonDeals  = dealsByStage['won']  || [];
  const lostDeals = dealsByStage['lost'] || [];
  const winRate   = (wonDeals.length + lostDeals.length) > 0
    ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100) : 0;

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <KpiCard label="Pipeline value"  value={fmt(pipelineValue)} color="#0D1F3C" sub={activePipeline.length+' active deals'}/>
        <KpiCard label="Won this month"  value={fmt(wonValue)}      color="#10B981" sub={wonDeals.length+' deals closed'}/>
        <KpiCard label="Win rate"        value={winRate+'%'}        color="#C9A84C" sub="Won vs total closed"/>
        <KpiCard label="Due today"       value={todayTasks.length}  color={todayTasks.length>0?'#E24B4A':'#0D1F3C'} sub={overdueTasks.length+' overdue'}/>
        <KpiCard label="Activities (7d)" value={activities.length}  color="#378ADD"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E4E8F0',fontSize:14,fontWeight:600,fontFamily:"'Cormorant Garamond',serif",color:'#0D1F3C'}}>Pipeline by stage</div>
          {PIPELINE_STAGES.map(s=>{
            const sd=dealsByStage[s.id]||[];
            const val=sd.reduce((sum,d)=>sum+(d.value||0),0);
            return(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px',borderBottom:'1px solid #F1F5F9'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                <span style={{fontSize:12,flex:1}}>{s.label}</span>
                <span style={{fontSize:12,fontWeight:600,color:'#64748B'}}>{sd.length}</span>
                <span style={{fontSize:12,color:'#94A3B8',minWidth:60,textAlign:'right'}}>{fmt(val)}</span>
              </div>
            );
          })}
        </div>
        <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #E4E8F0',fontSize:14,fontWeight:600,fontFamily:"'Cormorant Garamond',serif",color:'#0D1F3C'}}>Recent activity</div>
          {activities.length===0?(
            <div style={{padding:32,textAlign:'center',color:'#94A3B8',fontSize:12}}>No activities yet</div>
          ):activities.slice(0,8).map(a=>{
            const at=ACTIVITY_TYPES.find(x=>x.id===a.type);
            return(
              <div key={a.id} style={{display:'flex',gap:10,padding:'9px 16px',borderBottom:'1px solid #F1F5F9',alignItems:'flex-start'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:at?.color||'#888',flexShrink:0,marginTop:4}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#0D1F3C'}}>{at?.label} logged</div>
                  {a.note&&<div style={{fontSize:11,color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.note}</div>}
                </div>
                <span style={{fontSize:10,color:'#94A3B8',flexShrink:0}}>{new Date(a.logged_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>
              </div>
            );
          })}
        </div>
      </div>
      {(overdueTasks.length>0||todayTasks.length>0)&&(
        <div style={{background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:10,padding:'12px 16px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#991B1B',marginBottom:8,fontFamily:"'Cormorant Garamond',serif"}}>
            Needs attention · {overdueTasks.length} overdue · {todayTasks.length} due today
          </div>
          {[...overdueTasks,...todayTasks].slice(0,5).map(t=>(
            <div key={t.id} style={{display:'flex',gap:8,fontSize:12,padding:'4px 0',borderBottom:'1px solid rgba(226,75,74,.1)',alignItems:'center'}}>
              <span style={{color:'#E24B4A',fontWeight:600,minWidth:60}}>{t.due_date===new Date().toISOString().slice(0,10)?'Today':'Overdue'}</span>
              <span style={{color:'#0D1F3C',flex:1}}>{t.title}</span>
              {t.deals?.title&&<span style={{color:'#64748B',fontSize:11}}>{t.deals.title}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
