import React, { useState, useEffect } from 'react';
import { supabase } from '../../data/supabase.js';
import { useNavigate } from 'react-router-dom';

const d = {
  pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
  accent:'#059669', textDark:'#27500A', textMid:'#3B6D11',
  kpiBg:'#EDF7EA', badgeBg:'#DCFCE7', badgeText:'#166534',
};

export default function DealDashboard() {
  const navigate = useNavigate();
  const [stats,      setStats]      = useState({});
  const [activities, setActivities] = useState([]);
  const [byStage,    setByStage]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: deals }, { data: acts }] = await Promise.all([
        supabase.from('deals').select('id,name,value,stage,close_date,rotting,last_activity,owner_id,account_id,deal_accounts(name)'),
        supabase.from('deal_activities').select('id,deal_id,type,title,due_at,done,created_at,deals(name,deal_accounts(name))').order('created_at',{ascending:false}).limit(10),
      ]);
      const all = deals || [];
      const open = all.filter(d => !['won','lost'].includes(d.stage));
      const won  = all.filter(d => d.stage === 'won');
      const rotting = open.filter(d => d.rotting);
      const closingThisMonth = open.filter(d => {
        if (!d.close_date) return false;
        const c = new Date(d.close_date);
        const now = new Date();
        return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
      });
      const totalPipeline = open.reduce((s,d) => s+(d.value||0), 0);
      const totalWon      = won.reduce((s,d)  => s+(d.value||0), 0);
      const totalClosing  = closingThisMonth.reduce((s,d) => s+(d.value||0), 0);

      setStats({ totalPipeline, totalWon, rotting: rotting.length, closingCount: closingThisMonth.length, closingValue: totalClosing, total: all.length });

      // By stage
      const stageMap = {};
      open.forEach(d => { stageMap[d.stage] = stageMap[d.stage] || {count:0,value:0}; stageMap[d.stage].count++; stageMap[d.stage].value += (d.value||0); });
      setByStage(Object.entries(stageMap).map(([s,v]) => ({stage:s,...v})));
      setActivities((acts||[]).slice(0,6));
      setLoading(false);
    }
    load();
  }, []);

  const fmt = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v||0}`;

  const ACT_ICON = { email:'✉', call:'📞', meeting:'📅', note:'📝', task:'✓', demo:'🖥' };
  const ACT_COLOR = { email:d.kpiBg, call:'#DCFCE7', meeting:'#FFFBEB', note:'#F1F5F9', task:'#FFFBEB', demo:d.kpiBg };

  const STAGE_LABELS = {
    qualified:'Qualified', demo:'Demo', proposal:'Proposal sent',
    negotiation:'Negotiation', agreement:'Pending agreement', won:'Closed won',
  };

  return (
    <div style={{ background:d.pageBg, minHeight:'100vh' }}>
      <div style={{ background:d.headerBg, borderBottom:`1px solid ${d.border}`, padding:'14px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:d.badgeBg, color:d.badgeText }}>💼 Deal CRM</span>
          <span style={{ color:d.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:d.textDark }}>Dashboard</span>
        </div>
        <div style={{ fontSize:11, color:d.textMid }}>Pipeline overview · action feed · rotting deal alerts</div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
          {[
            ['Pipeline value',      fmt(stats.totalPipeline), 'Open deals', d.accent],
            ['Closed won',          fmt(stats.totalWon),      'This month',  '#059669'],
            ['Closing this month',  fmt(stats.closingValue),  `${stats.closingCount||0} deals`, '#854f0b'],
            ['Rotting deals',       stats.rotting||0,         'No activity 14d+', '#a32d2d'],
            ['Total deals',         stats.total||0,           'All time', d.textDark],
            ['Win rate',            '—',                      'Coming soon', '#94A3B8'],
          ].map(([label,val,sub,color])=>(
            <div key={label} style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:d.textMid, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:700, color }}>{val}</div>
              <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Activity feed */}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:d.textDark, marginBottom:10 }}>Recent activity</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {loading ? <div style={{ color:'#94A3B8', fontSize:12 }}>Loading…</div>
              : activities.length === 0 ? <div style={{ color:'#94A3B8', fontSize:12 }}>No activities yet</div>
              : activities.map(a => (
                <div key={a.id} style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:ACT_COLOR[a.type]||'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                    {ACT_ICON[a.type]||'📌'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#0F172A' }}>{a.title || a.type}</div>
                    <div style={{ fontSize:11, color:'#64748B' }}>{a.deals?.name} · {a.deals?.deal_accounts?.name}</div>
                  </div>
                  <div style={{ fontSize:10, color:'#94A3B8', flexShrink:0 }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By stage */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:d.textDark }}>Pipeline by stage</div>
              <button onClick={() => navigate('/deals/pipeline')}
                style={{ padding:'4px 10px', border:`1px solid ${d.border}`, borderRadius:6, fontSize:11, cursor:'pointer', background:'#fff', color:d.accent, fontFamily:'inherit' }}>
                View board →
              </button>
            </div>
            <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>
                  {['Stage','Deals','Value'].map(h=><th key={h} style={{ padding:'8px 12px', background:d.kpiBg, borderBottom:`1px solid ${d.border}`, textAlign:'left', fontSize:9, color:d.textMid, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {byStage.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding:24, textAlign:'center', color:'#94A3B8' }}>No deals yet</td></tr>
                  ) : byStage.map(s=>(
                    <tr key={s.stage}>
                      <td style={{ padding:'8px 12px', borderBottom:`1px solid #F1F5F9`, color:'#0F172A' }}>{STAGE_LABELS[s.stage]||s.stage}</td>
                      <td style={{ padding:'8px 12px', borderBottom:`1px solid #F1F5F9` }}><span style={{ background:d.badgeBg, color:d.badgeText, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{s.count}</span></td>
                      <td style={{ padding:'8px 12px', borderBottom:`1px solid #F1F5F9`, color:d.accent, fontWeight:600 }}>{fmt(s.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
