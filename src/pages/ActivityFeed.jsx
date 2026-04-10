import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';
import { ACTIVITY_TYPES } from '../data/supabase.js';

const PAGE_SIZE = 50;

export default function ActivityFeedPage() {
  const { reps } = useSales();
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [repFilter,  setRepFilter]  = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [days,       setDays]       = useState('7');
  const [page,       setPage]       = useState(0);
  const [total,      setTotal]      = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
      let q = supabase
        .from('activities')
        .select('*, leads(company, contact, country), reps(name, initials, color_bg, color_text)', { count: 'exact' })
        .gte('logged_at', since)
        .order('logged_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (repFilter !== 'all')  q = q.eq('rep_id', repFilter);
      if (typeFilter !== 'all') q = q.eq('type', typeFilter);
      const { data, count, error } = await q;
      if (error) throw error;
      setActivities(data || []);
      setTotal(count || 0);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [repFilter, typeFilter, days, page]);

  useEffect(() => { setPage(0); }, [repFilter, typeFilter, days]);
  useEffect(() => { load(); }, [load]);

  // Group by date
  const groups = activities.reduce((acc, a) => {
    const d = new Date(a.logged_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {ACTIVITY_TYPES.slice(0, 5).map(at => {
          const count = activities.filter(a => a.type === at.id).length;
          return (
            <div key={at.id} style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 90 }}>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{at.label}</div>
              <div style={{ fontSize: 19, fontWeight: 600, color: at.color }}>{count}</div>
            </div>
          );
        })}
        <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 9, padding: '10px 14px', flex: 1, minWidth: 90 }}>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>Total</div>
          <div style={{ fontSize: 19, fontWeight: 600, color: '#0F172A' }}>{total}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={repFilter} onChange={e => setRepFilter(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value="all">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value="all">All types</option>
          {ACTIVITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={days} onChange={e => setDays(e.target.value)} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
        </select>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{total} activities</span>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading...</div>
      ) : Object.keys(groups).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>○</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No activities in this period</div>
        </div>
      ) : (
        <div>
          {Object.entries(groups).map(([date, acts]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>
                {date} · {acts.length} activities
              </div>
              <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderRadius: 10, overflow: 'hidden' }}>
                {acts.map((a, i) => {
                  const at = ACTIVITY_TYPES.find(x => x.id === a.type);
                  const rep = a.reps;
                  return (
                    <div key={a.id} style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: i < acts.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
                      {/* Rep avatar */}
                      {rep && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: rep.color_bg || '#E6F1FB', color: rep.color_text || '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {rep.initials || '?'}
                        </div>
                      )}
                      {/* Activity dot */}
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: at?.color || '#94A3B8', flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                          {at && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: at.color + '22', color: at.color }}>{at.label}</span>}
                          {rep && <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{rep.name}</span>}
                          {a.leads?.company && <span style={{ fontSize: 11, color: '#64748B' }}>→ {a.leads.company}</span>}
                          {a.leads?.contact && <span style={{ fontSize: 11, color: '#94A3B8' }}>· {a.leads.contact}</span>}
                        </div>
                        {a.outcome && <div style={{ fontSize: 11, color: '#475569', marginBottom: 1 }}>{a.outcome}</div>}
                        {a.note && <div style={{ fontSize: 11, color: '#94A3B8' }}>{a.note}</div>}
                      </div>
                      <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>
                        {new Date(a.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: '6px 14px', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 12, cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, background: '#fff' }}>← Prev</button>
              <span style={{ padding: '6px 14px', fontSize: 12, color: '#64748B' }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
                style={{ padding: '6px 14px', border: '1px solid #D0D7E5', borderRadius: 7, fontSize: 12, cursor: (page + 1) * PAGE_SIZE >= total ? 'not-allowed' : 'pointer', opacity: (page + 1) * PAGE_SIZE >= total ? 0.4 : 1, background: '#fff' }}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
