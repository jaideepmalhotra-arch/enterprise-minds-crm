import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { logAudit } from '../utils/audit.js';
import { Toast } from '../components/UI.jsx';

const m = {
  pageBg: '#F2F7FD', headerBg: '#EBF4FD', border: '#B5D4F4',
  accent: '#2563EB', textDark: '#0C447C', textMid: '#185FA5',
  kpiBg: '#EBF4FD', kpiBorder: '#B5D4F4',
  badgeBg: '#DBEAFE', badgeText: '#1E40AF',
};

const SYSTEM_PROMPT = `You are a B2B company research assistant for Enterprise Minds, an AI and digital transformation consulting firm.
Given a company name and website, research the company and return ONLY a JSON object with this exact structure:
{
  "overview": "2-3 sentence description of what the company does and their market position",
  "industry": "primary industry sector",
  "size": "estimated employee count or range e.g. 500-1000 or 10,000+",
  "headquarters": "City, Country",
  "tech_stack": ["specific", "technologies", "tools", "platforms", "they", "use"],
  "tech_categories": ["Cloud", "ERP", "CRM", "AI/ML", "etc"],
  "digital_maturity": "Low or Medium or High",
  "summary": "2-3 sentence sales note: what they do, their tech landscape, and why Enterprise Minds AI and digital transformation services could be relevant to them"
}
Return ONLY valid JSON. No markdown backticks, no explanation, no extra text.`;

