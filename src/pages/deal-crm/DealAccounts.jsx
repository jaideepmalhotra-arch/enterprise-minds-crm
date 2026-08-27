import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../data/supabase.js';
import { useNavigate } from 'react-router-dom';

const d = {
  pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
  accent:'#059669', textDark:'#27500A', textMid:'#3B6D11',
  kpiBg:'#EDF7EA', badgeBg:'#DCFCE7', badgeText:'#166534',
};

function AddAccountModal({ onClose, onSaved }) {
  const [name,    setName]    = useState('');
  const [website, setWebsite] = useState('');
  const [industry,setIndustry]= useState('');
  const [country, setCountry] = useState('');
  const [size,    setSize]    = useState('');
  const [saving,  setSaving]  = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('deal_accounts').insert({ name:name.trim(), website:website||null, industry:industry||null, country:country||null, size:size||null });
    setSaving(false); onSaved(); onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:400 }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'#fff',borderRadius:12,width:400,zIndex:401,overflow:'hidden' }}>
        <div style={{ padding:'14px 18px',borderBottom:`1px solid ${d.border}`,fontSize:14,fontWeight:700,color:d.textDark }}>Add account</div>
        <div style={{ padding:18,display:'flex',flexDirection:'column',gap:10 }}>
          {[['Company name *',name,setName,'text','e.g. Deloitte'],['Website',website,setWebsite,'text','e.g. deloitte.com'],['Industry',industry,setIndustry,'text','e.g. Consulting'],['Country',country,setCountry,'text','e.g. United Kingdom'],['Size',size,setSize,'text','e.g. 10,000+']].map(([label,val,set,type,ph])=>(
            <div key={label}>
              <div style={{ fontSize:11,fontWeight:600,color:d.textMid,marginBottom:4 }}>{label}</div>
              <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
                style={{ width:'100%',border:`1px solid ${d.border}`,borderRadius:7,padding:'7px 10px',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 18px',borderTop:`1px solid ${d.border}`,display:'flex',gap:8,justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 14px',border:`1px solid ${d.border}`,borderRadius:7,fontSize:12,cursor:'pointer',background:'#fff',fontFamily:'inherit' }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ padding:'7px 16px',background:d.accent,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
            {saving?'Saving…':'Add account'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function DealAccounts() {
  const navigate   = useNavigate();
  const [accounts, setAccounts]  = useState([]);
  const [search,   setSearch]    = useState('');
  const [loading,  setLoading]   = useState(true);
  const [showModal,setShowModal] = useState(false);
  const [drawer,   setDrawer]    = useState(null);
  const [drawerDeals, setDrawerDeals] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('deal_accounts').select('*').order('name');
    if (search) q = q.ilike('name', `%${search}%`);
    const { data: accs } = await q;

    // Enrich with deal counts
    const enriched = await Promise.all((accs||[]).map(async acc => {
      const { data: deals } = await supabase.from('deals').select('id,value,stage,rotting').eq('account_id', acc.id);
      const open = (deals||[]).filter(d=>!['won','lost'].includes(d.stage));
      const won  = (deals||[]).filter(d=>d.stage==='won');
      const rotting = open.filter(d=>d.rotting).length;
      return {
        ...acc,
        openDeals:  open.length,
        wonDeals:   won.length,
        totalValue: open.reduce((s,d)=>s+(d.value||0),0),
        rotting,
      };
    }));
    setAccounts(enriched);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function openDrawer(acc) {
    setDrawer(acc);
    const { data } = await supabase.from('deals').select('id,name,value,stage,close_date,rotting').eq('account_id',acc.id).order('created_at',{ascending:false});
    setDrawerDeals(data||[]);
  }

  const fmt = v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v||0}`;

  return (
    <div style={{ background:d.pageBg, minHeight:'100vh' }}>
      <div style={{ background:d.headerBg, borderBottom:`1px solid ${d.border}`, padding:'14px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:d.badgeBg, color:d.badgeText }}>💼 Deal CRM</span>
          <span style={{ color:d.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:d.textDark }}>Accounts</span>
        </div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search accounts…"
            style={{ flex:1, border:`1px solid ${d.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontFamily:'inherit', background:'#fff', outline:'none' }} />
          <button onClick={()=>setShowModal(true)}
            style={{ padding:'7px 14px', background:d.accent, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            + Add account
          </button>
        </div>

        <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr>
              {['Account','Industry','Region','Size','Open deals','Pipeline value','Last activity',''].map(h=>(
                <th key={h} style={{ padding:'8px 12px', background:d.kpiBg, borderBottom:`1px solid ${d.border}`, textAlign:'left', fontSize:9, color:d.textMid, fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#94A3B8' }}>Loading…</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#94A3B8' }}>No accounts yet. Add your first account above.</td></tr>
              ) : accounts.map(acc=>(
                <tr key={acc.id} onClick={()=>openDrawer(acc)} style={{ cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9' }}>
                    <div style={{ fontWeight:600, color:d.textDark }}>{acc.name}</div>
                    {acc.website && <a href={`https://${acc.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:10, color:d.accent }}>{acc.website}</a>}
                  </td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B' }}>{acc.industry||'—'}</td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9' }}>{acc.country?<span style={{ padding:'2px 7px',borderRadius:20,fontSize:10,fontWeight:600,background:'#F1F5F9',color:'#475569' }}>{acc.country}</span>:'—'}</td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B' }}>{acc.size||'—'}</td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9' }}>
                    {acc.openDeals > 0 ? (
                      <span style={{ padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600,background:acc.rotting>0?'#FEF2F2':d.badgeBg,color:acc.rotting>0?'#a32d2d':d.badgeText }}>
                        {acc.openDeals}{acc.rotting>0?` (${acc.rotting} rotting)`:''}
                      </span>
                    ) : <span style={{ color:'#94A3B8' }}>—</span>}
                  </td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', fontWeight:600, color:d.accent }}>{acc.totalValue>0?fmt(acc.totalValue):'—'}</td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B', fontSize:11 }}>{acc.updated_at?new Date(acc.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</td>
                  <td style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9' }}>
                    <span style={{ fontSize:11, color:d.accent, fontWeight:600 }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <>
          <div onClick={()=>{setDrawer(null);setDrawerDeals([]);}} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.3)',zIndex:400 }} />
          <div style={{ position:'fixed',right:0,top:0,bottom:0,width:420,background:'#fff',zIndex:401,overflowY:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.12)' }}>
            <div style={{ background:d.headerBg,padding:'16px 18px',borderBottom:`1px solid ${d.border}`,position:'sticky',top:0 }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4 }}>
                <div style={{ fontSize:15,fontWeight:700,color:d.textDark }}>{drawer.name}</div>
                <button onClick={()=>{setDrawer(null);setDrawerDeals([]);}} style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#64748B' }}>✕</button>
              </div>
              {drawer.website && <a href={`https://${drawer.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" style={{ fontSize:11,color:d.accent }}>{drawer.website}</a>}
              <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
                {drawer.industry && <span style={{ padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:d.badgeBg,color:d.badgeText }}>{drawer.industry}</span>}
                {drawer.country  && <span style={{ padding:'2px 8px',borderRadius:20,fontSize:10,background:'#F1F5F9',color:'#475569' }}>📍 {drawer.country}</span>}
                {drawer.size     && <span style={{ padding:'2px 8px',borderRadius:20,fontSize:10,background:'#F1F5F9',color:'#475569' }}>👥 {drawer.size}</span>}
              </div>
            </div>
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:11,fontWeight:700,color:d.textMid,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:8 }}>Deals ({drawerDeals.length})</div>
              {drawerDeals.length === 0 ? (
                <div style={{ color:'#94A3B8',fontSize:12 }}>No deals for this account yet</div>
              ) : drawerDeals.map(deal=>(
                <div key={deal.id} onClick={()=>navigate(`/deals/pipeline/${deal.id}`)}
                  style={{ background:deal.rotting?'#FFF8F8':'#F8FAFC',border:`1px solid ${deal.rotting?'#FCA5A5':d.border}`,borderRadius:8,padding:'10px 12px',marginBottom:8,cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=d.accent}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=deal.rotting?'#FCA5A5':d.border}>
                  <div style={{ fontSize:12,fontWeight:600,color:d.textDark,marginBottom:3 }}>{deal.name}</div>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    <span style={{ padding:'2px 7px',borderRadius:20,fontSize:10,fontWeight:600,background:d.kpiBg,color:d.textMid }}>{deal.stage}</span>
                    <span style={{ fontSize:12,fontWeight:700,color:d.accent }}>{fmt(deal.value)}</span>
                  </div>
                  {deal.rotting && <div style={{ marginTop:5,fontSize:10,color:'#a32d2d' }}>🔥 Rotting — no recent activity</div>}
                </div>
              ))}
              <button onClick={()=>navigate('/deals/pipeline')}
                style={{ marginTop:8,width:'100%',padding:'8px',background:d.accent,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>
                + Add deal for this account
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && <AddAccountModal onClose={()=>setShowModal(false)} onSaved={()=>{load();}} />}
    </div>
  );
}
