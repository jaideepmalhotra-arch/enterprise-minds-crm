import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { STAGES, ACTIVITY_TYPES } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';

function Bar({ label, value, max, color, sublabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#475569', flex: '0 0 160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width .5s' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', minWidth: 36, textAlign: 'right' }}>{value}</div>
      {sublabel && <div style={{ fontSize: 10, color: '#94A3B8', minWidth: 30 }}>{sublabel}</div>}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function exportCSV(data, filename) {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

const PERIODS = [
  { id: '7',  label: 'This week' },
  { id: '14', label: 'Last 14 days' },
  { id: '30', label: 'This month' },
  { id: '90', label: 'Last 90 days' },
];

export default function AnalyticsPage() {
  const { reps, cards, cardsByStage } = useSales();
  const [period,       setPeriod]       = useState('30');
  const [loading,      setLoading]      = useState(true);
  const [repActs,      setRepActs]      = useState({});
  const [countryData,  setCountryData]  = useState([]);
  const [sourceData,   setSourceData]   = useState([]);
  const [stageVelocity,setStageVelocity]= useState([]);
  const [totalLeads,   setTotalLeads]   = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - Number(period) * 86400000).toISOString();

      // 1. Rep activities in period
      const { data: acts } = await supabase.from('activities')
        .select('rep_id, type')
        .gte('logged_at', since);

      const repActMap = {};
      reps.forEach(r => { repActMap[r.id] = { total: 0, byType: {} }; });
      (acts || []).forEach(a => {
        if (!repActMap[a.rep_id]) repActMap[a.rep_id] = { total: 0, byType: {} };
        repActMap[a.rep_id].total++;
        repActMap[a.rep_id].byType[a.type] = (repActMap[a.rep_id].byType[a.type] || 0) + 1;
      });
      setRepActs(repActMap);

      // 2. Country breakdown
      const { data: countryRows } = await supabase.from('leads')
        .select('country')
        .not('country', 'is', null);
      const cMap = {};
      (countryRows || []).forEach(r => { if (r.country) cMap[r.country] = (cMap[r.country] || 0) + 1; });
      const sorted = Object.entries(cMap).sort((a, b) => b[1] - a[1]).slice(0, 20);
      setCountryData(sorted.map(([country, count]) => ({ country, count })));

      // 3. Source breakdown
      const { data: sourceRows } = await supabase.from('leads').select('source');
      const sMap = {};
      (sourceRows || []).forEach(r => {
        const s = r.source || 'Unknown';
        sMap[s] = (sMap[s] || 0) + 1;
      });
      const sortedS = Object.entries(sMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
      setSourceData(sortedS.map(([source, count]) => ({ source, count })));

      // 4. Stage velocity — avg days cards spent moving to each stage
      const { data: pipelineCards } = await supabase.from('pipeline_cards')
        .select('stage, assigned_at, moved_at');
      const stageMap = {};
      (pipelineCards || []).forEach(c => {
        if (!c.assigned_at || !c.moved_at) return;
        const days = Math.round((new Date(c.moved_at) - new Date(c.assigned_at)) / 86400000);
        if (days < 0 || days > 365) return;
        if (!stageMap[c.stage]) stageMap[c.stage] = [];
        stageMap[c.stage].push(days);
      });
      const velocity = STAGES.filter(s => !['lost'].includes(s.id)).map(s => ({
        stage: s.label,
        color: s.color,
        avg: stageMap[s.id] ? Math.round(stageMap[s.id].reduce((a, b) => a + b, 0) / stageMap[s.id].length) : 0,
        count: (stageMap[s.id] || []).length,
      })).filter(s => s.count > 0);
      setStageVelocity(velocity);

      // 5. Total leads
      const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true });
      setTotalLeads(count || 0);

    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [period, reps]);

  useEffect(() => { if (reps.length) load(); }, [load, reps]);

  const maxCountry = Math.max(...countryData.map(d => d.count), 1);
  const maxSource  = Math.max(...sourceData.map(d => d.count), 1);
  const maxVelocity = Math.max(...stageVelocity.map(d => d.avg), 1);

  // Rep leaderboard sorted by total activities
  const repLeaderboard = reps
    .map(r => ({ ...r, total: (repActs[r.id] || {}).total || 0, byType: (repActs[r.id] || {}).byType || {} }))
    .sort((a, b) => b.total - a.total);

  // Activity type totals across all reps
  const actTypeTotals = {};
  Object.values(repActs).forEach(r => {
    Object.entries(r.byType || {}).forEach(([type, count]) => {
      actTypeTotals[type] = (actTypeTotals[type] || 0) + count;
    });
  });
  const maxActType = Math.max(...Object.values(actTypeTotals), 1);

  // Pipeline funnel
  const funnelData = STAGES.map(s => ({
    label: s.label, color: s.color,
    count: (cardsByStage[s.id] || []).length,
  })).filter(s => s.count > 0);
  const maxFunnel = Math.max(...funnelData.map(d => d.count), 1);

  const periodLabel = PERIODS.find(p => p.id === period)?.label || 'Period';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#94A3B8', fontSize: 13 }}>
      Loading analytics...
    </div>
  );

  return (
    <div style={{ padding: '16px 20px' }}>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: period === p.id ? '#0F172A' : 'transparent', color: period === p.id ? '#fff' : '#475569' }}>
              {p.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>
          {totalLeads.toLocaleString()} total leads · {cards.length} in pipeline
        </span>
      </div>

      {/* Top KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['Total leads',    totalLeads,   '#0F172A'],
          ['In pipeline',    cards.length, '#1A56DB'],
          ['Closed won',     (cardsByStage['closed_won'] || []).length, '#10B981'],
          ['Activities',     Object.values(repActs).reduce((s, r) => s + r.total, 0), '#8B5CF6'],
          ['Active reps',    reps.length,  '#F59E0B'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 110 }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: c }}>{(v || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Rep activity leaderboard */}
        <Section title={`Rep activity leaderboard · ${periodLabel}`}
          action={<button onClick={() => exportCSV(repLeaderboard.map(r => ({ rep: r.name, activities: r.total, ...r.byType })), 'rep-leaderboard.csv')}
            style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #E4E8F0', borderRadius: 6, cursor: 'pointer', background: '#F8FAFC', color: '#475569' }}>Export</button>}>
          {repLeaderboard.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 20 }}>No activity logged yet</div>
          ) : repLeaderboard.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', minWidth: 18 }}>{i + 1}</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: r.color_bg, color: r.color_text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{r.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>{r.name}</div>
                <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                  <div style={{ height: '100%', borderRadius: 3, width: (r.total / Math.max(...repLeaderboard.map(x => x.total), 1) * 100) + '%', background: '#1A56DB', transition: 'width .5s' }} />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A56DB', minWidth: 30, textAlign: 'right' }}>{r.total}</div>
            </div>
          ))}
        </Section>

        {/* Activity type breakdown */}
        <Section title={`Activity breakdown · ${periodLabel}`}
          action={<button onClick={() => exportCSV(Object.entries(actTypeTotals).map(([type, count]) => ({ type, count })), 'activity-breakdown.csv')}
            style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #E4E8F0', borderRadius: 6, cursor: 'pointer', background: '#F8FAFC', color: '#475569' }}>Export</button>}>
          {Object.keys(actTypeTotals).length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 20 }}>No activity in this period</div>
          ) : ACTIVITY_TYPES.filter(at => actTypeTotals[at.id]).map(at => (
            <Bar key={at.id} label={at.label} value={actTypeTotals[at.id] || 0} max={maxActType} color={at.color} />
          ))}
        </Section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Country breakdown */}
        <Section title="Leads by country"
          action={<button onClick={() => exportCSV(countryData, 'leads-by-country.csv')}
            style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #E4E8F0', borderRadius: 6, cursor: 'pointer', background: '#F8FAFC', color: '#475569' }}>Export</button>}>
          {countryData.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 20 }}>No data</div>
          ) : countryData.map(d => (
            <Bar key={d.country} label={d.country} value={d.count} max={maxCountry} color="#1A56DB"
              sublabel={Math.round(d.count / totalLeads * 100) + '%'} />
          ))}
        </Section>

        {/* Source breakdown */}
        <Section title="Leads by source"
          action={<button onClick={() => exportCSV(sourceData, 'leads-by-source.csv')}
            style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #E4E8F0', borderRadius: 6, cursor: 'pointer', background: '#F8FAFC', color: '#475569' }}>Export</button>}>
          {sourceData.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 20 }}>No data</div>
          ) : sourceData.map(d => (
            <Bar key={d.source} label={d.source || 'Unknown'} value={d.count} max={maxSource} color="#8B5CF6"
              sublabel={Math.round(d.count / totalLeads * 100) + '%'} />
          ))}
        </Section>
      </div>

      {/* Pipeline funnel */}
      <Section title="Pipeline funnel — current"
        action={<button onClick={() => exportCSV(funnelData, 'pipeline-funnel.csv')}
          style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #E4E8F0', borderRadius: 6, cursor: 'pointer', background: '#F8FAFC', color: '#475569' }}>Export</button>}>
        {funnelData.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 20 }}>No pipeline cards yet</div>
        ) : funnelData.map(d => (
          <Bar key={d.label} label={d.label} value={d.count} max={maxFunnel} color={d.color} />
        ))}
      </Section>

      {/* Stage velocity */}
      {stageVelocity.length > 0 && (
        <Section title="Stage velocity — avg days per stage"
          action={<button onClick={() => exportCSV(stageVelocity, 'stage-velocity.csv')}
            style={{ fontSize: 10, padding: '3px 10px', border: '1px solid #E4E8F0', borderRadius: 6, cursor: 'pointer', background: '#F8FAFC', color: '#475569' }}>Export</button>}>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>Average days a lead spends at each stage before moving forward</div>
          {stageVelocity.map(d => (
            <Bar key={d.stage} label={d.stage} value={d.avg} max={maxVelocity} color={d.color}
              sublabel={d.avg + 'd'} />
          ))}
        </Section>
      )}

    </div>
  );
}
