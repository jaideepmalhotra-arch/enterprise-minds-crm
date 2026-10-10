import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';

// Every figure on this page comes from the ai-enrich-leads function result,
// the agent_runs table, or the tasks table. Steps that aren't built yet
// (email campaign, tracking, LinkedIn) are shown as "Not connected yet".

const STEPS = [
  { id: 'input',   label: 'Find new leads',  icon: '📥', desc: 'Leads not yet in the pipeline, newest first', stat: s => `${s.scanned} scanned` },
  { id: 'hygiene', label: 'Hygiene check',   icon: '🧹', desc: 'Skip duplicate and invalid emails',          stat: s => `${s.duplicates} dupes · ${s.invalid_emails} invalid`, toggle: true },
  { id: 'assign',  label: 'Auto-assign',     icon: '👤', desc: 'Round-robin to rep with fewest open cards',  stat: s => `${s.assigned} assigned`, toggle: true },
  { id: 'enrich',  label: 'AI enrich',       icon: '✦',  desc: 'Uses your ai-enrich-company function',       stat: s => `${s.enriched} enriched${s.enrich_failed ? ` · ${s.enrich_failed} failed` : ''}`, toggle: true },
  { id: 'gap',     label: 'Gap tasks',       icon: '⚠',  desc: 'Task for missing email, phone, role, country', stat: s => `${s.gap_tasks} tasks`, toggle: true },
  { id: 'email',   label: 'Email campaign',  icon: '✉',  desc: 'Resend · emindsscale.com',                   soon: true },
  { id: 'track',   label: 'Track & follow',  icon: '📊', desc: 'Open/click tracking · auto follow-up',       soon: true },
];

const C = {
  idle:   { bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)', text: 'rgba(255,255,255,.55)' },
  active: { bg: 'rgba(99,102,241,.15)',  border: '#6366F1',               text: '#fff' },
  done:   { bg: 'rgba(52,211,153,.08)',  border: 'rgba(52,211,153,.3)',   text: 'rgba(255,255,255,.85)' },
  error:  { bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.35)', text: 'rgba(255,255,255,.85)' },
  off:    { bg: 'transparent',           border: 'rgba(255,255,255,.05)', text: 'rgba(255,255,255,.25)' },
};

const label = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 };

function fmtWhen(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Toggle({ on, onClick, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      width: 30, height: 16, borderRadius: 8, flexShrink: 0, position: 'relative',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .35 : 1,
      background: on ? '#6366F1' : 'rgba(255,255,255,.15)', transition: 'background .2s',
    }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </div>
  );
}

