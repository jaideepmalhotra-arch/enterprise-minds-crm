import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';

// Every number here is computed from Supabase. The team list is your active reps,
// and the green dot is live Supabase Realtime presence (who has Team Room open).

const CHANNELS = [
  { id: 'general',          label: '# general',          desc: 'Team-wide' },
  { id: 'announcements',    label: '# announcements',    desc: 'Updates from management' },
  { id: 'pipeline-updates', label: '# pipeline-updates', desc: 'Deal and stage news' },
  { id: 'agent-updates',    label: '🤖 agent-updates',   desc: 'Posted by the AI Sales Agent' },
];

const ID_KEY = 'crm_team_room_rep';

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Live numbers, shared by the MIS strip, the briefing and @ai replies ──────
function useMis() {
  const { cards } = useSales();
  const [counts, setCounts] = useState({ leads: null, overdue: null, dueToday: null, enriched: null });

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [l, o, d, e] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open').lt('due_date', today),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('due_date', today),
        supabase.from('companies').select('id', { count: 'exact', head: true }).not('ai_enriched_at', 'is', null),
      ]);
      setCounts({ leads: l.count ?? 0, overdue: o.count ?? 0, dueToday: d.count ?? 0, enriched: e.count ?? 0 });
    }
    load();
  }, [cards]);

  const byStage = {};
  cards.forEach(c => { byStage[c.stage] = (byStage[c.stage] || 0) + 1; });
  const open = cards.filter(c => c.stage !== 'closed_won' && c.stage !== 'lost').length;

  return { ...counts, inPipeline: cards.length, open, byStage };
}

