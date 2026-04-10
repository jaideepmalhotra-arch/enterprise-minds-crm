import React, { useState, useEffect } from 'react';
import { supabase } from '../data/supabase.js';
import { STAGES, ACTIVITY_TYPES } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';

function fmt(n) { return (n || 0).toLocaleString(); }

function RepCard({ rep, stats }) {
  const pct  = Math.min(100, Math.round(((stats.assigned || 0) / (rep.quota || 50)) * 100));
  const over = (stats.assigned || 0) > (rep.quota || 50);
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: rep.color_bg, color: rep.color_text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{rep.initials}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{rep.name}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{rep.focus || 'No region set'}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: over ? '#E24B4A' : '#1A56DB' }}>{pct}%</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>quota</div>
        </div>
      </div>
      <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, marginBottom: 14 }}>
        <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: over ? '#E24B4A' : '#1A56DB', transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {[['Assigned', stats.assigned||0,'#1A56DB'],['Activities',stats.activities||0,'#8B5CF6'],['Won',stats.won||0,'#10B981'],['Pipeline',stats.pipeline||0,'#F59E0B']].map(([l,v,c]) => (
          <div key={l} style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{fmt(v)}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Pipeline stages</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {STAGES.filter(s => !['closed_won','lost'].includes(s.id)).map(s => {
          const count = (stats.byStage || {})[s.id] || 0;
          if (!count) return null;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, flex: 1, color: '#475569' }}>{s.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{count}</span>
            </div>
          );
        })}
      </div>
      {stats.actByType && Object.keys(stats.actByType).length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>This week</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(stats.actByType).map(([type, count]) => (
              <span key={type} style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: '#EFF6FF', color: '#1A56DB' }}>{type.replace('_',' ')} {count}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardWidget({ reps, repStats }) {
  const sorted = [...reps]
    .map(r => ({ ...r, acts: (repStats[r.id] || {}).activities || 0 }))
    .sort((a, b) => b.acts - a.acts);
  const max = Math.max(...sorted.map(r => r.acts), 1);

  return (
    <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E8F0', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
        Activity leaderboard · this week
      </div>
      <div style={{ padding: '12px 16px' }}>
        {sorted.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < sorted.length - 1 ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? '#F59E0B' : '#94A3B8', minWidth: 18 }}>{i + 1}</div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.color_bg, color: r.color_text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{r.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>{r.name}</div>
              <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, width: (r.acts / max * 100) + '%', background: i === 0 ? '#F59E0B' : '#1A56DB', transition: 'width .5s' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? '#F59E0B' : '#1A56DB', minWidth: 28, textAlign: 'right' }}>{r.acts}</div>
          </div>
        ))}
        {sorted.every(r => r.acts === 0) && (
          <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>No activities logged this week</div>
        )}
      </div>
    </div>
  );
}

function SourceWidget({ sourceData, totalLeads }) {
  const max = Math.max(...sourceData.map(d => d.count), 1);
  const colors = ['#1A56DB','#8B5CF6','#10B981','#F59E0B','#EC4899','#06B6D4','#F97316','#64748B'];
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E8F0', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
        Leads by source
      </div>
      <div style={{ padding: '12px 16px' }}>
        {sourceData.slice(0, 8).map((d, i) => (
          <div key={d.source} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#475569', flex: '0 0 120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.source || 'Unknown'}</div>
            <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3 }}>
              <div style={{ height: '100%', borderRadius: 3, width: (d.count / max * 100) + '%', background: colors[i % colors.length], transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', minWidth: 30, textAlign: 'right' }}>{d.count}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', minWidth: 32 }}>{Math.round(d.count / totalLeads * 100)}%</div>
          </div>
        ))}
        {sourceData.length === 0 && <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>No source data</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { reps, cards, cardsByStage } = useSales();
  const [repStats,    setRepStats]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [teamStats,   setTeamStats]   = useState({ totalLeads: 0, thisWeekActs: 0, closedWon: 0 });
  const [sourceData,  setSourceData]  = useState([]);
  const [totalLeads,  setTotalLeads]  = useState(0);

  useEffect(() => {
    if (!reps.length) return;
    async function load() {
      setLoading(true);
      try {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekStr = weekStart.toISOString().slice(0, 10);

        const [{ data: acts }, { count: total }, { data: sourceRows }] = await Promise.all([
          supabase.from('activities').select('rep_id, type, logged_at').gte('logged_at', weekStr),
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('source'),
        ]);

        setTotalLeads(total || 0);

        // Source data
        const sMap = {};
        (sourceRows || []).forEach(r => { const s = r.source || 'Unknown'; sMap[s] = (sMap[s] || 0) + 1; });
        setSourceData(Object.entries(sMap).sort((a,b) => b[1]-a[1]).map(([source, count]) => ({ source, count })));

        // Per-rep stats
        const stats = {};
        reps.forEach(r => {
          const repCards = cards.filter(c => c.rep_id === r.id);
          const repActs  = (acts || []).filter(a => a.rep_id === r.id);
          const actByType = {};
          repActs.forEach(a => { actByType[a.type] = (actByType[a.type] || 0) + 1; });
          const byStage = {};
          repCards.forEach(c => { byStage[c.stage] = (byStage[c.stage] || 0) + 1; });
          stats[r.id] = {
            assigned:   repCards.length,
            activities: repActs.length,
            won:        repCards.filter(c => c.stage === 'closed_won').length,
            pipeline:   repCards.filter(c => !['closed_won','lost'].includes(c.stage)).length,
            byStage, actByType,
          };
        });
        setRepStats(stats);
        setTeamStats({ totalLeads: total || 0, thisWeekActs: (acts || []).length, closedWon: cards.filter(c => c.stage === 'closed_won').length });
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [reps, cards]);

  if (!reps.length || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#94A3B8', fontSize: 13 }}>Loading dashboard...</div>
  );

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Team KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['Total leads',          teamStats.totalLeads,  '#0F172A'],
          ['Active pipeline',      cards.filter(c => !['closed_won','lost'].includes(c.stage)).length, '#1A56DB'],
          ['Closed won',           teamStats.closedWon,   '#10B981'],
          ['Activities this week', teamStats.thisWeekActs,'#8B5CF6'],
          ['Reps active',          reps.length,           '#F59E0B'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: c }}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard + Source side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <LeaderboardWidget reps={reps} repStats={repStats} />
        <SourceWidget sourceData={sourceData} totalLeads={totalLeads || 1} />
      </div>

      {/* Rep cards */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
        Rep performance — week of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {reps.map(rep => <RepCard key={rep.id} rep={rep} stats={repStats[rep.id] || {}} />)}
      </div>

      {/* Pipeline overview */}
      <div style={{ marginTop: 20, background: '#fff', border: '1px solid #E4E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E8F0', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Pipeline overview</div>
        {STAGES.map(s => {
          const count = (cardsByStage[s.id] || []).length;
          const maxCount = Math.max(...STAGES.map(st => (cardsByStage[st.id] || []).length), 1);
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, flex: '0 0 150px', color: '#475569' }}>{s.label}</span>
              <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3 }}>
                <div style={{ height: '100%', borderRadius: 3, width: (count / maxCount * 100) + '%', background: s.color, opacity: 0.7, transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', minWidth: 30, textAlign: 'right' }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
