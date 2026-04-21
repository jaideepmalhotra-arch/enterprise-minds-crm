import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../data/supabase.js';

const MODULES = [
  {
    id:'input', label:'Input', icon:'📥',
    colorText:'#60A5FA', colorBg:'rgba(37,99,235,.25)', badgeBg:'rgba(37,99,235,.2)',
    activeBorder:'#60A5FA',
    items:[
      { to:'/sales/import',       label:'Import',           icon:'⬆' },
      { to:'/sales/add-contact',  label:'Add Contact',      icon:'＋' },
      { to:'/sales/conferences',  label:'Conferences',      icon:'⬡', countKey:'exhibitors' },
      { to:'/sales/ai-enrichment', label:'AI Enrichment',     icon:'✦' },
      { to:'/sales/lead-scoring', label:'Lead Scoring',     icon:'★', planned:true },
      { to:'/sales/export',       label:'Data Export',      icon:'↓', planned:true },
    ],
  },
  {
    id:'process', label:'Process', icon:'⚙',
    colorText:'#A78BFA', colorBg:'rgba(124,58,237,.25)', badgeBg:'rgba(124,58,237,.2)',
    activeBorder:'#A78BFA',
    items:[
      { to:'/sales/contacts',  label:'Contacts',        icon:'◉', countKey:'contacts' },
      { to:'/sales',           label:'Pipeline',        icon:'◫', end:true },
      { to:'/sales/assign',    label:'Assign Leads',    icon:'←' },
      { to:'/sales/tasks',     label:'My Tasks',        icon:'✓', countKey:'overdue', hot:true },
      { to:'/sales/enrichment',label:'Enrichment',      icon:'◈' },
      { to:'/sales/dedupe',    label:'Deduplicate',     icon:'⊜' },
      { to:'/sales/campaigns', label:'Campaigns',       icon:'✉', planned:true },
      { to:'/sales/sequences', label:'Email Sequences', icon:'⟳', planned:true },
      { to:'/sales/whatsapp',  label:'WhatsApp',        icon:'💬', planned:true },
    ],
  },
  {
    id:'output', label:'Output', icon:'📤',
    colorText:'#34D399', colorBg:'rgba(5,150,105,.25)', badgeBg:'rgba(5,150,105,.2)',
    activeBorder:'#34D399',
    items:[
      { to:'/sales/dashboard', label:'Team Dashboard',  icon:'⊞' },
      { to:'/sales/analytics', label:'Analytics',       icon:'▦' },
      { to:'/sales/activity',  label:'Activity Feed',   icon:'◎' },
      { to:'/sales/territory', label:'Territory Map',   icon:'🌍', planned:true },
      { to:'/sales/digest',    label:'Rep Digest',      icon:'📧', planned:true },
    ],
  },
  {
    id:'feedback', label:'Feedback', icon:'🔄',
    colorText:'#F87171', colorBg:'rgba(220,38,38,.25)', badgeBg:'rgba(220,38,38,.2)',
    activeBorder:'#F87171',
    items:[
      { to:'/sales/settings',       label:'Settings & Audit', icon:'⚙' },
      { to:'/sales/notifications',  label:'Notifications',    icon:'🔔', planned:true },
      { to:'/sales/integrations',   label:'Integrations',     icon:'⚡', planned:true },
    ],
  },
];

function fmt(n) { if (!n) return null; if (n>=1000) return (n/1000).toFixed(1).replace('.0','')+'k'; return String(n); }

export default function SalesSidebar() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ overdue:0, contacts:0, exhibitors:0 });

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0,10);
      const [{ count:ov },{ count:co },{ count:ex }] = await Promise.all([
        supabase.from('tasks').select('id',{count:'exact',head:true}).eq('status','open').lt('due_date',today),
        supabase.from('leads').select('id',{count:'exact',head:true}),
        supabase.from('exhibitors').select('id',{count:'exact',head:true}),
      ]);
      setCounts({ overdue:ov||0, contacts:co||0, exhibitors:ex||0 });
    }
    load();
    const iv = setInterval(load, 5*60*1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <aside style={{ width:224, background:'#0F172A', display:'flex', flexDirection:'column', flexShrink:0, position:'fixed', top:0, left:0, height:'100vh', zIndex:200, overflowY:'auto', borderRight:'1px solid rgba(26,86,219,.15)' }}>

      {/* Logo */}
      <div onClick={()=>navigate('/sales/home')}
        style={{ padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', gap:10, flexShrink:0, cursor:'pointer' }}>
        <div style={{ width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#1A56DB,#3B74E8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', flexShrink:0 }}>E</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Eminds.ai</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'1.5px' }}>Sales CRM</div>
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'#10B981', marginTop:3 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#10B981', animation:'pulse 2s infinite' }}/>
            Live · Supabase
          </div>
        </div>
      </div>

      {/* Modules */}
      <nav style={{ flex:1, paddingBottom:8 }}>
        {MODULES.map((mod, mi) => (
          <div key={mod.id} style={{ paddingTop:12 }}>
            {/* Module label */}
            <div style={{ padding:'0 14px 5px', display:'flex', alignItems:'center', gap:7 }}>
              <div style={{ width:20, height:20, borderRadius:5, background:mod.colorBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>{mod.icon}</div>
              <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:mod.colorText, opacity:.8 }}>{mod.label}</div>
              <div style={{ marginLeft:'auto', fontSize:8, fontFamily:'monospace', padding:'1px 5px', borderRadius:20, background:mod.badgeBg, color:mod.colorText }}>
                {mod.items.filter(i=>!i.planned).length}
              </div>
            </div>
            {/* Items */}
            {mod.items.map((item, ii) => {
              const badge = item.countKey ? counts[item.countKey] : null;
              return (
                <NavLink key={ii} to={item.to} end={item.end||false}
                  style={({ isActive }) => ({
                    display:'flex', alignItems:'center', gap:8,
                    padding:'6px 14px 6px 34px',
                    borderLeft: isActive ? `2px solid ${mod.activeBorder}` : '2px solid transparent',
                    background: isActive ? 'rgba(255,255,255,.07)' : 'transparent',
                    color: item.planned ? 'rgba(255,255,255,.25)' : isActive ? '#fff' : 'rgba(255,255,255,.5)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize:12, textDecoration:'none', transition:'all .15s',
                  })}>
                  <span style={{ fontSize:12, width:16, textAlign:'center', opacity: item.planned ? .5 : .8 }}>{item.icon}</span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {item.planned && <span style={{ fontSize:8, padding:'1px 5px', borderRadius:20, background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.3)', fontWeight:600 }}>SOON</span>}
                  {!item.planned && badge > 0 && (
                    <span style={{ fontSize:9, fontFamily:'monospace', padding:'1px 6px', borderRadius:20, background: item.hot ? 'rgba(220,38,38,.3)' : 'rgba(255,255,255,.1)', color: item.hot ? '#F87171' : 'rgba(255,255,255,.6)' }}>
                      {fmt(badge)}
                    </span>
                  )}
                </NavLink>
              );
            })}
            {mi < MODULES.length-1 && <div style={{ height:1, background:'rgba(255,255,255,.06)', margin:'10px 14px 0' }} />}
          </div>
        ))}
      </nav>

      {/* Rep pill */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,.08)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(255,255,255,.06)', borderRadius:8, cursor:'pointer' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'#1A56DB', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>JM</div>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:500 }}>Jaideep Malhotra</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>Manager · All reps</div>
          </div>
          <span style={{ marginLeft:'auto', color:'rgba(255,255,255,.3)', fontSize:12 }}>⌄</span>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </aside>
  );
}
