import React from 'react';
import { NavLink } from 'react-router-dom';

const nav = [
  { to:'/',          icon:'⊞', label:'Dashboard'  },
  { to:'/contacts',  icon:'◈', label:'Leads'       },
  { to:'/import',    icon:'↑', label:'Import'       },
  { to:'/pipeline',  icon:'◫', label:'Pipeline'     },
  { to:'/quality',   icon:'◎', label:'Data Quality' },
  { to:'/enrichment',icon:'✦', label:'Enrichment'   },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, background:'var(--blue)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'white', flexShrink:0 }}>E</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'white', letterSpacing:'-0.3px' }}>Enterprise</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase' }}>Minds CRM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px 10px' }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', padding:'8px 10px 6px' }}>Menu</div>
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to==='/'} style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:2,
            textDecoration:'none', fontSize:13, fontWeight:500,
            background: isActive ? 'rgba(26,86,219,0.25)' : 'transparent',
            color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
            borderLeft: isActive ? '2px solid var(--blue-mid)' : '2px solid transparent',
          })}>
            <span style={{ fontSize:14, width:18, textAlign:'center' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', fontSize:11, color:'rgba(255,255,255,0.3)' }}>
        Enterprise Minds © 2026
      </div>
    </aside>
  );
}
