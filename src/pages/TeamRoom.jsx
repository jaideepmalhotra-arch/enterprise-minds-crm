import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../data/supabase.js';
import { useSales } from '../data/SalesContext.jsx';

// ─── Channel config ────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'general',          label: '# general',           desc: 'Team-wide' },
  { id: 'announcements',    label: '# announcements',      desc: 'Read-only' },
  { id: 'pipeline-updates', label: '# pipeline-updates',  desc: 'Auto-posted' },
  { id: 'agent-updates',    label: '🤖 agent-updates',    desc: 'AI agent log' },
];

const DM_REPS = [
  { name: 'Arjun Sharma',    init: 'AS', color: '#7C3AED', online: true  },
  { name: 'Priya Nair',      init: 'PN', color: '#DC2626', online: true  },
  { name: 'Rohan Mehta',     init: 'RM', color: '#D97706', online: false },
  { name: 'Sneha Kulkarni',  init: 'SK', color: '#059669', online: true  },
  { name: 'Vikram Das',      init: 'VD', color: '#0284C7', online: false },
];

// ─── Local identity (localStorage) ────────────────────────────────────────────
const ME = {
  name:  localStorage.getItem('crm_rep_name')  || 'Jaideep Malhotra',
  init:  localStorage.getItem('crm_rep_init')  || 'JM',
  color: localStorage.getItem('crm_rep_color') || '#1A56DB',
};

