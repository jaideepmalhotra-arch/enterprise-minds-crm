import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';
import { Toast } from '../components/UI.jsx';

const TYPE_ICONS = {
  call: '📞', email: '✉', li_conn: 'in', li_msg: 'in',
  meeting: '🎥', whatsapp: '💬', other: '●', follow_up: '↩',
};
const TYPE_COLORS = {
  call: '#10B981', email: '#3B82F6', li_conn: '#0A66C2', li_msg: '#0A66C2',
  meeting: '#8B5CF6', whatsapp: '#25D366', other: '#64748B', follow_up: '#EC4899',
};
const PRIORITY_CONFIG = {
  high:   { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
  medium: { bg: '#FFFBEB', color: '#92600A', border: '#FCD34D' },
  low:    { bg: '#F8FAFC', color: '#475569', border: '#E4E8F0' },
};

function TaskCard({ task, onDone, onSnooze }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.due_date && task.due_date < today && task.status === 'open';
  const isToday   = task.due_date === today;
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const tc = TYPE_COLORS[task.type] || '#64748B';

  return (
    <div style={{ background: '#fff', border: `1px solid ${isOverdue ? '#FCA5A5' : '#E4E8F0'}`, borderLeft: `3px solid ${isOverdue ? '#E24B4A' : isToday ? '#F59E0B' : tc}`, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{TYPE_ICONS[task.type] || '●'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{task.title}</span>
          <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}>{task.priority}</span>
          {isOverdue && <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }}>OVERDUE</span>}
          {isToday && !isOverdue && <span style={{ padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: '#FFFBEB', color: '#92600A', border: '1px solid #FCD34D' }}>TODAY</span>}
        </div>
        <div style={{ fontSize: 11, color: '#64748B', marginBottom: 3 }}>
          {task.lead_company && <span style={{ fontWeight: 600, color: '#0F172A' }}>{task.lead_company}</span>}
          {task.lead_contact && <span style={{ color: '#94A3B8' }}> · {task.lead_contact}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {task.rep_name && <span style={{ fontSize: 10, color: '#64748B' }}>→ {task.rep_name}</span>}
          {task.due_date && <span style={{ fontSize: 10, color: isOverdue ? '#E24B4A' : '#94A3B8' }}>Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
          {task.completed_at && <span style={{ fontSize: 10, color: '#10B981' }}>Done: {new Date(task.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
        </div>
      </div>
      {task.status !== 'done' && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={() => onDone(task.id)} style={{ padding: '4px 10px', background: '#ECFDF5', color: '#065F46', border: '1px solid #86EFAC', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓ Done</button>
          <button onClick={() => onSnooze(task.id)} style={{ padding: '4px 10px', background: '#F8FAFC', color: '#64748B', border: '1px solid #E4E8F0', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Snooze 3d</button>
        </div>
      )}
    </div>
  );
}

export default function MyTasksPage() {
  const { reps } = useSales();
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('open');
  const [repFilter,setRepFilter]= useState('all');
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('tasks')
        .select('*, leads(company, contact), reps(name)')
        .order('due_date', { ascending: true, nullsLast: true });
      if (tab === 'open')     q = q.eq('status', 'open').gt('due_date', new Date().toISOString().slice(0,10));
      else if (tab === 'overdue') q = q.eq('status', 'open').lt('due_date', new Date().toISOString().slice(0,10));
      else if (tab === 'done')    q = q.eq('status', 'done').order('completed_at', { ascending: false });
      else if (tab === 'snoozed') q = q.eq('status', 'snoozed');
      if (repFilter !== 'all') q = q.eq('rep_id', repFilter);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      setTasks((data || []).map(t => ({
        ...t,
        lead_company: t.leads?.company,
        lead_contact: t.leads?.contact,
        rep_name:     t.reps?.name,
      })));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab, repFilter]);

  useEffect(() => { load(); }, [load]);

  async function markDone(id) {
    await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
    showToast('Task completed ✓');
    load();
  }

  async function snooze(id) {
    const d = new Date(); d.setDate(d.getDate() + 3);
    await supabase.from('tasks').update({ status: 'snoozed', due_date: d.toISOString().slice(0,10) }).eq('id', id);
    showToast('Snoozed 3 days');
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = tasks.filter(t => t.status === 'open' && t.due_date && t.due_date < today).length;

  const TABS = [
    { id: 'open',    label: 'Open' },
    { id: 'overdue', label: `Overdue${overdueCount > 0 && tab !== 'overdue' ? ` (${overdueCount})` : ''}` },
    { id: 'snoozed', label: 'Snoozed' },
    { id: 'done',    label: 'Done' },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === t.id ? '#0F172A' : 'transparent', color: tab === t.id ? '#fff' : '#475569' }}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={repFilter} onChange={e => setRepFilter(e.target.value)}
          style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 10px', fontSize: 11, background: '#fff' }}>
          <option value="all">All reps</option>
          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{tasks.length} tasks</span>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading...</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No {tab} tasks</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(t => <TaskCard key={t.id} task={t} onDone={markDone} onSnooze={snooze} />)}
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