function MisStrip({ mis }) {
  const kpis = [
    { label: 'Total Leads',   value: mis.leads,                       color: '#60A5FA' },
    { label: 'In Pipeline',   value: mis.inPipeline,                  color: '#A78BFA' },
    { label: 'Overdue Tasks', value: mis.overdue,                     color: '#F87171' },
    { label: 'Meetings',      value: mis.byStage.meeting || 0,        color: '#34D399' },
    { label: 'Closed Won',    value: mis.byStage.closed_won || 0,     color: '#FBBF24' },
    { label: 'AI Enriched',   value: mis.enriched,                    color: '#67E8F9' },
  ];
  return (
    <div style={{ display: 'flex', background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
      {kpis.map(k => (
        <div key={k.label} style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value == null ? '…' : k.value.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// Computed fresh on every visit, never stored, so it can't go stale.
function Briefing({ mis }) {
  if (mis.leads == null) return null;
  const meetings = mis.byStage.meeting || 0;
  const negotiating = mis.byStage.negotiation || 0;
  const text = `${mis.open.toLocaleString('en-IN')} open deals in the pipeline. `
    + `${mis.dueToday} task${mis.dueToday === 1 ? '' : 's'} due today and ${mis.overdue} overdue. `
    + `${meetings} at meeting stage, ${negotiating} in negotiation.`;
  return (
    <div style={{ margin: '4px 0 14px', padding: '12px 16px', background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 10, maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🤖</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8' }}>Today's briefing</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginLeft: 'auto' }}>live from your CRM</span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function Avatar({ init, color, size = 30 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color || '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {init}
    </div>
  );
}

function Bubble({ msg, me }) {
  if (msg.msg_type === 'ai_card') return null; // old seeded cards are retired

  const isAI = msg.sender_name === 'AI Agent';
  const isMe = me && msg.sender_name === me.name;
  return (
    <div style={{ display: 'flex', gap: 10, margin: '6px 0', flexDirection: isMe ? 'row-reverse' : 'row' }}>
      {isAI
        ? <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🤖</div>
        : <Avatar init={msg.sender_init} color={msg.sender_color} />}
      <div style={{ maxWidth: '65%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: isAI ? '#818CF8' : msg.sender_color }}>{msg.sender_name}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>{fmtTime(msg.created_at)}</span>
        </div>
        <div style={{
          padding: '8px 12px', borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          background: isMe ? 'rgba(26,86,219,.5)' : isAI ? 'rgba(99,102,241,.12)' : 'rgba(255,255,255,.07)',
          border: `1px solid ${isMe ? 'rgba(59,116,232,.4)' : isAI ? 'rgba(99,102,241,.3)' : 'rgba(255,255,255,.08)'}`,
          fontSize: 12, color: 'rgba(255,255,255,.88)', lineHeight: 1.5, whiteSpace: 'pre-wrap',
        }}>
          {msg.body}
        </div>
      </div>
    </div>
  );
}

// ─── One-time "who are you?" picker (stored in this browser only) ─────────────
function WhoAreYou({ reps, onPick }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 24, width: 320 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Who's chatting?</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 16 }}>Pick your name once. This browser will remember it.</div>
        {reps.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>No active reps found in Settings.</div>}
        {reps.map(r => (
          <button key={r.id} onClick={() => onPick(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', marginBottom: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#fff', cursor: 'pointer', fontSize: 13, textAlign: 'left' }}>
            <Avatar init={r.initials} color={r.color_bg} size={26} />
            {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function TeamRoom() {
  const { reps } = useSales();
  const mis = useMis();

  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ID_KEY)) || null; } catch { return null; }
  });
  const [channel, setChannel]   = useState('general');
  const [messages, setMessages] = useState([]);
  const [online, setOnline]     = useState(new Set());
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  function pickMe(rep) {
    const id = { id: rep.id, name: rep.name, init: rep.initials || rep.name.slice(0, 2).toUpperCase(), color: rep.color_bg || '#1A56DB' };
    try { localStorage.setItem(ID_KEY, JSON.stringify(id)); } catch {}
    setMe(id);
  }

  // Messages: history + realtime inserts for the open channel
  useEffect(() => {
    let alive = true;
    supabase.from('room_messages').select('*').eq('channel', channel)
      .order('created_at', { ascending: true }).limit(200)
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) setError(e.message);
        setMessages(data || []);
      });

    const sub = supabase
      .channel(`room:${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `channel=eq.${channel}` },
        payload => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();

    return () => { alive = false; supabase.removeChannel(sub); };
  }, [channel]);

  // Presence: who has Team Room open right now
  useEffect(() => {
    if (!me) return;
    const pres = supabase.channel('team-room-presence', { config: { presence: { key: me.id } } });
    pres
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(pres.presenceState()))))
      .subscribe(status => { if (status === 'SUBSCRIBED') pres.track({ name: me.name }); });
    return () => { supabase.removeChannel(pres); };
  }, [me]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const post = (row) => supabase.from('room_messages').insert({ channel, msg_type: 'text', ...row });

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !me) return;
    setSending(true); setInput(''); setError('');

    const { error: e } = await post({ sender_name: me.name, sender_init: me.init, sender_color: me.color, body: text });
    if (e) { setError(e.message); setInput(text); setSending(false); return; }
    setSending(false);

    if (/@ai\b/i.test(text)) {
      await post({ sender_name: 'AI Agent', sender_init: 'AI', sender_color: '#6366F1', body: aiReply(text, mis) });
    }
    inputRef.current?.focus();
  }, [input, sending, me, channel, mis]);

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const ch = CHANNELS.find(c => c.id === channel);

  return (
    <div style={{ position: 'relative', display: 'flex', height: 'calc(100vh - 52px)', background: '#0F172A', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {!me && <WhoAreYou reps={reps} onPick={pickMe} />}

      {/* ── Left: channels + team ── */}
      <div style={{ width: 200, borderRight: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 14px 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Channels</div>
        {CHANNELS.map(c => (
          <button key={c.id} onClick={() => setChannel(c.id)} style={{
            textAlign: 'left', border: 'none', cursor: 'pointer', padding: '7px 14px', fontSize: 12,
            background: channel === c.id ? 'rgba(99,102,241,.2)' : 'transparent',
            borderLeft: `2px solid ${channel === c.id ? '#818CF8' : 'transparent'}`,
            color: channel === c.id ? '#fff' : 'rgba(255,255,255,.5)', fontWeight: channel === c.id ? 600 : 400,
          }}>{c.label}</button>
        ))}

        <div style={{ padding: '14px 14px 8px', marginTop: 8, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px', borderTop: '1px solid rgba(255,255,255,.06)' }}>Team</div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {reps.map(r => {
            const isOn = online.has(r.id);
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', opacity: isOn ? 1 : 0.5 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar init={r.initials} color={r.color_bg} size={22} />
                  {isOn && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: '#10B981', border: '1.5px solid #0F172A' }} />}
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{r.name}{me?.id === r.id ? ' (you)' : ''}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 10, color: 'rgba(255,255,255,.35)', display: 'flex', justifyContent: 'space-between' }}>
          <span><span style={{ color: '#10B981', fontWeight: 600 }}>{online.size}</span> online · {reps.length} reps</span>
          {me && <span onClick={() => { try { localStorage.removeItem(ID_KEY); } catch {} setMe(null); }} style={{ cursor: 'pointer', textDecoration: 'underline' }}>switch</span>}
        </div>
      </div>

      {/* ── Center: messages ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <MisStrip mis={mis} />

        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{ch.label}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>— {ch.desc}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#10B981' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />Realtime
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {channel === 'general' && <Briefing mis={mis} />}
          {messages.filter(m => m.msg_type !== 'ai_card').length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 10 }}>No messages in {ch.label} yet.</div>
          )}
          {messages.map(m => <Bubble key={m.id} msg={m} me={me} />)}
          <div ref={bottomRef} />
        </div>

        {error && <div style={{ padding: '6px 20px', fontSize: 11, color: '#FCA5A5' }}>Couldn't send: {error}</div>}

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 14px' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} rows={1}
              placeholder={`Message ${ch.label}  ·  type @ai for a live pipeline answer`}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || sending || !me} style={{
            padding: '10px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            background: input.trim() ? 'linear-gradient(135deg,#1A56DB,#3B74E8)' : 'rgba(255,255,255,.08)',
            color: input.trim() ? '#fff' : 'rgba(255,255,255,.3)',
          }}>{sending ? '…' : '↑ Send'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── @ai replies: answered from live CRM numbers only ─────────────────────────
function aiReply(text, mis) {
  const t = text.toLowerCase();
  if (/task|overdue|due/.test(t)) {
    return `Tasks: ${mis.dueToday} due today, ${mis.overdue} overdue. Open My Tasks to work through them.`;
  }
  if (/won|closed|meeting|proposal|negotiat|pipeline|stage|deal/.test(t)) {
    const top = Object.entries(mis.byStage).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([s, n]) => `${s.replace('_', ' ')} ${n}`).join(' · ');
    return `Pipeline: ${mis.inPipeline} cards, ${mis.open} still open.\nBiggest stages: ${top || 'none yet'}.\n`
      + `Meetings ${mis.byStage.meeting || 0} · Negotiation ${mis.byStage.negotiation || 0} · Closed won ${mis.byStage.closed_won || 0}.`;
  }
  if (/lead|enrich/.test(t)) {
    return `Leads: ${mis.leads} in the database, ${mis.inPipeline} in the pipeline. ${mis.enriched} companies have an AI profile.`;
  }
  return 'I can answer from live CRM numbers. Try "@ai pipeline", "@ai tasks" or "@ai leads". To assign and enrich new leads, use the AI Sales Agent page.';
}
