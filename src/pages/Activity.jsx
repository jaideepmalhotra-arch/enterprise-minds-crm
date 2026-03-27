import React, { useState, useEffect } from 'react';
import { fetchActivities } from '../data/api.js';
import { ACTIVITY_TYPES } from '../data/supabase.js';
import { Toast } from '../components/ui/UI.jsx';

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const since = new Date(Date.now()-30*86400000).toISOString();
    fetchActivities({ since }).then(data=>{
      setActivities(data);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const filtered = typeFilter ? activities.filter(a=>a.type===typeFilter) : activities;

  const groups = filtered.reduce((acc,a)=>{
    const d = new Date(a.logged_at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    if (!acc[d]) acc[d]=[];
    acc[d].push(a);
    return acc;
  },{});

  const counts = ACTIVITY_TYPES.reduce((acc,t)=>{
    acc[t.id]=activities.filter(a=>a.type===t.id).length;
    return acc;
  },{});

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {[['Total (30d)',activities.length,'#0D1F3C'],['Calls',counts.call||0,'#E24B4A'],['Emails',counts.email||0,'#378ADD'],['Meetings',counts.meeting||0,'#10B981'],['Proposals',counts.proposal||0,'#7F77DD']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:9,padding:'10px 14px',flex:1,minWidth:100}}>
            <div style={{fontSize:10,color:'#64748B',marginBottom:3,fontWeight:500,textTransform:'uppercase',letterSpacing:'.04em'}}>{l}</div>
            <div style={{fontSize:19,fontWeight:600,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{border:'1px solid #D0D7E5',borderRadius:7,padding:'5px 9px',fontSize:11,background:'#fff'}}>
          <option value=''>All types</option>
          {ACTIVITY_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      {loading?<div style={{textAlign:'center',padding:40,color:'#94A3B8'}}>Loading...</div>
      :Object.keys(groups).length===0?<div style={{textAlign:'center',padding:60,color:'#94A3B8'}}><div style={{fontSize:14,fontWeight:600,color:'#475569',fontFamily:"'Cormorant Garamond',serif"}}>No activities yet</div><div style={{fontSize:12}}>Log activities from the Pipeline page</div></div>
      :Object.entries(groups).map(([date,acts])=>(
        <div key={date} style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:'#64748B',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>{date}</div>
          <div style={{background:'#fff',border:'1px solid #E4E8F0',borderRadius:10,overflow:'hidden'}}>
            {acts.map((a,i)=>{
              const at=ACTIVITY_TYPES.find(x=>x.id===a.type);
              return(
                <div key={a.id} style={{display:'flex',gap:12,padding:'11px 16px',borderBottom:i<acts.length-1?'1px solid #F1F5F9':'none',alignItems:'flex-start'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:at?.color||'#888',flexShrink:0,marginTop:4}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:2}}>
                      {at&&<span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:at.color+'22',color:at.color}}>{at.label}</span>}
                      <span style={{fontSize:12,fontWeight:600,color:'#0D1F3C'}}>{a.logged_by}</span>
                    </div>
                    {a.outcome&&<div style={{fontSize:11,color:'#64748B'}}>{a.outcome}</div>}
                    {a.note&&<div style={{fontSize:11,color:'#64748B',marginTop:2}}>{a.note}</div>}
                  </div>
                  <span style={{fontSize:11,color:'#94A3B8',flexShrink:0}}>{new Date(a.logged_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
