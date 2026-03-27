import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { section: 'OVERVIEW' },
  { to: '/em',            label: 'Dashboard',      icon: '⊞' },
  { section: 'SALES' },
  { to: '/em/pipeline',   label: 'Pipeline',       icon: '◫' },
  { to: '/em/clients',    label: 'Clients',        icon: '◉' },
  { section: 'WORK' },
  { to: '/em/tasks',      label: 'Tasks',          icon: '✓' },
  { to: '/em/activity',   label: 'Activity feed',  icon: '◎' },
];

export default function EMSidebar() {
  return (
    <aside style={{ width: 210, background: '#0D1F3C', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 200, overflowY: 'auto', borderRight: '1px solid rgba(201,168,76,.15)' }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(201,168,76,.2)', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#C9A84C', fontFamily: "'Cormorant Garamond',serif", letterSpacing: '.5px', marginBottom: 2 }}>Enterprise Minds</div>
        <div style={{ fontSize: 9, color: 'rgba(201,168,76,.5)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: "'Raleway',sans-serif", fontWeight: 600 }}>CRM · Sales Intelligence</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px' }}>
        {NAV.map((item, i) => item.section ? (
          <div key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,.4)', padding: '12px 10px 5px', marginTop: i > 0 ? 4 : 0, fontFamily: "'Raleway',sans-serif" }}>{item.section}</div>
        ) : (
          <NavLink key={item.to} to={item.to} end={item.to === '/em'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 7, marginBottom: 1,
            textDecoration: 'none', fontSize: 12, fontWeight: isActive ? 600 : 400, fontFamily: "'Raleway',sans-serif",
            background: isActive ? 'rgba(201,168,76,.15)' : 'transparent',
            color: isActive ? '#C9A84C' : 'rgba(255,255,255,.5)',
            borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
            transition: 'all .15s',
          })}>
            <span style={{ fontSize: 12, width: 16, textAlign: 'center', opacity: .7 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(201,168,76,.1)', fontSize: 10, color: 'rgba(201,168,76,.25)', fontFamily: "'Raleway',sans-serif", letterSpacing: '.5px', flexShrink: 0 }}>
        Enterprise Minds © 2026
      </div>
    </aside>
  );
}
