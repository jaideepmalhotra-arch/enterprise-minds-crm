import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../data/supabase.js';
import { Toast } from '../components/UI.jsx';

const m = {
  pageBg: '#F2F7FD', headerBg: '#EBF4FD', border: '#B5D4F4',
  accent: '#2563EB', textDark: '#0C447C', textMid: '#185FA5',
  kpiBg: '#EBF4FD', kpiBorder: '#B5D4F4',
  badgeBg: '#DBEAFE', badgeText: '#1E40AF',
};

const BLUE_RAMP = ['#EFF6FF','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#2563EB','#1D4ED8'];

function countryFill(count, max) {
  if (!count) return '#EFF6FF';
  const t = Math.min(count / Math.max(max * 0.6, 1), 1);
  return BLUE_RAMP[Math.min(Math.floor(t * BLUE_RAMP.length), BLUE_RAMP.length - 1)];
}

// Load D3 + topojson from CDN scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

const ISO_TO_NAME = {
  4:'Afghanistan',8:'Albania',12:'Algeria',24:'Angola',32:'Argentina',36:'Australia',
  40:'Austria',50:'Bangladesh',56:'Belgium',76:'Brazil',100:'Bulgaria',116:'Cambodia',
  120:'Cameroon',124:'Canada',144:'Sri Lanka',152:'Chile',156:'China',170:'Colombia',
  191:'Croatia',203:'Czechia',208:'Denmark',818:'Egypt',231:'Ethiopia',246:'Finland',
  250:'France',276:'Germany',288:'Ghana',300:'Greece',356:'India',360:'Indonesia',
  364:'Iran',368:'Iraq',372:'Ireland',376:'Israel',380:'Italy',392:'Japan',
  400:'Jordan',398:'Kazakhstan',404:'Kenya',410:'South Korea',414:'Kuwait',
  422:'Lebanon',504:'Morocco',484:'Mexico',528:'Netherlands',554:'New Zealand',
  566:'Nigeria',578:'Norway',512:'Oman',586:'Pakistan',604:'Peru',608:'Philippines',
  616:'Poland',620:'Portugal',634:'Qatar',642:'Romania',643:'Russia',682:'Saudi Arabia',
  710:'South Africa',724:'Spain',752:'Sweden',756:'Switzerland',764:'Thailand',
  792:'Turkey',800:'Uganda',804:'Ukraine',784:'United Arab Emirates',826:'United Kingdom',
  840:'United States',704:'Vietnam',887:'Yemen',716:'Zimbabwe',
};

const NAME_ALIAS = {
  'United Arab Emirates': 'UAE',
  'United States of America': 'United States',
  'Russian Federation': 'Russia',
  'Viet Nam': 'Vietnam',
  'Republic of Korea': 'South Korea',
  'Czech Republic': 'Czechia',
  'Syrian Arab Republic': 'Syria',
  'Islamic Republic of Iran': 'Iran',
};

