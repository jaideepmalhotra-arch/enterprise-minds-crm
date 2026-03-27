import React from 'react';
import { ACTIVITY_TYPES } from '../../data/supabase.js';

export function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '12px 16px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || '#0D1F3C', fontFamily: "'DM Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function StageBadge({ stage, stages }) {
  const s = stages?.find(x => x.id === stage);
  if (!s) return null;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: s.color + '22', color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

export function ActivityBadge({ type }) {
  const a = ACTIVITY_TYPES.find(x => x.id === type);
  if (!a) return null;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: a.color + '22', color: a.color }}>
      {a.label}
    </span>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  const colors = { success: '#10B981', error: '#E24B4A', warn: '#F59E0B' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#0D1F3C', color: '#fff', padding: '12px 18px', borderRadius: 9, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[toast.type] || colors.success }} />
      {toast.msg}
    </div>
  );
}

export function Modal({ children, onClose, title, width = 500 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E4E8F0' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0D1F3C', fontFamily: "'Cormorant Garamond',serif" }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style: extra }) {
  const base = { border: 'none', borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: "'Raleway',sans-serif", display: 'inline-flex', alignItems: 'center', gap: 5, opacity: disabled ? .5 : 1, transition: 'all .12s' };
  const variants = {
    primary: { background: '#0D1F3C', color: '#C9A84C' },
    outline: { background: 'transparent', color: '#0D1F3C', border: '1px solid #D0D7E5' },
    ghost:   { background: 'transparent', color: '#64748B', border: 'none' },
    danger:  { background: '#FEF2F2', color: '#A32D2D', border: '1px solid rgba(226,75,74,.2)' },
    gold:    { background: '#C9A84C', color: '#0D1F3C', border: 'none' },
  };
  const sizes = { sm: { padding: '4px 10px', fontSize: 11 }, md: { padding: '7px 14px', fontSize: 12 }, lg: { padding: '10px 20px', fontSize: 13 } };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sizes[size], ...extra }}>
      {children}
    </button>
  );
}

export function EmptyState({ icon = '○', title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8, color: '#94A3B8' }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', fontFamily: "'Cormorant Garamond',serif" }}>{title}</div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}
