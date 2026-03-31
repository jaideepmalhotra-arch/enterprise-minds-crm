import React from 'react';
import { STAGES, ACTIVITY_TYPES } from '../data/supabase.js';
import { taskUrgency, fmtDate } from '../utils/dates.js';
export { calcScore, scoreToStars, StarRating } from './ContactDrawer.jsx';

// RepAvatar now accepts rep data directly (no REPS lookup needed)
export function RepAvatar({ repId, repInitials, colorBg, colorText, size = 24 }) {
  if (!repId && !repInitials) return null;
  const initials = repInitials || repId || '?';
  const bg   = colorBg   || '#E6F1FB';
  const text = colorText || '#0C447C';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export function StageBadge({ stage }) {
  const s = STAGES.find(x => x.id === stage);
  if (!s) return null;
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: s.color + '22', color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

export function TierBadge({ tier }) {
  const map = {
    complete: { bg: '#ECFDF5', color: '#065F46', label: 'Complete', icon: '★' },
    partial:  { bg: '#FFFBEB', color: '#92600A', label: 'Partial',  icon: '◑' },
    minimal:  { bg: '#F5F3FF', color: '#5B21B6', label: 'Minimal',  icon: '◔' },
    empty:    { bg: '#FEF2F2', color: '#991B1B', label: 'Empty',    icon: '○' },
  };
  const s = map[tier] || map.empty;
  return <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color }}>{s.icon} {s.label}</span>;
}

export function TaskRow({ task }) {
  const urg = taskUrgency(task.due_date);
  const colors = { overdue: { bg: '#FEF2F2', border: '#E24B4A', color: '#A32D2D' }, today: { bg: '#FEF2F2', border: '#E24B4A', color: '#A32D2D' }, tomorrow: { bg: '#FFFBEB', border: '#F59E0B', color: '#92600A' }, normal: { bg: '#F8FAFC', border: '#D0D7E5', color: '#475569' } };
  const c = colors[urg] || colors.normal;
  return <div style={{ fontSize: 10, padding: '4px 7px', marginTop: 6, borderLeft: `2px solid ${c.border}`, background: c.bg, color: c.color }}>{task.title} · {fmtDate(task.due_date)}</div>;
}

export function QuotaBar({ repId, repName, repInitials, colorBg, colorText, assigned, quota, showLabel = true }) {
  if (!repId) return null;
  const pct  = Math.min(100, Math.round((assigned / quota) * 100));
  const over = assigned > quota;
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <RepAvatar repId={repId} repInitials={repInitials} colorBg={colorBg} colorText={colorText} size={16} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>{repName || repId}</span>
        </div>
      )}
      <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, marginBottom: 3 }}>
        <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: over ? '#E24B4A' : '#1A56DB', transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8' }}>
        <span>{assigned} / {quota}</span>
        <span style={{ fontWeight: 600, color: over ? '#E24B4A' : '#1A56DB' }}>{pct}%</span>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 600, color: color || '#0F172A' }}>{value}</div>
    </div>
  );
}

export function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B', marginBottom: 8 }}>{children}</div>;
}

export function Toast({ toast }) {
  if (!toast) return null;
  const colors = { success: '#10B981', error: '#E24B4A', warn: '#F59E0B' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#0F172A', color: '#fff', padding: '12px 18px', borderRadius: 9, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[toast.type] || colors.success }} />
      {toast.msg}
    </div>
  );
}

export function Modal({ children, onClose, title, width = 480 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E4E8F0' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>{children}</div>
      </div>
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style: extra }) {
  const base = { border: 'none', borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all .12s', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: disabled ? .5 : 1, fontFamily: 'inherit' };
  const variants = {
    primary: { background: '#1A56DB', color: '#fff', border: 'none' },
    outline: { background: 'transparent', color: '#0F172A', border: '1px solid #D0D7E5' },
    ghost:   { background: 'transparent', color: '#64748B', border: 'none' },
    danger:  { background: '#FEF2F2', color: '#A32D2D', border: '1px solid rgba(226,75,74,.2)' },
  };
  const sizes = { sm: { padding: '4px 10px', fontSize: 11 }, md: { padding: '7px 14px', fontSize: 12 }, lg: { padding: '10px 18px', fontSize: 13 } };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sizes[size], ...extra }}>{children}</button>;
}
