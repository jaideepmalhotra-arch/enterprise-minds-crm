import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { Toast } from '../components/UI.jsx';

const m = {
  pageBg: '#F2F7FD', headerBg: '#EBF4FD', border: '#B5D4F4',
  accent: '#2563EB', textDark: '#0C447C', textMid: '#185FA5',
  kpiBg: '#EBF4FD', kpiBorder: '#B5D4F4',
  badgeBg: '#DBEAFE', badgeText: '#1E40AF',
};

// ── Colour scale by company count ─────────────────────────────────────────────
function countryColor(count, max) {
  if (!count) return '#EDF2FF';
  const t = Math.min(count / Math.max(max * 0.7, 1), 1);
  const blues = ['#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#2563EB','#1D4ED8','#1E40AF'];
  return blues[Math.min(Math.floor(t * blues.length), blues.length - 1)];
}

// ── D3 Choropleth Map ─────────────────────────────────────────────────────────
function ChoroplethMap({ countryData, selectedCountry, onCountryClick }) {
  const svgRef  = useRef(null);
  const [geoJson, setGeoJson] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', count: 0 });

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
      .then(r => r.json())
      .then(d => setGeoJson(d))
      .catch(() => {});
  }, []);

  const maxCount = useMemo(() => Math.max(...Object.values(countryData), 1), [countryData]);

  const project = useCallback((lon, lat, w, h) => {
    const x = (lon + 180) * (w / 360);
    const latRad = lat * Math.PI / 180;
    const mercN  = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y      = h / 2 - (mercN * h / (2 * Math.PI));
    return [x, y];
  }, []);

  const pathFromGeometry = useCallback((geometry, w, h) => {
    const ring2path = (ring) => {
      let d = '';
      ring.forEach((coord, i) => {
        const [x, y] = project(coord[0], coord[1], w, h);
        d += (i === 0 ? 'M' : 'L') + `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return d + 'Z';
    };
    if (geometry.type === 'Polygon') {
      return geometry.coordinates.map(ring2path).join(' ');
    } else if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.flatMap(poly => poly.map(ring2path)).join(' ');
    }
    return '';
  }, [project]);

  const W = 900, H = 460;

  // Country name normalisation — GeoJSON uses full names
  const NAME_MAP = {
    'United States of America': 'United States',
    'United Kingdom': 'United Kingdom',
    'UAE': 'United Arab Emirates',
    'United Arab Emirates': 'UAE',
  };

  function resolveCount(geoName) {
    return countryData[geoName] || countryData[NAME_MAP[geoName]] || 0;
  }
  function resolveSelected(geoName) {
    return selectedCountry === geoName || selectedCountry === NAME_MAP[geoName];
  }

  if (!geoJson) return (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>
      Loading map…
    </div>
  );

  return (
    <div style={{ position: 'relative', background: '#EFF6FF', borderRadius: 10, overflow: 'hidden', border: `1px solid ${m.border}` }}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Ocean */}
        <rect width={W} height={H} fill="#EFF6FF" />
        {geoJson.features.map((feature, i) => {
          const name  = feature.properties?.ADMIN || feature.properties?.name || '';
          const count = resolveCount(name);
          const isSel = resolveSelected(name);
          const isHov = hovered === name;
          const fill  = isSel ? '#F59E0B' : isHov && count > 0 ? '#60A5FA' : countryColor(count, maxCount);
          const stroke = isSel ? '#D97706' : '#fff';
          const sw     = isSel ? 1.5 : 0.4;
          const d = pathFromGeometry(feature.geometry, W, H);
          if (!d) return null;
          return (
            <path key={i} d={d} fill={fill} stroke={stroke} strokeWidth={sw}
              style={{ cursor: count > 0 ? 'pointer' : 'default', transition: 'fill .15s' }}
              onMouseEnter={e => {
                setHovered(name);
                const rect = svgRef.current?.getBoundingClientRect();
                setTooltip({ visible: true, x: e.clientX - (rect?.left||0), y: e.clientY - (rect?.top||0), name, count });
              }}
              onMouseLeave={() => { setHovered(null); setTooltip(t => ({ ...t, visible: false })); }}
              onClick={() => count > 0 && onCountryClick(name)}
            />
          );
        })}
      </svg>
      {/* Tooltip */}
      {tooltip.visible && tooltip.count > 0 && (
        <div style={{ position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 10, background: '#0F172A', color: '#fff', borderRadius: 7, padding: '6px 10px', fontSize: 11, pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.25)' }}>
          <div style={{ fontWeight: 700 }}>{tooltip.name}</div>
          <div style={{ color: '#93C5FD' }}>{tooltip.count} companies</div>
        </div>
      )}
      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
        {['#DBEAFE','#93C5FD','#3B82F6','#1D4ED8'].map((c, i) => (
          <div key={i} style={{ width: 14, height: 14, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ fontSize: 9, color: '#475569', marginLeft: 4 }}>Low → High</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompanyMapPage() {
  const [companies,      setCompanies]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedCountry,setSelectedCountry]= useState(null);
  const [techFilter,     setTechFilter]     = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [search,         setSearch]         = useState('');
  const [toast,          setToast]          = useState(null);
  const [drillCompany,   setDrillCompany]   = useState(null);
  const [contacts,       setContacts]       = useState([]);
  const [contactLoading, setContactLoading] = useState(false);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  // Load all companies with ai_enrichment
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const all = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const { data, error } = await supabase.from('companies')
            .select('id, name, website, country, industry, size, ai_enrichment, ai_enriched_at')
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        setCompanies(all);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Extract all unique tech stack items from enriched companies
  const allTechs = useMemo(() => {
    const m = new Map();
    companies.forEach(c => {
      const techs = c.ai_enrichment?.tech_stack || [];
      techs.forEach(t => { if (t) m.set(t, (m.get(t) || 0) + 1); });
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80);
  }, [companies]);

  const allIndustries = useMemo(() => {
    const m = new Map();
    companies.forEach(c => {
      const ind = c.ai_enrichment?.industry || c.industry;
      if (ind) m.set(ind, (m.get(ind) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [companies]);

  // Filter companies
  const filtered = useMemo(() => {
    let r = companies;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c => (c.name||'').toLowerCase().includes(q) || (c.country||'').toLowerCase().includes(q));
    }
    if (techFilter) {
      r = r.filter(c => (c.ai_enrichment?.tech_stack || []).includes(techFilter));
    }
    if (industryFilter) {
      r = r.filter(c => {
        const ind = c.ai_enrichment?.industry || c.industry || '';
        return ind === industryFilter;
      });
    }
    if (selectedCountry) {
      r = r.filter(c => c.country === selectedCountry || c.ai_enrichment?.country === selectedCountry);
    }
    return r;
  }, [companies, search, techFilter, industryFilter, selectedCountry]);

  // Country rollup for map
  const countryData = useMemo(() => {
    const m = {};
    companies.forEach(c => {
      const country = c.country || c.ai_enrichment?.country;
      if (country) m[country] = (m[country] || 0) + 1;
    });
    return m;
  }, [companies]);

  // Country list for sidebar (sorted by count)
  const countryList = useMemo(() => {
    const m = {};
    filtered.forEach(c => {
      const country = c.country || c.ai_enrichment?.country || 'Unknown';
      m[country] = (m[country] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Load contacts for drilled company
  async function drillIntoCompany(company) {
    setDrillCompany(company);
    setContactLoading(true);
    const { data } = await supabase.from('leads')
      .select('id, contact, role, email, phone, linkedin, importance')
      .eq('company_id', company.id)
      .not('contact', 'is', null).neq('contact', '')
      .order('contact').limit(50);
    setContacts(data || []);
    setContactLoading(false);
  }

  const IMP_CONFIG = {
    hot:          { label: '🔴', bg: '#FEF2F2', color: '#991B1B' },
    warm:         { label: '🟡', bg: '#FFFBEB', color: '#92600A' },
    cold:         { label: '🔵', bg: '#EFF6FF', color: '#1E40AF' },
    not_relevant: { label: '⬜', bg: '#F1F5F9', color: '#475569' },
  };

  const enrichedCount  = filtered.filter(c => c.ai_enriched_at).length;
  const withTechCount  = filtered.filter(c => (c.ai_enrichment?.tech_stack||[]).length > 0).length;

  return (
    <div style={{ background: m.pageBg, minHeight: '100vh' }}>
      {/* Module header */}
      <div style={{ background: m.headerBg, borderBottom: `1px solid ${m.border}`, padding: '14px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: m.badgeBg, color: m.badgeText }}>📤 Output</span>
          <span style={{ color: m.border }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: m.textDark }}>Company Map</span>
        </div>
        <div style={{ fontSize: 11, color: m.textMid }}>Country-level company distribution · filter by technology stack and industry</div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['Total companies', companies.length, m.textDark],
            ['Filtered',        filtered.length,  m.accent],
            ['Countries',       countryList.length, '#059669'],
            ['AI enriched',     enrichedCount,    '#7C3AED'],
            ['With tech data',  withTechCount,    '#F59E0B'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background: m.kpiBg, border: `1px solid ${m.kpiBorder}`, borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 10, color: m.textMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or country..."
            style={{ flex: 1, minWidth: 200, border: `1px solid ${m.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, background: '#fff', fontFamily: 'inherit' }} />

          {/* Tech filter */}
          <select value={techFilter} onChange={e => setTechFilter(e.target.value)}
            style={{ border: `1px solid ${techFilter ? '#7C3AED' : m.border}`, borderRadius: 7, padding: '5px 9px', fontSize: 11, background: techFilter ? '#F5F3FF' : '#fff', color: techFilter ? '#3C3489' : '#64748B', fontFamily: 'inherit', minWidth: 160 }}>
            <option value="">All technologies</option>
            {allTechs.map(([t, count]) => <option key={t} value={t}>{t} ({count})</option>)}
          </select>

          {/* Industry filter */}
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}
            style={{ border: `1px solid ${industryFilter ? '#059669' : m.border}`, borderRadius: 7, padding: '5px 9px', fontSize: 11, background: industryFilter ? '#ECFDF5' : '#fff', color: industryFilter ? '#065F46' : '#64748B', fontFamily: 'inherit', minWidth: 160 }}>
            <option value="">All industries</option>
            {allIndustries.map(([ind, count]) => <option key={ind} value={ind}>{ind} ({count})</option>)}
          </select>

          {/* Active filters */}
          {(selectedCountry || techFilter || industryFilter) && (
            <button onClick={() => { setSelectedCountry(null); setTechFilter(''); setIndustryFilter(''); setSearch(''); }}
              style={{ padding: '5px 12px', border: `1px solid ${m.border}`, borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748B', fontFamily: 'inherit' }}>
              Clear filters
            </button>
          )}

          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{filtered.length} companies shown</span>
        </div>

        {/* Active filter chips */}
        {(selectedCountry || techFilter || industryFilter) && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {selectedCountry && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FFFBEB', color: '#92600A', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: 5 }}>
                📍 {selectedCountry}
                <button onClick={() => setSelectedCountry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#92600A', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {techFilter && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#F5F3FF', color: '#3C3489', border: '1px solid #C4B5FD', display: 'flex', alignItems: 'center', gap: 5 }}>
                ⚡ {techFilter}
                <button onClick={() => setTechFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#3C3489', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
            {industryFilter && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#ECFDF5', color: '#065F46', border: '1px solid #86EFAC', display: 'flex', alignItems: 'center', gap: 5 }}>
                🏭 {industryFilter}
                <button onClick={() => setIndustryFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#065F46', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⋯</div>
            <div style={{ fontSize: 13 }}>Loading companies…</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

            {/* Left — Map + Country list */}
            <div>
              {/* Choropleth map */}
              <ChoroplethMap
                countryData={countryData}
                selectedCountry={selectedCountry}
                onCountryClick={c => setSelectedCountry(c === selectedCountry ? null : c)}
              />

              {/* Country list */}
              <div style={{ background: '#fff', border: `1px solid ${m.border}`, borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
                <div style={{ padding: '10px 16px', background: m.kpiBg, borderBottom: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.textDark }}>
                    {selectedCountry ? `Companies in ${selectedCountry}` : 'All countries'} · {filtered.length} companies
                  </div>
                  {selectedCountry && (
                    <button onClick={() => setSelectedCountry(null)}
                      style={{ fontSize: 11, color: m.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Show all ×
                    </button>
                  )}
                </div>

                {selectedCountry ? (
                  // Company list for selected country
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No companies match current filters</div>
                    ) : filtered.map((co, i) => {
                      const e = co.ai_enrichment || {};
                      return (
                        <div key={co.id} onClick={() => drillIntoCompany(co)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: drillCompany?.id === co.id ? m.kpiBg : 'transparent' }}
                          onMouseEnter={e2 => { if (drillCompany?.id !== co.id) e2.currentTarget.style.background = '#F8FAFC'; }}
                          onMouseLeave={e2 => { e2.currentTarget.style.background = drillCompany?.id === co.id ? m.kpiBg : 'transparent'; }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: m.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.name}</div>
                            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                              {e.industry || co.industry || '—'}
                              {e.size && ` · ${e.size}`}
                            </div>
                            {(e.tech_stack||[]).slice(0,3).length > 0 && (
                              <div style={{ marginTop: 3 }}>
                                {(e.tech_stack||[]).slice(0,3).map((t,j) => (
                                  <span key={j} style={{ padding: '1px 6px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: m.badgeBg, color: m.badgeText, marginRight: 3 }}>{t}</span>
                                ))}
                                {(e.tech_stack||[]).length > 3 && <span style={{ fontSize: 9, color: '#94A3B8' }}>+{e.tech_stack.length-3}</span>}
                              </div>
                            )}
                          </div>
                          {co.ai_enriched_at && <span style={{ fontSize: 9, color: '#059669', fontWeight: 600, flexShrink: 0 }}>✦</span>}
                          <span style={{ fontSize: 10, color: m.accent, flexShrink: 0 }}>→</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Country rollup table
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {countryList.map(([country, count]) => {
                      const pct = Math.round(count / Math.max(filtered.length, 1) * 100);
                      const maxC = Math.max(...countryList.map(([,c])=>c), 1);
                      return (
                        <div key={country} onClick={() => setSelectedCountry(country)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = m.kpiBg}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: m.textDark, minWidth: 140 }}>{country}</div>
                          <div style={{ flex: 1, height: 6, background: '#E4E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: m.accent, borderRadius: 3, width: `${count/maxC*100}%`, opacity: 0.7 }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: m.textDark, minWidth: 30, textAlign: 'right' }}>{count}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', minWidth: 32 }}>{pct}%</div>
                        </div>
                      );
                    })}
                    {countryList.length === 0 && (
                      <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No country data — enrich companies first</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right — Company drill-down drawer */}
            <div>
              <div style={{ background: '#fff', border: `1px solid ${m.border}`, borderRadius: 10, overflow: 'hidden', position: 'sticky', top: 16 }}>
                {!drillCompany ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🏢</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Click a country then a company</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>View contacts and tech profile</div>
                  </div>
                ) : (
                  <>
                    <div style={{ background: m.headerBg, padding: '12px 16px', borderBottom: `1px solid ${m.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: m.textDark, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drillCompany.name}</div>
                          {drillCompany.website && (
                            <a href={`https://${drillCompany.website.replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: m.accent }}>{drillCompany.website}</a>
                          )}
                        </div>
                        <button onClick={() => setDrillCompany(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748B', padding: 2 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                        {drillCompany.country && <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, background: '#F1F5F9', color: '#475569' }}>📍 {drillCompany.country}</span>}
                        {(drillCompany.ai_enrichment?.industry || drillCompany.industry) && <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: m.badgeBg, color: m.badgeText }}>{drillCompany.ai_enrichment?.industry || drillCompany.industry}</span>}
                        {drillCompany.ai_enrichment?.size && <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, background: '#F1F5F9', color: '#475569' }}>👥 {drillCompany.ai_enrichment.size}</span>}
                        {drillCompany.ai_enrichment?.digital_maturity && (
                          <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: drillCompany.ai_enrichment.digital_maturity === 'High' ? '#ECFDF5' : '#FFFBEB', color: drillCompany.ai_enrichment.digital_maturity === 'High' ? '#065F46' : '#92600A' }}>
                            {drillCompany.ai_enrichment.digital_maturity} maturity
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '12px 16px', maxHeight: 600, overflowY: 'auto' }}>
                      {/* Overview */}
                      {drillCompany.ai_enrichment?.overview && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Overview</div>
                          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{drillCompany.ai_enrichment.overview}</div>
                        </div>
                      )}

                      {/* Tech stack */}
                      {(drillCompany.ai_enrichment?.tech_stack||[]).length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Tech stack</div>
                          <div>
                            {drillCompany.ai_enrichment.tech_stack.map((t,i) => (
                              <span key={i} onClick={() => setTechFilter(t === techFilter ? '' : t)}
                                style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: t === techFilter ? '#7C3AED' : m.badgeBg, color: t === techFilter ? '#fff' : m.badgeText, display: 'inline-block', margin: '2px', cursor: 'pointer' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No enrichment */}
                      {!drillCompany.ai_enriched_at && (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#92600A' }}>
                          ✦ Not yet AI enriched
                        </div>
                      )}

                      {/* Contacts */}
                      <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                        Contacts
                      </div>
                      {contactLoading ? (
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>Loading…</div>
                      ) : contacts.length === 0 ? (
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>No named contacts linked</div>
                      ) : contacts.map(c => {
                        const ic = IMP_CONFIG[c.importance];
                        return (
                          <div key={c.id} style={{ background: '#F8FAFC', border: '1px solid #E4E8F0', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              {ic && <span title={c.importance} style={{ fontSize: 11 }}>{ic.label}</span>}
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</div>
                            </div>
                            {c.role  && <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3 }}>{c.role}</div>}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {c.email    && <a href={`mailto:${c.email}`}    style={{ fontSize: 10, color: m.accent }}>✉ {c.email}</a>}
                              {c.linkedin && <a href={c.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#0A66C2' }}>in</a>}
                            </div>
                          </div>
                        );
                      })}
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