// ─── MIS strip ─────────────────────────────────────────────────────────────────
function MisStrip() {
  const { cards, reps } = useSales();
  const [extra, setExtra] = useState({ tasks: 0, enriched: 0, meetings: 0, won: 0 });

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: td }, { count: mt }, { count: cw }] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open').lt('due_date', today),
        supabase.from('pipeline_cards').select('id', { count: 'exact', head: true }).eq('stage', 'meeting'),
        supabase.from('pipeline_cards').select('id', { count: 'exact', head: true }).eq('stage', 'closed_won'),
      ]);
      const enriched = cards.filter(c => c.stage !== 'assigned').length;
      setExtra({ tasks: td || 0, meetings: mt || 0, won: cw || 0, enriched });
    }
    load();
  }, [cards]);

  const kpis = [
    { label: 'Total Leads',   value: (cards.length + 847).toLocaleString(), color: '#60A5FA' },
    { label: 'In Pipeline',   value: cards.length,                           color: '#A78BFA' },
    { label: 'Tasks Due',     value: extra.tasks,                            color: '#F87171' },
    { label: 'Meetings Set',  value: extra.meetings,                         color: '#34D399' },
    { label: 'Closed Won',    value: extra.won,                              color: '#FBBF24' },
    { label: 'AI Enriched',   value: extra.enriched,                        color: '#67E8F9' },
  ];

  return (
    <div style={{ display: 'flex', gap: 1, background: '#0F172A', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
      {kpis.map(k => (
        <div key={k.label} style={{ flex: 1, padding: '8px 12px', borderRight: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isMe = msg.sender_name === ME.name;

  if (msg.msg_type === 'ai_card') {
    return (
      <div style={{ margin: '12px 0', padding: '12px 16px', background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 10, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🤖</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8' }}>AI Morning Briefing</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', marginLeft: 'auto' }}>{fmtTime(msg.created_at)}</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', lineHeight: 1.6, marginBottom: 10 }}>{msg.body}</div>
        {msg.metadata?.stats && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {msg.metadata.stats.map((s, i) => (
              <div key={i} style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(99,102,241,.2)', fontSize: 11, color: '#A5B4FC' }}>
                <strong>{s.v}</strong> {s.l}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (msg.msg_type === 'task_card') {
    const tasks = msg.metadata?.tasks || [];
    return (
      <div style={{ margin: '12px 0', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🤖</div>
          <span style={{ fontSize: 11, color: '#818CF8', fontWeight: 600 }}>AI Agent</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>{fmtTime(msg.created_at)}</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 8 }}>{msg.body}</div>
        {tasks.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,.04)', borderRadius: 7, marginBottom: 4, border: '1px solid rgba(255,255,255,.07)' }}>
            <span style={{ fontSize: 12 }}>{t.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{t.sub}</div>
            </div>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'rgba(52,211,153,.15)', color: '#34D399' }}>Created</span>
          </div>
        ))}
      </div>
    );
  }

  // Normal text message
  return (
    <div style={{ display: 'flex', gap: 10, margin: '6px 0', flexDirection: isMe ? 'row-reverse' : 'row' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: msg.sender_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {msg.sender_init}
      </div>
      <div style={{ maxWidth: '65%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: msg.sender_color }}>{msg.sender_name}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>{fmtTime(msg.created_at)}</span>
        </div>
        <div style={{
          padding: '8px 12px', borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          background: isMe ? 'rgba(26,86,219,.5)' : 'rgba(255,255,255,.07)',
          fontSize: 12, color: 'rgba(255,255,255,.88)', lineHeight: 1.5,
          border: `1px solid ${isMe ? 'rgba(59,116,232,.4)' : 'rgba(255,255,255,.08)'}`,
        }}>
          {msg.body}
        </div>
      </div>
    </div>
  );
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingDot() {
  return (
    <div style={{ display: 'flex', gap: 10, margin: '6px 0', alignItems: 'flex-end' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🤖</div>
      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,.07)', borderRadius: '4px 14px 14px 14px', border: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#818CF8', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main TeamRoom component ───────────────────────────────────────────────────
export default function TeamRoom() {
  const [channel, setChannel]     = useState('general');
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [typing, setTyping]       = useState(false);
  const [sending, setSending]     = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Load history + subscribe to Realtime
  useEffect(() => {
    let sub;

    async function load() {
      const { data } = await supabase
        .from('room_messages')
        .select('*')
        .eq('channel', channel)
        .order('created_at', { ascending: true })
        .limit(100);

      // If channel is empty on first load, seed with AI briefing
      if (channel === 'general' && (!data || data.length === 0)) {
        await seedBriefing();
        return; // re-load will happen via subscription
      }

      setMessages(data || []);
    }

    async function seedBriefing() {
      await supabase.from('room_messages').insert({
        channel: 'general',
        sender_name: 'AI Agent',
        sender_init: 'AI',
        sender_color: '#6366F1',
        body: '🌅 Good morning team! Here\'s your pipeline snapshot. 4 meetings scheduled today, 12 enrichments pending, and Vikram\'s deal with Novatek is entering negotiation. Let\'s hit quota this week.',
        msg_type: 'ai_card',
        metadata: {
          stats: [
            { v: '847', l: 'Total Leads' },
            { v: '124', l: 'In Pipeline' },
            { v: '38',  l: 'Tasks Due' },
            { v: '6',   l: 'Closed Won' },
          ],
        },
      });
    }

    load();

    sub = supabase
      .channel(`room:${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `channel=eq.${channel}` }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [channel]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    await supabase.from('room_messages').insert({
      channel,
      sender_name:  ME.name,
      sender_init:  ME.init,
      sender_color: ME.color,
      body:         text,
      msg_type:     'text',
    });
    setSending(false);

    // If message mentions @ai or is a question, simulate AI response
    if (text.toLowerCase().includes('@ai') || text.includes('?')) {
      setTyping(true);
      setTimeout(async () => {
        setTyping(false);
        const aiReply = getAIReply(text);
        await supabase.from('room_messages').insert({
          channel,
          sender_name:  'AI Agent',
          sender_init:  'AI',
          sender_color: '#6366F1',
          body:         aiReply.body,
          msg_type:     aiReply.type,
          metadata:     aiReply.metadata || null,
        });
      }, 2800);
    }

    inputRef.current?.focus();
  }, [input, sending, channel]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const online = DM_REPS.filter(r => r.online);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 52px)', background: '#0F172A', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Left: channels ── */}
      <div style={{ width: 200, borderRight: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 14px 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Channels</div>
        {CHANNELS.map(ch => (
          <button key={ch.id} onClick={() => setChannel(ch.id)} style={{
            textAlign: 'left', background: channel === ch.id ? 'rgba(99,102,241,.2)' : 'transparent',
            border: 'none', borderLeft: `2px solid ${channel === ch.id ? '#818CF8' : 'transparent'}`,
            padding: '7px 14px', cursor: 'pointer', color: channel === ch.id ? '#fff' : 'rgba(255,255,255,.5)',
            fontSize: 12, fontWeight: channel === ch.id ? 600 : 400,
          }}>
            {ch.label}
          </button>
        ))}

        <div style={{ padding: '14px 14px 8px', marginTop: 8, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '1px', borderTop: '1px solid rgba(255,255,255,.06)' }}>Direct</div>
        {DM_REPS.map(r => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', cursor: 'pointer', opacity: r.online ? 1 : 0.45 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{r.init}</div>
              {r.online && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: '#10B981', border: '1.5px solid #0F172A' }} />}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{r.name.split(' ')[0]}</span>
          </div>
        ))}

        {/* Online count */}
        <div style={{ marginTop: 'auto', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 10, color: 'rgba(255,255,255,.3)' }}>
          <span style={{ color: '#10B981', fontWeight: 600 }}>{online.length}</span> online · {DM_REPS.length} total
        </div>
      </div>

      {/* ── Center: messages ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <MisStrip />

        {/* Channel header */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{CHANNELS.find(c => c.id === channel)?.label}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>— {CHANNELS.find(c => c.id === channel)?.desc}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#10B981' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            Realtime
          </div>
        </div>

        {/* Messages scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {messages.map(m => <Bubble key={m.id} msg={m} />)}
          {typing && <TypingDot />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message ${CHANNELS.find(c => c.id === channel)?.label}  ·  @ai for AI help`}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button title="Attach file" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 16, padding: 2 }}>📎</button>
              <button title="Create task" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 16, padding: 2 }}>✓</button>
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
              background: input.trim() ? 'linear-gradient(135deg,#1A56DB,#3B74E8)' : 'rgba(255,255,255,.08)',
              color: input.trim() ? '#fff' : 'rgba(255,255,255,.3)', fontSize: 13, fontWeight: 600, flexShrink: 0,
            }}>
            {sending ? '…' : '↑ Send'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Simple AI reply logic ─────────────────────────────────────────────────────
function getAIReply(text) {
  const t = text.toLowerCase();
  if (t.includes('task') || t.includes('create') || t.includes('assign')) {
    return {
      type: 'task_card',
      body: 'I\'ve created the following tasks based on your request:',
      metadata: {
        tasks: [
          { icon: '📞', label: 'Follow-up call — Novatek',      sub: 'Assigned to Vikram · Due today' },
          { icon: '✉',  label: 'Send proposal — BioSource Ltd', sub: 'Assigned to Priya · Due tomorrow' },
          { icon: '🔍', label: 'Enrich — 12 pending leads',     sub: 'AI enrichment queued · Auto' },
        ],
      },
    };
  }
  if (t.includes('pipeline') || t.includes('how many') || t.includes('lead')) {
    return {
      type: 'text',
      body: 'Pipeline snapshot: 124 active leads across 12 stages. Top stage is email_sent (34 leads). 6 deals in negotiation. Recommend focusing on the 12 leads in the meeting stage — highest conversion probability right now.',
    };
  }
  return {
    type: 'text',
    body: 'Got it! I\'m monitoring the pipeline. If you need me to create tasks, enrich leads, or pull a report — just ask.',
  };
}
