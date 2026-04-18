import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { assignLeads } from '../data/api.js';
import { useSales } from '../data/SalesContext.jsx';
import { RepAvatar, QuotaBar, SectionLabel, Btn, Toast } from '../components/UI.jsx';
import { StarRating } from '../components/ContactDrawer.jsx';
import ContactDrawer from '../components/ContactDrawer.jsx';

const COUNTRIES = ['India','UAE','Saudi Arabia','United States','United Kingdom','Singapore','Malaysia','Germany','France','Australia','Canada'];

export default function AssignmentDesk() {
  const { reps, quotas, assignedCounts, refresh } = useSales();
  const [leads,         setLeads]         = useState([]);
  const [selected,      setSelected]      = useState(new Set());
  const [rep,           setRep]           = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [fetching,      setFetching]      = useState(true);
  const [country,       setCountry]       = useState('');
  const [search,        setSearch]        = useState('');
  const [totalCount,    setTotalCount]    = useState(0);
  const [drawerContact, setDrawerContact] = useState(null);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const loadLeads = useCallback(async () => {
    setFetching(true);
    try {
      // Use RPC to avoid URL length limit with NOT IN
      const { data, error } = await supabase.rpc('get_unassigned_leads', {
        p_country: country || null,
        p_tier:    null,
      });
      if (error) throw error;
      const all = data || [];
      // Client-side search filter
      const filtered = search
        ? all.filter(l => (l.company||'').toLowerCase().includes(search.toLowerCase()) || (l.country||'').toLowerCase().includes(search.toLowerCase()) || (l.contact||'').toLowerCase().includes(search.toLowerCase()))
        : all;
      setLeads(filtered);
      setTotalCount(all.length);
    } catch(e) { console.error('Load failed:', e.message); }
    finally { setFetching(false); }
  }, [country, search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Also load total unassigned count separately
  useEffect(() => {
    supabase.rpc('get_unassigned_leads', { p_country: null, p_tier: null })
      .then(({ data }) => setTotalCount((data||[]).length));
  }, []);

  function toggleRow(id) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function selectAll() { setSelected(new Set(leads.map(l => l.id))); }
  function clearAll()  { setSelected(new Set()); setRep(null); }

  async function doAssign() {
    if (!rep || selected.size === 0) return;
    setLoading(true);
    try {
      await assignLeads({ leadIds: [...selected], repId: rep, assignedBy: 'JM' });
      const repName = reps.find(r => r.id === rep)?.name || rep;
      showToast(`${selected.size} leads assigned to ${repName} ✓`);
      setSelected(new Set()); setRep(null);
      await Promise.all([loadLeads(), refresh()]);
    } catch(e) { showToast('Assignment failed: ' + e.message, 'error'); }
    finally { setLoading(false); }
  }

  const selectedRep  = reps.find(r => r.id === rep);
  const newQuota     = rep ? (assignedCounts[rep] || 0) + selected.size : 0;
  const maxQuota     = rep ? (quotas[rep] || 50) : 50;
  const overQuota    = newQuota > maxQuota;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', minHeight:'calc(100vh - 52px)' }}>

      {/* Left — lead list */}
      <div style={{ padding:'16px 20px', overflowY:'auto' }}>

        {/* Stats strip */}
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {[
            ['Unassigned', totalCount, '#7C3AED'],
            ['Showing',    leads.length, '#0F172A'],
            ['Selected',   selected.size, '#1A56DB'],
            ['In pipeline', (assignedCounts ? Object.values(assignedCounts).reduce((a,b)=>a+b,0) : 0), '#10B981'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'#F0EEFE', border:'1px solid #C4B5FD', borderRadius:9, padding:'8px 14px', flex:1, minWidth:100 }}>
              <div style={{ fontSize:10, color:'#534AB7', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:c }}>{v.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search company, contact, country..."
            style={{ flex:1, minWidth:180, border:'1px solid #C4B5FD', borderRadius:8, padding:'6px 12px', fontSize:12, fontFamily:'inherit', background:'#F4F2FE' }} />
          <select value={country} onChange={e=>setCountry(e.target.value)}
            style={{ border:'1px solid #C4B5FD', borderRadius:7, padding:'5px 9px', fontSize:11, background:'#F4F2FE', color:'#3C3489' }}>
            <option value="">All countries</option>
            {COUNTRIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <button onClick={selectAll} style={{ padding:'5px 11px', background:'transparent', border:'1px solid #C4B5FD', borderRadius:7, fontSize:11, cursor:'pointer', color:'#534AB7' }}>Select all</button>
          <button onClick={clearAll}  style={{ padding:'5px 11px', background:'transparent', border:'1px solid #C4B5FD', borderRadius:7, fontSize:11, cursor:'pointer', color:'#534AB7' }}>Clear</button>
          <span style={{ fontSize:12, color:'#64748B', marginLeft:'auto' }}>{selected.size} selected · {leads.length} shown</span>
        </div>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid #C4B5FD', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, tableLayout:'fixed' }}>
            <thead>
              <tr>
                <th style={{ width:36, padding:'8px 12px', background:'#F0EEFE', borderBottom:'1px solid #C4B5FD', textAlign:'left' }}>
                  <input type="checkbox" onChange={e=>e.target.checked?selectAll():clearAll()} checked={selected.size===leads.length&&leads.length>0} />
                </th>
                {['Company','Contact','Country','Quality','Source','Imported'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', background:'#F0EEFE', borderBottom:'1px solid #C4B5FD', textAlign:'left', fontSize:9, letterSpacing:'.07em', textTransform:'uppercase', color:'#534AB7', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#94A3B8' }}>Loading unassigned leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>✓</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#475569' }}>No unassigned leads</div>
                  <div style={{ fontSize:11, marginTop:4 }}>All contacts are in the pipeline</div>
                </td></tr>
              ) : leads.map(lead=>(
                <tr key={lead.id} style={{ cursor:'pointer', background:selected.has(lead.id)?'#F0EEFE':'transparent' }}
                  onMouseEnter={e=>{ if(!selected.has(lead.id)) e.currentTarget.style.background='#F9F8FF'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=selected.has(lead.id)?'#F0EEFE':'transparent'; }}>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9' }} onClick={()=>toggleRow(lead.id)}>
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={()=>toggleRow(lead.id)} onClick={e=>e.stopPropagation()} />
                  </td>
                  <td style={{ padding:'9px 12px', fontWeight:600, borderBottom:'1px solid #F1F5F9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#3C3489' }} onClick={()=>setDrawerContact(lead.id)}>{lead.company}</td>
                  <td style={{ padding:'9px 12px', color:'#64748B', borderBottom:'1px solid #F1F5F9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} onClick={()=>setDrawerContact(lead.id)}>{lead.contact||'—'}</td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9', color:'#64748B' }} onClick={()=>setDrawerContact(lead.id)}>{lead.country||'—'}</td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #F1F5F9' }} onClick={()=>setDrawerContact(lead.id)}><StarRating contact={lead} size={11} showScore /></td>
                  <td style={{ padding:'9px 12px', color:'#64748B', borderBottom:'1px solid #F1F5F9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} onClick={()=>setDrawerContact(lead.id)}>{lead.source||'—'}</td>
                  <td style={{ padding:'9px 12px', color:'#94A3B8', borderBottom:'1px solid #F1F5F9' }} onClick={()=>setDrawerContact(lead.id)}>{lead.imported_at?new Date(lead.imported_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right — assign panel */}
      <div style={{ background:'#fff', borderLeft:'1px solid #C4B5FD', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid #E4E8F0', background:'#F0EEFE' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#3C3489', marginBottom:2 }}>Assign to rep</div>
          <div style={{ fontSize:11, color:'#7C3AED' }}>{selected.size>0?`${selected.size} leads selected`:'Select leads first'}</div>
        </div>

        <div style={{ padding:'16px 18px', flex:1, display:'flex', flexDirection:'column', gap:14, overflowY:'auto' }}>
          {selected.size === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:8, color:'#94A3B8', textAlign:'center', padding:40 }}>
              <div style={{ fontSize:28 }}>←</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#475569' }}>No leads selected</div>
              <div style={{ fontSize:11 }}>Click rows to select leads</div>
            </div>
          ) : (
            <>
              {/* Selected preview */}
              <div>
                <SectionLabel>Selected ({selected.size})</SectionLabel>
                <div style={{ background:'#F4F2FE', border:'1px solid #C4B5FD', borderRadius:8, padding:'10px 12px', maxHeight:160, overflowY:'auto' }}>
                  {leads.filter(l=>selected.has(l.id)).map(l=>(
                    <div key={l.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid #DDD6FE', fontSize:11 }}>
                      <span style={{ fontWeight:600, color:'#3C3489', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{l.company}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                        <span style={{ color:'#94A3B8', fontSize:10 }}>{l.country}</span>
                        <button onClick={()=>toggleRow(l.id)} style={{ width:16, height:16, borderRadius:'50%', background:'#FEF2F2', border:'none', cursor:'pointer', fontSize:9, color:'#A32D2D' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rep picker */}
              <div>
                <SectionLabel>Assign to</SectionLabel>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {reps.filter(r=>r.active).map(r=>(
                    <div key={r.id} onClick={()=>setRep(r.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:`1px solid ${rep===r.id?'#7C3AED':'#E4E8F0'}`, borderRadius:9, cursor:'pointer', background:rep===r.id?'#F0EEFE':'#fff', transition:'all .15s' }}>
                      <RepAvatar repId={r.id} repInitials={r.initials} colorBg={r.color_bg} colorText={r.color_text} size={32} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{r.name}</div>
                        <div style={{ fontSize:10, color:'#64748B' }}>{r.focus||'No region set'}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background: rep===r.id?'#EDE9FE':'#F1F5F9', color: rep===r.id?'#4C1D95':'#475569' }}>
                        {assignedCounts[r.id]||0}/{quotas[r.id]||50}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {rep && (
                <div style={{ background:overQuota?'#FEF2F2':'#F0EEFE', border:`1px solid ${overQuota?'#FCA5A5':'#C4B5FD'}`, borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:overQuota?'#991B1B':'#3C3489', marginBottom:6 }}>{overQuota?'⚠ Over quota':'Summary'}</div>
                  {[['Leads to assign', selected.size], ['Assigning to', selectedRep?.name], ['New total', `${newQuota} / ${maxQuota}`]].map(([l,v])=>(
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:11, padding:'2px 0' }}>
                      <span style={{ color:'#64748B' }}>{l}</span>
                      <span style={{ fontWeight:600, color:overQuota&&l==='New total'?'#991B1B':'#0F172A' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Assign button */}
              <button onClick={doAssign} disabled={!rep||loading}
                style={{ padding:11, background:rep?'#7C3AED':'#F1F5F9', color:rep?'#fff':'#94A3B8', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:rep?'pointer':'not-allowed', width:'100%', fontFamily:'inherit' }}>
                {loading ? 'Assigning...' : rep ? `Assign ${selected.size} → ${selectedRep?.name}` : 'Select a rep above'}
              </button>
            </>
          )}
        </div>
      </div>

      {drawerContact && <ContactDrawer leadId={drawerContact} onClose={()=>setDrawerContact(null)} onSaved={loadLeads} />}
      <Toast toast={toast} />
    </div>
  );
}
