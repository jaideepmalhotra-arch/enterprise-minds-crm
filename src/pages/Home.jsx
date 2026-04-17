import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';

function ModuleCard({ color, accentBg, icon, title, desc, pages, kpis, borderColor }) {
  const navigate = useNavigate();
  return (
    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E4E8F0', borderTop: `3px solid ${borderColor}`, transition: 'box-shadow .2s, transform .2s', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: borderColor, letterSpacing: '-.2px' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
        </div>
      </div>
      {/* Page links */}
      <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pages.map((p, i) => (
          <div key={i} onClick={() => navigate(p.to)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background .12s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{p.icon}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#475569' }}>{p.label}</span>
            <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: p.statColor || '#94A3B8', fontWeight: p.statColor ? 600 : 400 }}>{p.stat}</span>
          </div>
        ))}
      </div>
      {/* Footer KPIs */}
      <div style={{ borderTop: '1px solid #F1F5F9', padding: '10px 20px', display: 'flex', gap: 20 }}>
        {kpis.map((k, i) => (
          <div key={i}>
            <div style={{ fontSize: 16, fontWeight: 700, color: borderColor, fontFamily: 'DM Mono, monospace' }}>{k.value}</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.8px', color: '#94A3B8', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { reps, cards } = useSales();
  const [stats, setStats] = useState({
    totalLeads: 0, missingEmail: 0, missingLinkedin: 0,
    exhibitors: 0, dupePairs: 0, overdueCount: 0,
    thisWeekActs: 0, closedWon: 0, activePipeline: 0,
    auditCount: 0, recentActs: [], overdueTasks: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekStr = weekStart.toISOString().slice(0, 10);

        const [
          { count: totalLeads },
          { count: missingEmail },
          { count: missingLinkedin },
          { count: exhibitors },
          { count: overdueCount },
          { data: recentActs },
          { data: overdueTasks },
          { count: thisWeekActs },
          { count: auditCount },
        ] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }).or('email.is.null,email.eq.'),
          supabase.from('leads').select('id', { count: 'exact', head: true }).or('linkedin.is.null,linkedin.eq.'),
          supabase.from('exhibitors').select('id', { count: 'exact', head: true }),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open').lt('due_date', today),
          supabase.from('activities').select('id, type, logged_at, leads(company), reps(name, color_bg, color_text)').order('logged_at', { ascending: false }).limit(5),
          supabase.from('tasks').select('id, title, type, due_date, rep_id, leads(company), reps(name)').eq('status', 'open').lte('due_date', today).order('due_date', { ascending: true }).limit(5),
          supabase.from('activities').select('id', { count: 'exact', head: true }).gte('logged_at', weekStr),
          supabase.from('audit_log').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalLeads:     totalLeads || 0,
          missingEmail:   missingEmail || 0,
          missingLinkedin: missingLinkedin || 0,
          exhibitors:     exhibitors || 0,
          overdueCount:   overdueCount || 0,
          recentActs:     recentActs || [],
          overdueTasks:   overdueTasks || [],
          thisWeekActs:   thisWeekActs || 0,
          closedWon:      cards.filter(c => c.stage === 'closed_won').length,
          activePipeline: cards.filter(c => !['closed_won', 'lost'].includes(c.stage)).length,
          auditCount:     auditCount || 0,
        });
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [cards]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const ACT_COLORS = { email: '#3B82F6', call: '#10B981', li_conn: '#0A66C2', li_msg: '#0A66C2', meeting: '#8B5CF6', whatsapp: '#25D366', note: '#64748B', enriched: '#F59E0B', follow_up: '#EC4899' };
  const TASK_TYPE_COLORS = { call: { bg: '#FEF2F2', color: '#991B1B' }, email: { bg: '#EFF6FF', color: '#1D4ED8' }, meeting: { bg: '#F5F3FF', color: '#5B21B6' }, li_conn: { bg: '#EFF6FF', color: '#0A66C2' }, li_msg: { bg: '#EFF6FF', color: '#0A66C2' }, whatsapp: { bg: '#ECFDF5', color: '#065F46' }, follow_up: { bg: '#FDF2F8', color: '#9D174D' }, other: { bg: '#F1F5F9', color: '#475569' } };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#94A3B8', fontSize: 13 }}>Loading...</div>
  );

  return (
    <div style={{ padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-.4px' }}>{greeting}, Jaideep 👋</div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{dateStr} · Enterprise Minds · Here's your CRM at a glance</div>
      </div>

      {/* 4 Module cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <ModuleCard
          borderColor="#2563EB" accentBg="rgba(37,99,235,.1)" icon="📥"
          title="Input" desc="Bring data in — import contacts, enrich leads, manage conferences"
          pages={[
            { to: '/sales/import',       icon: '⬆', label: 'Import',             stat: 'CSV / Excel · Apollo' },
            { to: '/sales/enrichment',   icon: '◈', label: 'Enrichment',         stat: `${stats.missingEmail.toLocaleString()} missing email` },
            { to: '/sales/conferences',  icon: '⬡', label: 'Conference Library', stat: `${stats.exhibitors.toLocaleString()} exhibitors` },
            { to: '/sales/dedupe',       icon: '⊜', label: 'Deduplicate',        stat: 'Review duplicate pairs' },
          ]}
          kpis={[
            { label: 'Total leads',   value: stats.totalLeads.toLocaleString() },
            { label: 'Have email',    value: Math.round((1 - stats.missingEmail / Math.max(stats.totalLeads, 1)) * 100) + '%' },
            { label: 'Have LinkedIn', value: Math.round((1 - stats.missingLinkedin / Math.max(stats.totalLeads, 1)) * 100) + '%' },
          ]}
        />
        <ModuleCard
          borderColor="#7C3AED" accentBg="rgba(124,58,237,.1)" icon="⚙️"
          title="Process" desc="Work the pipeline — manage contacts, move stages, assign & track tasks"
          pages={[
            { to: '/sales/contacts', icon: '◉', label: 'Contacts',    stat: `${stats.totalLeads.toLocaleString()} contacts` },
            { to: '/sales',          icon: '◫', label: 'Pipeline',    stat: `${stats.activePipeline} active · ${reps.length} reps` },
            { to: '/sales/assign',   icon: '←', label: 'Assign Leads', stat: 'Unassigned → reps' },
            { to: '/sales/tasks',    icon: '✓', label: 'My Tasks',    stat: stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'All clear', statColor: stats.overdueCount > 0 ? '#DC2626' : undefined },
          ]}
          kpis={[
            { label: 'In pipeline',    value: stats.activePipeline },
            { label: 'Active reps',    value: reps.length },
            { label: 'Overdue tasks',  value: stats.overdueCount },
          ]}
        />
        <ModuleCard
          borderColor="#059669" accentBg="rgba(5,150,105,.1)" icon="📤"
          title="Output" desc="See results — team performance, analytics, activity feed"
          pages={[
            { to: '/sales/dashboard', icon: '⊞', label: 'Team Dashboard', stat: 'Rep cards · quota · leaderboard' },
            { to: '/sales/analytics', icon: '▦', label: 'Analytics',      stat: 'Country · source · funnel · velocity' },
            { to: '/sales/activity',  icon: '◎', label: 'Activity Feed',  stat: `${stats.thisWeekActs} acts this week` },
          ]}
          kpis={[
            { label: 'Active reps',   value: reps.length },
            { label: 'Acts this week', value: stats.thisWeekActs },
            { label: 'Closed won',    value: stats.closedWon },
          ]}
        />
        <ModuleCard
          borderColor="#DC2626" accentBg="rgba(220,38,38,.1)" icon="🔄"
          title="Feedback" desc="Measure & improve — audit every action, manage reps and config"
          pages={[
            { to: '/sales/settings', icon: '📜', label: 'Audit Log', stat: `${stats.auditCount.toLocaleString()} entries logged` },
            { to: '/sales/settings', icon: '⚙',  label: 'Settings',  stat: 'Reps · colours · quotas' },
          ]}
          kpis={[
            { label: 'Audit entries', value: stats.auditCount.toLocaleString() },
            { label: 'Active reps',   value: reps.length },
            { label: 'System',        value: '✓ Live' },
          ]}
        />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent activity */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>⚡ Recent activity</div>
            <span onClick={() => window.location.href = '/sales/activity'} style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, cursor: 'pointer' }}>Full feed →</span>
          </div>
          {stats.recentActs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No activity logged yet</div>
          ) : stats.recentActs.map((a, i) => {
            const rep = a.reps;
            const dotColor = ACT_COLORS[a.type] || '#94A3B8';
            const timeAgo = (() => {
              const diff = Date.now() - new Date(a.logged_at);
              const m = Math.round(diff / 60000);
              if (m < 60) return `${m}m ago`;
              if (m < 1440) return `${Math.round(m/60)}h ago`;
              return `${Math.round(m/1440)}d ago`;
            })();
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: '1px solid #F8FAFC' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 11, color: '#475569' }}>
                  {rep && <strong style={{ color: '#0F172A', fontWeight: 600 }}>{rep.name} </strong>}
                  logged {a.type?.replace('_', ' ')}
                  {a.leads?.company && <span> — {a.leads.company}</span>}
                </div>
                <div style={{ fontSize: 10, color: '#CBD5E1', fontFamily: 'monospace', flexShrink: 0 }}>{timeAgo}</div>
              </div>
            );
          })}
        </div>

        {/* Overdue & today tasks */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>✓ Overdue & due today</div>
            <span onClick={() => window.location.href = '/sales/tasks'} style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, cursor: 'pointer' }}>All tasks →</span>
          </div>
          {stats.overdueTasks.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
              <div style={{ color: '#065F46', fontWeight: 600 }}>All clear — no overdue tasks</div>
            </div>
          ) : stats.overdueTasks.map((t, i) => {
            const today = new Date().toISOString().slice(0, 10);
            const isOverdue = t.due_date < today;
            const tc = TASK_TYPE_COLORS[t.type] || TASK_TYPE_COLORS.other;
            const dueLabel = isOverdue
              ? `${Math.round((Date.now() - new Date(t.due_date)) / 86400000)}d overdue`
              : 'Today';
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', background: tc.bg, color: tc.color, flexShrink: 0 }}>
                  {t.type?.replace('_', ' ')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                    {t.reps?.name && <span>{t.reps.name}</span>}
                    {t.leads?.company && <span> · {t.leads.company}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, flexShrink: 0, color: isOverdue ? '#DC2626' : '#92600A' }}>{dueLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