function WorldMap({ countryData, selectedCountry, onCountryClick }) {
  const svgRef  = useRef(null);
  const [ready, setReady]   = useState(false);
  const [paths, setPaths]   = useState([]);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, name: '', count: 0 });
  const W = 900, H = 420;

  useEffect(() => {
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js'),
    ]).then(() => fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'))
      .then(r => r.json())
      .then(world => {
        const d3 = window.d3;
        const topo = window.topojson;
        const countries = topo.feature(world, world.objects.countries);
        const proj = d3.geoNaturalEarth1().scale(W / 6.3).translate([W / 2, H / 2]);
        const pathGen = d3.geoPath().projection(proj);
        const graticule = d3.geoGraticule()();

        const built = countries.features.map((f, i) => {
          const num  = parseInt(f.id);
          const raw  = ISO_TO_NAME[num] || '';
          const name = NAME_ALIAS[raw] || raw;
          const d    = pathGen(f);
          return { i, name, d };
        }).filter(p => p.d);

        setPaths([{ name: '__graticule__', d: pathGen(graticule), i: -1 }, ...built]);
        setReady(true);
      }).catch(e => console.error('Map load error', e));
  }, []);

  const maxCount = useMemo(() => Math.max(...Object.values(countryData), 1), [countryData]);

  return (
    <div style={{ position: 'relative', background: '#EFF6FF', borderRadius: 10, overflow: 'hidden', border: `1px solid ${m.border}` }}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <rect width={W} height={H} fill="#EFF6FF" />
        {!ready && (
          <text x={W/2} y={H/2} textAnchor="middle" fill="#94A3B8" fontSize={14}>Loading map…</text>
        )}
        {paths.map(({ name, d, i }) => {
          if (name === '__graticule__') return (
            <path key="graticule" d={d} fill="none" stroke="#DBEAFE" strokeWidth={0.3} />
          );
          const count = countryData[name] || 0;
          const isSel = name === selectedCountry;
          return (
            <path key={i} d={d}
              fill={isSel ? '#F59E0B' : countryFill(count, maxCount)}
              stroke={isSel ? '#D97706' : '#fff'}
              strokeWidth={isSel ? 1.2 : 0.35}
              style={{ cursor: count > 0 ? 'pointer' : 'default', transition: 'fill .12s' }}
              onMouseEnter={e => {
                if (!count) return;
                const rect = svgRef.current?.getBoundingClientRect();
                setTooltip({ show: true, x: e.clientX - (rect?.left||0), y: e.clientY - (rect?.top||0), name, count });
              }}
              onMouseLeave={() => setTooltip(t => ({ ...t, show: false }))}
              onClick={() => count > 0 && onCountryClick(name)}
            />
          );
        })}
      </svg>

      {tooltip.show && (
        <div style={{ position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 8, background: '#0F172A', color: '#fff', borderRadius: 7, padding: '5px 10px', fontSize: 11, pointerEvents: 'none', zIndex: 20, whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 700 }}>{tooltip.name}</div>
          <div style={{ color: '#93C5FD', fontSize: 10 }}>{tooltip.count.toLocaleString()} companies</div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
        {['#DBEAFE','#93C5FD','#3B82F6','#1D4ED8'].map((c, i) => (
          <div key={i} style={{ width: 14, height: 8, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ fontSize: 9, color: '#64748B', marginLeft: 4 }}>Low → High density</span>
      </div>

      {selectedCountry && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#92600A', display: 'flex', alignItems: 'center', gap: 6 }}>
          📍 {selectedCountry}
          <button onClick={() => onCountryClick(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#92600A', lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompanyMapPage() {
  const [companies,       setCompanies]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [techFilter,      setTechFilter]      = useState('');
  const [industryFilter,  setIndustryFilter]  = useState('');
  const [search,          setSearch]          = useState('');
  const [toast,           setToast]           = useState(null);
  const [drillCompany,    setDrillCompany]    = useState(null);
  const [contacts,        setContacts]        = useState([]);
  const [contactLoading,  setContactLoading]  = useState(false);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const all = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase.from('companies')
            .select('id, name, website, country, industry, size, ai_enrichment, ai_enriched_at')
            .range(from, from + 999);
          if (error) throw error;
          if (!data?.length) break;
          all.push(...data);
          if (data.length < 1000) break;
          from += 1000;
        }
        setCompanies(all);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const allTechs = useMemo(() => {
    const mp = new Map();
    companies.forEach(c => (c.ai_enrichment?.tech_stack||[]).forEach(t => { if(t) mp.set(t,(mp.get(t)||0)+1); }));
    return [...mp.entries()].sort((a,b)=>b[1]-a[1]).slice(0,80);
  }, [companies]);

  const allIndustries = useMemo(() => {
    const mp = new Map();
    companies.forEach(c => { const ind=c.ai_enrichment?.industry||c.industry; if(ind) mp.set(ind,(mp.get(ind)||0)+1); });
    return [...mp.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40);
  }, [companies]);

  const filtered = useMemo(() => {
    let r = companies;
    if (search)         { const q=search.toLowerCase(); r=r.filter(c=>(c.name||'').toLowerCase().includes(q)||(c.country||'').toLowerCase().includes(q)); }
    if (techFilter)     r = r.filter(c=>(c.ai_enrichment?.tech_stack||[]).includes(techFilter));
    if (industryFilter) r = r.filter(c=>(c.ai_enrichment?.industry||c.industry||'')===industryFilter);
    if (selectedCountry) r = r.filter(c=>(c.country||c.ai_enrichment?.country)===selectedCountry);
    return r;
  }, [companies, search, techFilter, industryFilter, selectedCountry]);

  const countryData = useMemo(() => {
    const mp = {};
    companies.forEach(c => { const co=c.country||c.ai_enrichment?.country; if(co) mp[co]=(mp[co]||0)+1; });
    return mp;
  }, [companies]);

  const countryList = useMemo(() => {
    const mp = {};
    filtered.forEach(c => { const co=c.country||c.ai_enrichment?.country||'Unknown'; mp[co]=(mp[co]||0)+1; });
    return Object.entries(mp).sort((a,b)=>b[1]-a[1]);
  }, [filtered]);

  const knownList    = useMemo(() => countryList.filter(([k])=>k!=='Unknown'), [countryList]);
  const unknownCount = useMemo(() => companies.filter(c=>!c.country&&!c.ai_enrichment?.country).length, [companies]);

  async function drillIntoCompany(company) {
    setDrillCompany(company);
    setContactLoading(true);
    const { data } = await supabase.from('leads')
      .select('id, contact, role, email, phone, linkedin, importance')
      .eq('company_id', company.id)
      .not('contact','is',null).neq('contact','')
      .order('contact').limit(30);
    setContacts(data||[]);
    setContactLoading(false);
  }

  function handleCountryClick(name) {
    if (!name || name===selectedCountry) { setSelectedCountry(null); setDrillCompany(null); }
    else { setSelectedCountry(name); setDrillCompany(null); }
  }

  const IMP = { hot:'🔴', warm:'🟡', cold:'🔵', not_relevant:'⬜' };
  const enrichedCount = filtered.filter(c=>c.ai_enriched_at).length;

  return (
    <div style={{ background:m.pageBg, minHeight:'100vh' }}>
      <div style={{ background:m.headerBg, borderBottom:`1px solid ${m.border}`, padding:'14px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:'#DCFCE7', color:'#166534' }}>📤 Output</span>
          <span style={{ color:m.border }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:m.textDark }}>Company Map</span>
        </div>
        <div style={{ fontSize:11, color:m.textMid }}>Country distribution · tech stack & industry filters · company drill-down</div>
      </div>

      <div style={{ padding:'16px 20px' }}>
        {/* KPIs */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {[
            ['Total companies', companies.length, m.textDark],
            ['Filtered',        filtered.length,   m.accent],
            ['Countries',       knownList.length,  '#059669'],
            ['AI enriched',     enrichedCount,     '#7C3AED'],
            ['No country',      unknownCount,      '#94A3B8'],
          ].map(([l,v,c])=>(
            <div key={l} style={{ background:m.kpiBg, border:`1px solid ${m.kpiBorder}`, borderRadius:9, padding:'8px 14px', flex:1, minWidth:100 }}>
              <div style={{ fontSize:10, color:m.textMid, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:c }}>{typeof v==='number'?v.toLocaleString():v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or country…"
            style={{ flex:1, minWidth:180, border:`1px solid ${m.border}`, borderRadius:8, padding:'6px 12px', fontSize:12, background:'#fff', fontFamily:'inherit' }} />
          <select value={techFilter} onChange={e=>setTechFilter(e.target.value)}
            style={{ border:`1px solid ${techFilter?'#7C3AED':m.border}`, borderRadius:7, padding:'5px 9px', fontSize:11, background:techFilter?'#F5F3FF':'#fff', color:techFilter?'#3C3489':'#64748B', fontFamily:'inherit', minWidth:155 }}>
            <option value="">All technologies</option>
            {allTechs.map(([t,n])=><option key={t} value={t}>{t} ({n})</option>)}
          </select>
          <select value={industryFilter} onChange={e=>setIndustryFilter(e.target.value)}
            style={{ border:`1px solid ${industryFilter?'#059669':m.border}`, borderRadius:7, padding:'5px 9px', fontSize:11, background:industryFilter?'#ECFDF5':'#fff', color:industryFilter?'#065F46':'#64748B', fontFamily:'inherit', minWidth:155 }}>
            <option value="">All industries</option>
            {allIndustries.map(([ind,n])=><option key={ind} value={ind}>{ind} ({n})</option>)}
          </select>
          {(selectedCountry||techFilter||industryFilter||search) && (
            <button onClick={()=>{setSelectedCountry(null);setTechFilter('');setIndustryFilter('');setSearch('');setDrillCompany(null);}}
              style={{ padding:'5px 12px', border:`1px solid ${m.border}`, borderRadius:7, fontSize:11, cursor:'pointer', background:'#fff', color:'#64748B', fontFamily:'inherit' }}>
              Clear all ×
            </button>
          )}
        </div>

        {/* Active chips */}
        {(selectedCountry||techFilter||industryFilter) && (
          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
            {selectedCountry && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'#FFFBEB', color:'#92600A', border:'1px solid #FCD34D' }}>📍 {selectedCountry} <button onClick={()=>{setSelectedCountry(null);setDrillCompany(null);}} style={{ background:'none',border:'none',cursor:'pointer',color:'#92600A',fontSize:13,marginLeft:2 }}>×</button></span>}
            {techFilter && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'#F5F3FF', color:'#3C3489', border:'1px solid #C4B5FD' }}>⚡ {techFilter} <button onClick={()=>setTechFilter('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#3C3489',fontSize:13,marginLeft:2 }}>×</button></span>}
            {industryFilter && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'#ECFDF5', color:'#065F46', border:'1px solid #86EFAC' }}>🏭 {industryFilter} <button onClick={()=>setIndustryFilter('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#065F46',fontSize:13,marginLeft:2 }}>×</button></span>}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#94A3B8' }}>
            <div style={{ fontSize:20, marginBottom:8 }}>⋯</div>Loading companies…
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:16 }}>
            {/* Left */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <WorldMap countryData={countryData} selectedCountry={selectedCountry} onCountryClick={handleCountryClick} />

              {/* Country list */}
              <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:10, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', background:m.kpiBg, borderBottom:`1px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:m.textDark }}>
                    {selectedCountry ? `${selectedCountry} · ${filtered.length} companies` : `All countries · ${knownList.length} mapped`}
                  </span>
                  {selectedCountry && <button onClick={()=>{setSelectedCountry(null);setDrillCompany(null);}} style={{ fontSize:11, color:m.accent, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Show all ×</button>}
                </div>

                {selectedCountry ? (
                  <div style={{ maxHeight:340, overflowY:'auto' }}>
                    {filtered.length===0 ? (
                      <div style={{ padding:24, textAlign:'center', color:'#94A3B8', fontSize:12 }}>No companies match filters</div>
                    ) : filtered.map(co => {
                      const e = co.ai_enrichment||{};
                      return (
                        <div key={co.id} onClick={()=>drillIntoCompany(co)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'1px solid #F1F5F9', cursor:'pointer', background:drillCompany?.id===co.id?m.kpiBg:'transparent' }}
                          onMouseEnter={ev=>{if(drillCompany?.id!==co.id)ev.currentTarget.style.background='#F8FAFC';}}
                          onMouseLeave={ev=>{ev.currentTarget.style.background=drillCompany?.id===co.id?m.kpiBg:'transparent';}}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:m.textDark, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{co.name}</div>
                            <div style={{ fontSize:10, color:'#64748B', marginTop:1 }}>{e.industry||co.industry||'—'}{e.size?` · ${e.size}`:''}</div>
                            {(e.tech_stack||[]).slice(0,3).length>0 && (
                              <div style={{ marginTop:3 }}>
                                {e.tech_stack.slice(0,3).map((t,j)=><span key={j} style={{ padding:'1px 5px', borderRadius:20, fontSize:9, fontWeight:600, background:m.badgeBg, color:m.badgeText, marginRight:3 }}>{t}</span>)}
                                {e.tech_stack.length>3 && <span style={{ fontSize:9, color:'#94A3B8' }}>+{e.tech_stack.length-3}</span>}
                              </div>
                            )}
                          </div>
                          {co.ai_enriched_at && <span style={{ fontSize:9, color:'#059669', fontWeight:700 }}>✦</span>}
                          <span style={{ fontSize:10, color:m.accent }}>→</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ maxHeight:340, overflowY:'auto' }}>
                    {knownList.map(([country, count])=>{
                      const maxC = Math.max(...knownList.map(([,c])=>c),1);
                      const pct  = Math.round(count/Math.max(companies.length,1)*100);
                      return (
                        <div key={country} onClick={()=>handleCountryClick(country)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:'1px solid #F1F5F9', cursor:'pointer' }}
                          onMouseEnter={e=>e.currentTarget.style.background=m.kpiBg}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <span style={{ fontSize:12, color:m.textDark, minWidth:130, fontWeight:500 }}>{country}</span>
                          <div style={{ flex:1, height:5, background:'#E4E8F0', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', background:m.accent, opacity:.7, borderRadius:3, width:`${count/maxC*100}%` }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:m.textDark, minWidth:28, textAlign:'right' }}>{count}</span>
                          <span style={{ fontSize:10, color:'#94A3B8', minWidth:30 }}>{pct}%</span>
                        </div>
                      );
                    })}
                    {unknownCount>0 && (
                      <div style={{ padding:'8px 14px', fontSize:11, color:'#94A3B8', borderTop:'1px solid #F1F5F9' }}>
                        ⚠ {unknownCount.toLocaleString()} companies have no country data
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right — drill panel */}
            <div>
              <div style={{ background:'#fff', border:`1px solid ${m.border}`, borderRadius:10, overflow:'hidden', position:'sticky', top:16 }}>
                {!drillCompany ? (
                  <div style={{ padding:'2.5rem 1rem', textAlign:'center', color:'#94A3B8' }}>
                    <div style={{ fontSize:26, marginBottom:8 }}>🏢</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Click a country</div>
                    <div style={{ fontSize:11, marginTop:4 }}>then select a company</div>
                  </div>
                ) : (
                  <>
                    <div style={{ background:m.headerBg, padding:'12px 14px', borderBottom:`1px solid ${m.border}` }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:m.textDark, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{drillCompany.name}</div>
                          {drillCompany.website && <a href={`https://${drillCompany.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" style={{ fontSize:10, color:m.accent }}>{drillCompany.website}</a>}
                        </div>
                        <button onClick={()=>setDrillCompany(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#64748B', padding:2 }}>✕</button>
                      </div>
                      <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                        {(drillCompany.country||drillCompany.ai_enrichment?.country) && <span style={{ padding:'2px 7px', borderRadius:20, fontSize:10, background:'#F1F5F9', color:'#475569' }}>📍 {drillCompany.country||drillCompany.ai_enrichment?.country}</span>}
                        {(drillCompany.ai_enrichment?.industry||drillCompany.industry) && <span style={{ padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:600, background:m.badgeBg, color:m.badgeText }}>{drillCompany.ai_enrichment?.industry||drillCompany.industry}</span>}
                        {drillCompany.ai_enrichment?.size && <span style={{ padding:'2px 7px', borderRadius:20, fontSize:10, background:'#F1F5F9', color:'#475569' }}>👥 {drillCompany.ai_enrichment.size}</span>}
                        {drillCompany.ai_enrichment?.digital_maturity && (
                          <span style={{ padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:600, background:drillCompany.ai_enrichment.digital_maturity==='High'?'#ECFDF5':'#FFFBEB', color:drillCompany.ai_enrichment.digital_maturity==='High'?'#065F46':'#92600A' }}>
                            {drillCompany.ai_enrichment.digital_maturity} maturity
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ padding:'12px 14px', maxHeight:520, overflowY:'auto' }}>
                      {drillCompany.ai_enrichment?.overview && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Overview</div>
                          <div style={{ fontSize:11, color:'#475569', lineHeight:1.6 }}>{drillCompany.ai_enrichment.overview}</div>
                        </div>
                      )}
                      {(drillCompany.ai_enrichment?.tech_stack||[]).length>0 && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Tech stack</div>
                          <div>
                            {drillCompany.ai_enrichment.tech_stack.map((t,i)=>(
                              <span key={i} onClick={()=>setTechFilter(t===techFilter?'':t)}
                                style={{ padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:600, background:t===techFilter?'#7C3AED':m.badgeBg, color:t===techFilter?'#fff':m.badgeText, display:'inline-block', margin:'2px', cursor:'pointer' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!drillCompany.ai_enriched_at && (
                        <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:7, padding:'7px 10px', marginBottom:12, fontSize:11, color:'#92600A' }}>
                          ✦ Not yet enriched
                        </div>
                      )}
                      <div style={{ fontSize:10, fontWeight:700, color:m.textMid, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
                        Contacts {contactLoading?'…':`(${contacts.length})`}
                      </div>
                      {contactLoading ? <div style={{ fontSize:11, color:'#94A3B8' }}>Loading…</div>
                        : contacts.length===0 ? <div style={{ fontSize:11, color:'#94A3B8' }}>No named contacts linked</div>
                        : contacts.map(c=>(
                          <div key={c.id} style={{ background:'#F8FAFC', border:'1px solid #E4E8F0', borderRadius:7, padding:'7px 10px', marginBottom:5 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                              {IMP[c.importance] && <span style={{ fontSize:11 }}>{IMP[c.importance]}</span>}
                              <span style={{ fontSize:12, fontWeight:600, color:'#0F172A', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.contact}</span>
                            </div>
                            {c.role && <div style={{ fontSize:10, color:'#64748B', marginBottom:2 }}>{c.role}</div>}
                            <div style={{ display:'flex', gap:8 }}>
                              {c.email    && <a href={`mailto:${c.email}`}    style={{ fontSize:10, color:m.accent }}>✉ {c.email}</a>}
                              {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize:10, color:'#0A66C2' }}>in</a>}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