async function enrichCompany(company, website) {
  const prompt = `Research this company and return a JSON profile:
Company: ${company}
Website: ${website}

Search the web to find current accurate information about their technology stack, company size, and digital operations.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text in AI response');

  let text = textBlock.text.trim();
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(text);
  } catch(e) {
    // Try to extract JSON from mixed content
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse AI response as JSON');
  }
}

const BADGE_COLORS = [
  { bg: '#EFF6FF', color: '#1D4ED8' },
  { bg: '#F5F3FF', color: '#5B21B6' },
  { bg: '#ECFDF5', color: '#065F46' },
  { bg: '#FFFBEB', color: '#92600A' },
  { bg: '#FEF2F2', color: '#991B1B' },
  { bg: '#F0FDF4', color: '#166534' },
];

function Badge({ text, i = 0 }) {
  const c = BADGE_COLORS[i % BADGE_COLORS.length];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color, display: 'inline-block', margin: '2px 2px' }}>
      {text}
    </span>
  );
}

function MaturityBadge({ level }) {
  const map = { High: ['#ECFDF5', '#065F46'], Medium: ['#FFFBEB', '#92600A'], Low: ['#FEF2F2', '#991B1B'] };
  const [bg, color] = map[level] || map.Medium;
  return <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color }}>{level} digital maturity</span>;
}

function EnrichmentResultCard({ item, onSave, onDiscard, saving }) {
  const { lead, result, error } = item;
  const [summary, setSummary] = useState(result?.summary || '');

  if (error) return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>{lead.company}</div>
        <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>Error: {error}</div>
      </div>
      <button onClick={() => onDiscard(lead.id)} style={{ padding: '4px 12px', border: '1px solid #FCA5A5', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: '#fff', color: '#991B1B' }}>Dismiss</button>
    </div>
  );

  return (
    <div style={{ background: '#fff', border: `1px solid ${m.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ background: m.headerBg, padding: '14px 18px', borderBottom: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: m.textDark }}>{lead.company}</div>
          <a href={`https://${(lead.website || '').replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: m.accent }}>{lead.website}</a>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {result.digital_maturity && <MaturityBadge level={result.digital_maturity} />}
          {result.industry && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: m.badgeBg, color: m.badgeText }}>{result.industry}</span>}
          {result.headquarters && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, background: '#F1F5F9', color: '#475569' }}>📍 {result.headquarters}</span>}
          {result.size && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10, background: '#F1F5F9', color: '#475569' }}>👥 {result.size}</span>}
        </div>
      </div>

      <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Company overview</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>{result.overview}</div>

          {result.tech_categories?.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Tech categories</div>
              <div style={{ marginBottom: 4 }}>
                {result.tech_categories.map((t, i) => <Badge key={i} text={t} i={i} />)}
              </div>
            </>
          )}
        </div>

        {/* Right */}
        <div>
          {result.tech_stack?.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Technology stack</div>
              <div style={{ marginBottom: 16 }}>
                {result.tech_stack.map((t, i) => <Badge key={i} text={t} i={i + 3} />)}
              </div>
            </>
          )}

          <div style={{ fontSize: 10, fontWeight: 700, color: m.textMid, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            Sales notes <span style={{ fontSize: 9, fontWeight: 400, color: '#94A3B8' }}>(edit before saving)</span>
          </div>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={5}
            style={{ width: '100%', border: `1px solid ${m.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 11, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', background: m.kpiBg, color: '#475569', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 18px', borderTop: `1px solid ${m.border}`, background: '#F8FAFC', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94A3B8', flex: 1 }}>Saves to lead notes + ai_enrichment field</span>
        <button onClick={() => onDiscard(lead.id)}
          style={{ padding: '6px 14px', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748B', fontFamily: 'inherit' }}>
          Discard
        </button>
        <button onClick={() => onSave(item, summary)} disabled={saving === lead.id}
          style={{ padding: '7px 20px', background: m.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: saving === lead.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving === lead.id ? 0.6 : 1 }}>
          {saving === lead.id ? 'Saving...' : '✓ Save to lead'}
        </button>
      </div>
    </div>
  );
}

export default function AIEnrichmentPage() {
  const [tab,          setTab]          = useState('queue');
  const [leads,        setLeads]        = useState([]);
  const [enriched,     setEnriched]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(new Set());
  const [results,      setResults]      = useState([]);
  const [processing,   setProcessing]   = useState(false);
  const [processed,    setProcessed]    = useState(0);
  const [total,        setTotal]        = useState(0);
  const [savingId,     setSavingId]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [search,       setSearch]       = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: unenriched }, { data: done }] = await Promise.all([
        supabase.from('leads')
          .select('id, company, website, country, industry, contact, email, notes')
          .not('website', 'is', null).neq('website', '')
          .is('ai_enriched_at', null)
          .order('company').limit(1000),
        supabase.from('leads')
          .select('id, company, website, country, industry, ai_enrichment, ai_enriched_at, notes')
          .not('ai_enriched_at', 'is', null)
          .order('ai_enriched_at', { ascending: false }).limit(200),
      ]);
      setLeads(unenriched || []);
      setEnriched(done || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredLeads = search
    ? leads.filter(l => (l.company||'').toLowerCase().includes(search.toLowerCase()) || (l.country||'').toLowerCase().includes(search.toLowerCase()))
    : leads;

  function toggle(id) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function selectAll() { setSelected(new Set(filteredLeads.map(l => l.id))); }
  function clearAll()  { setSelected(new Set()); }

  const costEst = (selected.size * 0.025).toFixed(2);

  async function runEnrichment() {
    if (selected.size === 0 || processing) return;
    const toProcess = leads.filter(l => selected.has(l.id));
    setProcessing(true);
    setProcessed(0);
    setTotal(toProcess.length);
    setResults([]);
    setTab('review');

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      try {
        const result = await enrichCompany(lead.company, lead.website);
        setResults(r => [...r, { lead, result, status: 'ready' }]);
      } catch(e) {
        setResults(r => [...r, { lead, result: null, error: e.message, status: 'error' }]);
      }
      setProcessed(i + 1);
      if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 600));
    }

    setProcessing(false);
    showToast(`Enrichment complete — ${toProcess.length} companies processed`);
    setSelected(new Set());
  }

  async function saveResult(item, editedSummary) {
    setSavingId(item.lead.id);
    try {
      const enrichData = { ...item.result, summary: editedSummary, enriched_at: new Date().toISOString() };
      await supabase.from('leads').update({
        ai_enrichment:  enrichData,
        ai_enriched_at: new Date().toISOString(),
        notes:          editedSummary,
        industry:       item.result.industry || item.lead.industry || null,
        last_synced:    new Date().toISOString(),
      }).eq('id', item.lead.id);

      logAudit('lead_enriched',
        `AI enriched: ${item.lead.company}`,
        { company: item.lead.company, tech_stack: item.result.tech_stack, digital_maturity: item.result.digital_maturity }
      );

      setResults(r => r.filter(x => x.lead.id !== item.lead.id));
      showToast(`${item.lead.company} saved ✓`);
      load();
    } catch(e) { showToast('Save failed: ' + e.message, 'error'); }
    finally { setSavingId(null); }
  }

  function discardResult(leadId) {
    setResults(r => r.filter(x => x.lead.id !== leadId));
  }

  const TABS = [
    { id: 'queue',  label: `Queue (${leads.length})` },
    { id: 'review', label: `Review${results.length > 0 ? ` (${results.length})` : processing ? ' ⋯' : ''}` },
    { id: 'done',   label: `Enriched (${enriched.length})` },
  ];

  return (
    <div style={{ background: m.pageBg, minHeight: '100vh' }}>
      {/* Module header */}
      <div style={{ background: m.headerBg, borderBottom: `1px solid ${m.border}`, padding: '14px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: m.badgeBg, color: m.badgeText }}>📥 Input</span>
          <span style={{ color: m.border }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: m.textDark }}>AI Enrichment</span>
          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#ECFDF5', color: '#065F46' }}>✦ Claude AI + Web Search</span>
        </div>
        <div style={{ fontSize: 11, color: m.textMid }}>Auto-research company profiles and technology stacks · ~$0.025 per company</div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            ['Ready to enrich', leads.length,    m.textDark],
            ['Already enriched', enriched.length, '#059669'],
            ['Selected',         selected.size,   m.accent],
            ['Est. cost',        `$${costEst}`,   selected.size > 0 ? '#92600A' : '#94A3B8'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: m.kpiBg, border: `1px solid ${m.kpiBorder}`, borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: 10, color: m.textMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#DBEAFE', borderRadius: 8, padding: 3, gap: 2, marginBottom: 16, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t.id ? m.accent : 'transparent', color: tab === t.id ? '#fff' : m.textMid, fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── QUEUE tab ── */}
        {tab === 'queue' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by company or country..."
                style={{ flex: 1, minWidth: 200, border: `1px solid ${m.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, background: '#fff', fontFamily: 'inherit' }} />
              <button onClick={selectAll} style={{ padding: '6px 12px', border: `1px solid ${m.border}`, borderRadius: 7, fontSize: 11, cursor: 'pointer', background: m.kpiBg, color: m.textMid, fontFamily: 'inherit' }}>
                Select all ({filteredLeads.length})
              </button>
              <button onClick={clearAll}  style={{ padding: '6px 12px', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748B', fontFamily: 'inherit' }}>Clear</button>
              {selected.size > 0 && (
                <>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 7, padding: '5px 12px', fontSize: 11, color: '#92600A', fontWeight: 600 }}>
                    ~${costEst} for {selected.size} companies
                  </div>
                  <button onClick={runEnrichment} disabled={processing}
                    style={{ padding: '7px 18px', background: m.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✦ Enrich {selected.size} with AI
                  </button>
                </>
              )}
            </div>

            <div style={{ background: '#fff', border: `1px solid ${m.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36, padding: '8px 12px', background: m.kpiBg, borderBottom: `1px solid ${m.border}`, textAlign: 'left' }}>
                      <input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearAll()}
                        checked={filteredLeads.length > 0 && filteredLeads.every(l => selected.has(l.id))} />
                    </th>
                    {['Company', 'Website', 'Country', 'Industry', 'Contact'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', background: m.kpiBg, borderBottom: `1px solid ${m.border}`, textAlign: 'left', fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', color: m.textMid, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>Loading...</td></tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                      <div style={{ fontWeight: 600, color: '#475569' }}>All companies with websites are enriched</div>
                    </td></tr>
                  ) : filteredLeads.map(lead => (
                    <tr key={lead.id} style={{ background: selected.has(lead.id) ? m.kpiBg : '#fff', cursor: 'pointer' }}
                      onMouseEnter={e => { if (!selected.has(lead.id)) e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = selected.has(lead.id) ? m.kpiBg : '#fff'; }}>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9' }} onClick={() => toggle(lead.id)}>
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} onClick={e => e.stopPropagation()} />
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: m.textDark, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a href={`https://${(lead.website||'').replace(/^https?:\/\//,'')}`} target="_blank" rel="noreferrer"
                          style={{ color: m.accent, fontSize: 11 }} onClick={e => e.stopPropagation()}>{lead.website}</a>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{lead.country || '—'}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{lead.industry || '—'}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{lead.contact || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── REVIEW tab ── */}
        {tab === 'review' && (
          <div>
            {processing && (
              <div style={{ background: m.headerBg, border: `1px solid ${m.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.textDark, marginBottom: 4 }}>
                    ✦ AI enriching companies… {processed} / {total}
                  </div>
                  <div style={{ height: 6, background: '#BFDBFE', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: m.accent, borderRadius: 3, width: `${total > 0 ? (processed/total*100) : 0}%`, transition: 'width .5s' }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: m.textMid, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                  ~${(processed * 0.025).toFixed(2)} used
                </div>
              </div>
            )}

            {results.length === 0 && !processing ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No results to review</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Select companies from the Queue tab and run enrichment</div>
              </div>
            ) : results.map(item => (
              <EnrichmentResultCard
                key={item.lead.id}
                item={item}
                onSave={saveResult}
                onDiscard={discardResult}
                saving={savingId}
              />
            ))}
          </div>
        )}

        {/* ── DONE tab ── */}
        {tab === 'done' && (
          <div>
            <div style={{ background: '#fff', border: `1px solid ${m.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Company', 'Industry', 'Tech Stack', 'Maturity', 'Enriched'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', background: m.kpiBg, borderBottom: `1px solid ${m.border}`, textAlign: 'left', fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', color: m.textMid, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enriched.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No enriched companies yet</td></tr>
                  ) : enriched.map((lead, i) => {
                    const e = lead.ai_enrichment || {};
                    return (
                      <tr key={lead.id} style={{ background: i % 2 === 0 ? '#fff' : m.kpiBg }}>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: m.textDark }}>{lead.company}</td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', color: '#64748B' }}>{e.industry || lead.industry || '—'}</td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', maxWidth: 240 }}>
                          {(e.tech_stack || []).slice(0, 4).map((t, j) => <Badge key={j} text={t} i={j} />)}
                          {(e.tech_stack || []).length > 4 && <span style={{ fontSize: 10, color: '#94A3B8' }}> +{e.tech_stack.length - 4} more</span>}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
                          {e.digital_maturity && <MaturityBadge level={e.digital_maturity} />}
                        </td>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', color: '#94A3B8', fontSize: 11 }}>
                          {lead.ai_enriched_at ? new Date(lead.ai_enriched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