export default function AgentRunner() {
  const { reps, refresh } = useSales();

  const [enabled, setEnabled] = useState({ hygiene: true, assign: true, enrich: true, gap: true });
  const [limit,   setLimit]   = useState(25);
  const [status,  setStatus]  = useState('idle');   // idle | running | done | error
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [runs,    setRuns]    = useState([]);
  const [gaps,    setGaps]    = useState([]);

  const repName = useCallback(id => reps.find(r => r.id === id)?.name || id || 'Unassigned', [reps]);

  const loadHistory = useCallback(async () => {
    const [{ data: r }, { data: g }] = await Promise.all([
      supabase.from('agent_runs').select('*').order('started_at', { ascending: false }).limit(8),
      supabase.from('tasks').select('id, title, rep_id, due_date')
        .eq('created_by', 'AI Agent').eq('status', 'open')
        .order('created_at', { ascending: false }).limit(20),
    ]);
    setRuns(r || []);
    setGaps(g || []);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function run() {
    if (status === 'running') return;
    setStatus('running'); setError(''); setResult(null);
    const steps = Object.keys(enabled).filter(k => enabled[k]);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('ai-enrich-leads', {
        body: { limit, steps, triggered_by: 'manual' },
      });
      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || 'Agent run failed');
      setResult(data);
      setStatus('done');
      refresh();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(/not found|404|Failed to send/i.test(msg)
        ? 'The ai-enrich-leads function is not deployed yet. Deploy it in Supabase → Edge Functions, then run again.'
        : msg);
      setStatus('error');
    } finally {
      loadHistory();
    }
  }

  function stepState(step) {
    if (step.soon) return 'off';
    if (step.toggle && !enabled[step.id]) return 'off';
    if (status === 'running') return 'active';
    if (status === 'done')    return 'done';
    if (status === 'error')   return 'error';
    return 'idle';
  }

  const last = result || runs.find(r => r.status === 'complete')?.stats || null;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', background: '#0F172A', color: '#fff', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Left: pipeline steps ── */}
      <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>AI Inside Sales Agent</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>Runs on your Supabase data · every number is real</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {STEPS.map(step => {
            const st = stepState(step);
            const c  = C[st];
            return (
              <div key={step.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, marginBottom: 6, borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, transition: 'all .3s' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  background: st === 'done' ? 'rgba(52,211,153,.2)' : 'rgba(255,255,255,.06)',
                  animation: st === 'active' ? 'pulse 1.2s infinite' : 'none' }}>
                  {st === 'done' ? '✓' : step.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2, lineHeight: 1.4 }}>{step.desc}</div>
                  {st === 'done' && result && step.stat && (
                    <div style={{ fontSize: 10, color: '#34D399', marginTop: 4, fontWeight: 600 }}>{step.stat(result)}</div>
                  )}
                  {step.soon && <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginTop: 4, fontWeight: 700, letterSpacing: '.5px' }}>NOT CONNECTED YET</div>}
                </div>
                {step.toggle && (
                  <Toggle on={enabled[step.id]} disabled={status === 'running'}
                    onClick={() => setEnabled(s => ({ ...s, [step.id]: !s[step.id] }))} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
            <span>Leads per run</span>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} disabled={status === 'running'}
              style={{ background: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.15)', borderRadius: 6, padding: '3px 6px', fontSize: 11 }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n} style={{ color: '#000' }}>{n}</option>)}
            </select>
          </div>
          <button onClick={run} disabled={status === 'running'} style={{
            width: '100%', padding: 12, borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: status === 'running' ? 'not-allowed' : 'pointer',
            background: status === 'running' ? 'rgba(99,102,241,.3)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
          }}>
            {status === 'running' ? '⟳ Running… (can take a minute)' : status === 'done' ? '↺ Run again' : '▶ Run pipeline'}
          </button>
        </div>
      </div>

      {/* ── Center: result + gap queue ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Run result</span>
          {status === 'running' && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(99,102,241,.2)', color: '#818CF8', fontWeight: 600 }}>● RUNNING</span>}
          {status === 'done'    && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(52,211,153,.15)', color: '#34D399', fontWeight: 600 }}>✓ COMPLETE</span>}
          {status === 'error'   && <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(248,113,113,.15)', color: '#F87171', fontWeight: 600 }}>✕ FAILED</span>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {status === 'idle' && !result && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 12, marginTop: 40 }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🤖</div>
              Click "Run pipeline" to assign, enrich and check new leads.
            </div>
          )}
          {status === 'running' && (
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Working through up to {limit} new leads…</div>
          )}
          {status === 'error' && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', fontSize: 12, color: '#FCA5A5' }}>{error}</div>
          )}
          {result && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  ['New leads scanned', result.scanned,        '#60A5FA'],
                  ['Assigned',          result.assigned,       '#A78BFA'],
                  ['Companies enriched',result.enriched,       '#67E8F9'],
                  ['Gap tasks created', result.gap_tasks,      '#FBBF24'],
                  ['Duplicates skipped',result.duplicates,     '#F87171'],
                  ['Invalid emails',    result.invalid_emails, '#F87171'],
                ].map(([l, v, col]) => (
                  <div key={l} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: col }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
              {result.scanned === 0 && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Every lead is already in the pipeline, so there was nothing new to process.</div>
              )}
              {result.errors?.length > 0 && (
                <div style={{ padding: 10, borderRadius: 8, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.25)', fontSize: 11, color: '#FCD34D' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{result.errors.length} warning{result.errors.length > 1 ? 's' : ''}</div>
                  {result.errors.slice(0, 5).map((e, i) => <div key={i} style={{ opacity: .8 }}>{e}</div>)}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.08)', maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#FBBF24', marginBottom: 8 }}>⚠ Needs team action · {gaps.length} open gap task{gaps.length === 1 ? '' : 's'}</div>
          {gaps.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>None right now.</div>}
          {gaps.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12 }}>
              <span style={{ flex: 1, color: 'rgba(255,255,255,.85)' }}>{t.title}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>{repName(t.rep_id)} · due {t.due_date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: last run + history ── */}
      <div style={{ width: 240, borderLeft: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={label}>Last completed run</div>
          {!last && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>No runs yet.</div>}
          {last && [
            ['Scanned',   last.scanned,   '#60A5FA'],
            ['Assigned',  last.assigned,  '#A78BFA'],
            ['Enriched',  last.enriched,  '#67E8F9'],
            ['Gap tasks', last.gap_tasks, '#FBBF24'],
          ].map(([l, v, col]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{v ?? '—'}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <div style={label}>Run history</div>
          {runs.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>Nothing yet.</div>}
          {runs.map(r => (
            <div key={r.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'rgba(255,255,255,.7)' }}>{fmtWhen(r.started_at)}</span>
                <span style={{ fontWeight: 700, color: r.status === 'complete' ? '#34D399' : r.status === 'failed' ? '#F87171' : '#818CF8' }}>{r.status}</span>
              </div>
              {r.status === 'complete' && r.stats && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>{r.stats.assigned} assigned · {r.stats.enriched} enriched · {r.stats.gap_tasks} tasks</div>
              )}
              {r.status === 'failed' && r.stats?.error && (
                <div style={{ fontSize: 10, color: '#FCA5A5', marginTop: 2 }}>{r.stats.error}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
