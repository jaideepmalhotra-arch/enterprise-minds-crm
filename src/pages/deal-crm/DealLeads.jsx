import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../data/supabase.js';

const d = {
  pageBg:'#F2F9F0', headerBg:'#EDF7EA', border:'#A7D99F',
  accent:'#059669', textDark:'#27500A', textMid:'#3B6D11',
  kpiBg:'#EDF7EA', badgeBg:'#DCFCE7', badgeText:'#166534',
};

const STATUS_CONFIG = {
  new:          { label:'New',          bg:'#EFF6FF', color:'#1D4ED8' },
  contacted:    { label:'Contacted',    bg:'#FFFBEB', color:'#92600A' },
  qualified:    { label:'Qualified',    bg:'#ECFDF5', color:'#065F46' },
  disqualified: { label:'Disqualified', bg:'#F1F5F9', color:'#475569' },
  converted:    { label:'Converted',    bg:'#F5F3FF', color:'#534AB7' },
};

export default function DealLeads() {
  const [leads,   setLeads]   = useState([]);
  const [filter,  setFilter]  = useState('');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),2500); };

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('deal_leads').select('*').order('created_at',{ascending:false});
    if (filter) q = q.eq('status', filter);
    if (search) q = q.ilike('name', `%${search}%`);
    const { data } = await q;
    setLeads(data||[]);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    await supabase.from('deal_leads').update({ status }).eq('id', id);
    showToast(`Status updated to ${status}`);
    load();
  }

  async function convertToDeal(lead) {
    // Create account if not exists
    let accountId = null;
    if (lead.company) {
      const { data: existing } = await supabase.from('deal_accounts').select('id').ilike('name', lead.company).limit(1);
      if (existing?.length) {
        accountId = existing[0].id;
      } else {
        const { data: newAcc } = await supabase.from('deal_accounts').insert({ name:lead.company }).select('id').single();
        accountId = newAcc?.id;
      }
    }
    // Create deal
    const { data: pl } = await supabase.from('deal_pipelines').select('id,stages').eq('is_default',true).single();
    const firstStage = pl?.stages?.[0]?.id || 'qualified';
    await supabase.from('deals').insert({
      name: `${lead.company} — ${lead.name}`,
      account_id: accountId,
      stage: firstStage,
      pipeline_id: pl?.id,
      last_activity: new Date().toISOString(),
    });
    await supabase.from('deal_leads').update({ status:'converted' }).eq('id',lead.id);
    showToast(`${lead.name} converted to deal ✓`);
    load();
  }

  return (
    <div style={{ background:d.pageBg, minHeight:'100vh' }}>
      <div style={{ background:d.headerBg, borderBottom:`1px solid ${d.border}`, padding:'14px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:d.badgeBg, color:d.badgeText }}>💼 Deal CRM</span>
          <span style={{ color:d.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:d.textDark }}>Leads</span>
        </div>
        <div style={{ fontSize:11, color:d.textMid }}>Pre-qualified leads · convert to deal when ready</div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads…"
            style={{ flex:1, minWidth:180, border:`1px solid ${d.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontFamily:'inherit', background:'#fff', outline:'none' }} />
          <div style={{ display:'flex', gap:4 }}>
            {['','new','contacted','qualified','disqualified','converted'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)}
                style={{ padding:'5px 10px', borderRadius:20, fontSize:11, border:`1px solid ${filter===s?d.accent:d.border}`, background:filter===s?d.kpiBg:'#fff', color:filter===s?d.accent:'#64748B', cursor:'pointer', fontFamily:'inherit' }}>
                {s===''?'All':STATUS_CONFIG[s]?.label||s}
              </button>
            ))}
          </div>
          <span style={{ fontSize:12, color:'#64748B', marginLeft:'auto' }}>{leads.length} leads</span>
        </div>

        <div style={{ background:'#fff', border:`1px solid ${d.border}`, borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                {['Name','Company','Title','Email','Phone','Source','Status',''].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', background:d.kpiBg, borderBottom:`1px solid ${d.border}`, textAlign:'left', fontSize:9, color:d.textMid, fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#94A3B8' }}>Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#94A3B8' }}>No leads found</td></tr>
              ) : leads.map(lead=>{
                const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                return (
                  <tr key={lead.id} onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9', fontWeight:600, color:d.textDark }}>{lead.name}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B' }}>{lead.company||'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.title||'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9' }}>{lead.email?<a href={`mailto:${lead.email}`} style={{ color:d.accent }}>{lead.email}</a>:'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B' }}>{lead.phone||'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9' }}>{lead.source?<span style={{ padding:'2px 7px',borderRadius:20,fontSize:10,fontWeight:600,background:'#F1F5F9',color:'#475569' }}>{lead.source}</span>:'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9' }}>
                      <select value={lead.status} onChange={e=>updateStatus(lead.id,e.target.value)}
                        style={{ padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:600, border:`1px solid ${d.border}`, background:sc.bg, color:sc.color, cursor:'pointer', fontFamily:'inherit' }}>
                        {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9' }}>
                      {lead.status !== 'converted' && lead.status !== 'disqualified' && (
                        <button onClick={()=>convertToDeal(lead)}
                          style={{ padding:'4px 10px', background:d.accent, color:'#fff', border:'none', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                          Convert →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div style={{ position:'fixed',bottom:20,right:20,background:'#0F172A',color:'#fff',padding:'10px 16px',borderRadius:8,fontSize:12,zIndex:999 }}>{toast}</div>}
    </div>
  );
}
