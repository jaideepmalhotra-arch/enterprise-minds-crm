import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { section: 'LEADS' },
  { to: '/sales/contacts',   label: 'Contacts',       icon: '◉' },
  { to: '/sales/dedupe',     label: 'Deduplicate',    icon: '⊜' },
  { to: '/sales/import',     label: 'Import',         icon: '↑' },
  { to: '/sales/enrichment', label: 'Enrichment',     icon: '◈' },
  { to: '/sales/conferences',label: 'Conferences',    icon: '⬡' },
  { to: '/sales/analytics',  label: 'Analytics',      icon: '▦' },
  { section: 'PIPELINE' },
  { to: '/sales',            label: 'Pipeline',       icon: '◫' },
  { to: '/sales/assign',     label: 'Assign Leads',   icon: '←' },
  { section: 'TEAM' },
  { to: '/sales/tasks',      label: 'My Tasks',       icon: '✓' },
  { to: '/sales/activity',   label: 'Activity Feed',  icon: '◎' },
  { to: '/sales/dashboard',  label: 'Team Dashboard', icon: '⊞' },
  { section: 'ADMIN' },
  { to: '/sales/settings',   label: 'Settings',       icon: '⚙' },
];

export default function SalesSidebar() {
  return (
    <aside style={{ width: 210, background: '#0F172A', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200, overflowY: 'auto', borderRight: '1px solid rgba(26,86,219,.2)' }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(26,86,219,.3)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#1A56DB,#3B74E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>E</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Eminds.ai</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>Sales CRM</div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px' }}>
        {NAV.map((item, i) => item.section ? (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', padding: '12px 10px 5px', marginTop: i > 0 ? 4 : 0 }}>{item.section}</div>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.to === '/sales'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 7, marginBottom: 1, textDecoration: 'none',
            fontSize: 12, fontWeight: isActive ? 600 : 400, fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: isActive ? 'rgba(26,86,219,.25)' : 'transparent',
            color: isActive ? '#93C5FD' : 'rgba(255,255,255,.5)',
            borderLeft: isActive ? '2px solid #3B74E8' : '2px solid transparent',
            transition: 'all .15s',
          })}>
            <span style={{ fontSize: 12, width: 16, textAlign: 'center', opacity: .7 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(26,86,219,.15)', fontSize: 10, color: 'rgba(255,255,255,.2)', flexShrink: 0 }}>
        Eminds.ai © 2026
      </div>
    </aside>
  );
}
