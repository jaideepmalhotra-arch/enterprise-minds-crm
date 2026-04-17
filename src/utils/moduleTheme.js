export const MOD = {
  input: {
    id:'input', label:'Input', icon:'📥',
    pageBg:'#F2F7FD', headerBg:'#EBF4FD', border:'#B5D4F4',
    accent:'#2563EB', textDark:'#0C447C', textMid:'#185FA5', textLight:'#378ADD',
    kpiBg:'#EBF4FD', kpiBorder:'#B5D4F4',
    rowBg:'#EBF4FD', rowBorder:'#B5D4F4',
    badgeBg:'#DBEAFE', badgeText:'#1E40AF',
    tabActive:'#2563EB', tabActiveTxt:'#fff',
  },
  process: {
    id:'process', label:'Process', icon:'⚙',
    pageBg:'#F4F2FE', headerBg:'#F0EEFE', border:'#C4B5FD',
    accent:'#7C3AED', textDark:'#3C3489', textMid:'#534AB7', textLight:'#7C3AED',
    kpiBg:'#F0EEFE', kpiBorder:'#C4B5FD',
    rowBg:'#F0EEFE', rowBorder:'#C4B5FD',
    badgeBg:'#EDE9FE', badgeText:'#4C1D95',
    tabActive:'#7C3AED', tabActiveTxt:'#fff',
  },
  output: {
    id:'output', label:'Output', icon:'📤',
    pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
    accent:'#059669', textDark:'#27500A', textMid:'#3B6D11', textLight:'#059669',
    kpiBg:'#EDF7EA', kpiBorder:'#A7D99F',
    rowBg:'#EDF7EA', rowBorder:'#A7D99F',
    badgeBg:'#D1FAE5', badgeText:'#065F46',
    tabActive:'#059669', tabActiveTxt:'#fff',
  },
  feedback: {
    id:'feedback', label:'Feedback', icon:'🔄',
    pageBg:'#FDF5F5', headerBg:'#FEF2F2', border:'#FCA5A5',
    accent:'#DC2626', textDark:'#791F1F', textMid:'#A32D2D', textLight:'#DC2626',
    kpiBg:'#FEF2F2', kpiBorder:'#FCA5A5',
    rowBg:'#FEF2F2', rowBorder:'#FCA5A5',
    badgeBg:'#FEE2E2', badgeText:'#991B1B',
    tabActive:'#DC2626', tabActiveTxt:'#fff',
  },
};

export const PAGE_MOD = {
  '/sales/home':          null,
  '/sales/import':        'input',
  '/sales/conferences':   'input',
  '/sales/add-contact':   'input',
  '/sales/lead-scoring':  'input',
  '/sales/export':        'input',
  '/sales/contacts':      'process',
  '/sales':               'process',
  '/sales/assign':        'process',
  '/sales/tasks':         'process',
  '/sales/enrichment':    'process',
  '/sales/dedupe':        'process',
  '/sales/campaigns':     'process',
  '/sales/sequences':     'process',
  '/sales/whatsapp':      'process',
  '/sales/dashboard':     'output',
  '/sales/analytics':     'output',
  '/sales/activity':      'output',
  '/sales/territory':     'output',
  '/sales/digest':        'output',
  '/sales/settings':      'feedback',
  '/sales/notifications': 'feedback',
  '/sales/integrations':  'feedback',
};

export function ModHeader({ title, sub, mod }) {
  if (!mod) return null;
  const m = MOD[mod];
  return (
    <div style={{ background: m.headerBg, borderBottom: `1px solid ${m.border}`, padding: '14px 20px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:m.badgeBg, color:m.badgeText }}>{m.icon} {m.label}</span>
        <span style={{ color:m.border, fontSize:12 }}>/</span>
        <span style={{ fontSize:13, fontWeight:700, color:m.textDark }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:m.textMid }}>{sub}</div>}
    </div>
  );
}

export function KpiStrip({ kpis, mod }) {
  const m = MOD[mod];
  return (
    <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
      {kpis.map((k,i) => (
        <div key={i} style={{ background:m.kpiBg, border:`1px solid ${m.kpiBorder}`, borderRadius:9, padding:'10px 14px', flex:1, minWidth:110 }}>
          <div style={{ fontSize:10, color:m.textMid, marginBottom:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>{k.label}</div>
          <div style={{ fontSize:19, fontWeight:700, color:k.danger?'#DC2626':m.textDark }}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ComingSoonPage({ mod, title, desc, features = [] }) {
  const m = MOD[mod];
  return (
    <div style={{ minHeight:'60vh', background:m.pageBg, display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
      <div style={{ textAlign:'center', maxWidth:480 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:m.headerBg, border:`1px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px' }}>{m.icon}</div>
        <div style={{ fontSize:20, fontWeight:700, color:m.textDark, marginBottom:6 }}>{title}</div>
        <div style={{ fontSize:13, color:m.textMid, marginBottom:20, lineHeight:1.6 }}>{desc}</div>
        {features.length > 0 && (
          <div style={{ background:m.headerBg, border:`1px solid ${m.border}`, borderRadius:12, padding:'14px 18px', textAlign:'left', marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Planned features</div>
            {features.map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom: i<features.length-1?`1px solid ${m.border}`:'none' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:m.accent, flexShrink:0 }}/>
                <span style={{ fontSize:12, color:m.textDark }}>{f}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:m.badgeBg, color:m.badgeText, fontSize:11, fontWeight:600 }}>
          🚧 Coming soon — Week {mod==='input'?3:mod==='process'?4:5}
        </div>
      </div>
    </div>
  );
}
