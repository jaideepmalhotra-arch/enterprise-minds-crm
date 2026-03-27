import React, { useState, useEffect } from 'react';

// ── Toast ─────────────────────────────────────────────────
let _showToast = null;
export function toast(msg, type='success') { if (_showToast) _showToast(msg, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    _showToast = (msg, type) => {
      const id = Date.now();
      setToasts(p => [...p, { id, msg, type }]);
      setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 3500);
    };
  }, []);
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:500,
          background: t.type==='error'?'var(--red)':t.type==='warn'?'var(--amber)':'var(--blue)',
          color:'white', boxShadow:'var(--shadow-md)', animation:'fadeIn 0.2s ease',
          display:'flex', alignItems:'center', gap:8, maxWidth:380 }}>
          <span>{t.type==='error'?'✗':t.type==='warn'?'⚠':'✓'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Tier badge ────────────────────────────────────────────
export function TierBadge({ tier }) {
  const map = {
    complete: { bg:'var(--complete-bg)', color:'var(--complete)', label:'Complete' },
    partial:  { bg:'var(--partial-bg)',  color:'var(--amber)',    label:'Partial'  },
    minimal:  { bg:'var(--minimal-bg)',  color:'var(--purple)',   label:'Minimal'  },
    empty:    { bg:'var(--empty-bg)',    color:'var(--red)',      label:'Empty'    },
  };
  const s = map[tier] || map.empty;
  return <span style={{ background:s.bg, color:s.color, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>{s.label}</span>;
}

// ── Stage badge ───────────────────────────────────────────
export function StageBadge({ stage }) {
  const map = {
    'New Lead':       { bg:'#EFF6FF', color:'#1D4ED8' },
    'Contacted':      { bg:'#F0FDF4', color:'#16A34A' },
    'Discovery Call': { bg:'#FEFCE8', color:'#CA8A04' },
    'Proposal Sent':  { bg:'#FFF7ED', color:'#C2410C' },
    'Negotiation':    { bg:'#FDF4FF', color:'#9333EA' },
    'Won':            { bg:'var(--complete-bg)', color:'var(--complete)' },
    'Lost':           { bg:'var(--empty-bg)',    color:'var(--red)' },
  };
  const s = map[stage] || { bg:'#F1F5F9', color:'#64748B' };
  return <span style={{ background:s.bg, color:s.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{stage||'—'}</span>;
}

// ── Btn ───────────────────────────────────────────────────
export function Btn({ children, onClick, variant='primary', size='md', disabled, style:sx }) {
  const base = { fontFamily:'var(--font)', fontWeight:600, borderRadius:'var(--radius-sm)', cursor:disabled?'not-allowed':'pointer', border:'none', transition:'all 0.14s', opacity:disabled?0.5:1, display:'inline-flex', alignItems:'center', gap:6 };
  const variants = {
    primary: { background:'var(--blue)',     color:'white',            padding: size==='sm'?'5px 12px':'8px 18px', fontSize: size==='sm'?12:13 },
    outline: { background:'transparent',     color:'var(--text)',      padding: size==='sm'?'5px 12px':'8px 18px', fontSize: size==='sm'?12:13, border:'1px solid var(--border-md)' },
    ghost:   { background:'transparent',     color:'var(--text-muted)',padding: size==='sm'?'5px 10px':'7px 14px', fontSize: size==='sm'?12:13 },
    danger:  { background:'var(--red-bg)',   color:'var(--red)',       padding: size==='sm'?'5px 12px':'8px 18px', fontSize: size==='sm'?12:13, border:'1px solid rgba(239,68,68,0.2)' },
    accent:  { background:'var(--blue)',     color:'white',            padding: size==='sm'?'5px 12px':'8px 18px', fontSize: size==='sm'?12:13 },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...sx }}>{children}</button>;
}

// ── Pagination ────────────────────────────────────────────
export function Pagination({ total, page, perPage, onChange }) {
  const totalPages = Math.ceil(total/perPage);
  if (!total || totalPages<=1) return null;
  const start=(page-1)*perPage+1, end=Math.min(page*perPage,total);
  const pageNums=[]; for(let i=1;i<=totalPages;i++) if(i===1||i===totalPages||(i>=page-2&&i<=page+2)) pageNums.push(i);
  const items=[]; let prev=0;
  for(const n of pageNums) { if(prev&&n-prev>1) items.push({type:'ellipsis',key:`e${prev}`}); items.push({type:'page',n,key:`p${n}`}); prev=n; }
  const btnS = { fontFamily:'var(--font)', fontSize:12, border:'1px solid var(--border-md)', borderRadius:6, padding:'5px 10px', cursor:'pointer', minWidth:32, transition:'all 0.14s' };
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:14, borderTop:'1px solid var(--border)', marginTop:8, flexWrap:'wrap', gap:8 }}>
      <div style={{ fontSize:12, color:'var(--text-muted)' }}>Showing <strong>{start}–{end}</strong> of <strong>{total}</strong></div>
      <div style={{ display:'flex', gap:4, alignItems:'center' }}>
        <button onClick={()=>onChange(page-1)} disabled={page===1} style={{ ...btnS, background:'white', color:page===1?'var(--text-light)':'var(--text)', opacity:page===1?0.4:1, cursor:page===1?'not-allowed':'pointer' }}>← Prev</button>
        {items.map(item => item.type==='ellipsis'
          ? <span key={item.key} style={{ padding:'0 4px', color:'var(--text-muted)', fontSize:12 }}>…</span>
          : <button key={item.key} onClick={()=>onChange(item.n)} style={{ ...btnS, background:item.n===page?'var(--blue)':'white', color:item.n===page?'white':'var(--text)', border:`1px solid ${item.n===page?'var(--blue)':'var(--border-md)'}`, fontWeight:item.n===page?600:400 }}>{item.n}</button>
        )}
        <button onClick={()=>onChange(page+1)} disabled={page===totalPages} style={{ ...btnS, background:'white', color:page===totalPages?'var(--text-light)':'var(--text)', opacity:page===totalPages?0.4:1, cursor:page===totalPages?'not-allowed':'pointer' }}>Next →</button>
      </div>
    </div>
  );
}
