import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSales } from '../data/SalesContext.jsx';
import { moveCard, selfAssign } from '../data/api.js';
import { STAGES, STAGE_NEXT, REPS, SERVICES } from '../data/supabase.js';
import { RepAvatar, TierBadge, TaskRow, KpiCard, QuotaBar, Toast } from '../components/UI.jsx';
import { StarRating } from '../components/ContactDrawer.jsx';
import ContactDrawer from '../components/ContactDrawer.jsx';
import { fmtRelative, weekLabel } from '../utils/dates.js';

function LeadCard({ card, index, activeRep, onOpenDrawer }) {
  const { showToast, refresh } = useSales();
  const nextId = STAGE_NEXT[card.stage];
  const next   = STAGES.find(s => s.id === nextId);

  async function advance(e) {
    e.stopPropagation();
    if (!nextId) return;
    await moveCard({ cardId: card.card_id, stage: nextId });
    showToast(`${card.company} → ${next.label}`);
    refresh();
  }

  async function handleSelfAssign(e) {
    e.stopPropagation();
    await selfAssign({ cardId: card.card_id, repId: activeRep });
    showToast('Assigned to you'); refresh();
  }

  const contactObj = { email: card.email, contact: card.contact, phone: card.phone, linkedin: card.linkedin, role: card.role, company: card.company, country: card.country };

  return (
    <Draggable draggableId={card.card_id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          onClick={() => onOpenDrawer(card.lead_id)}
          style={{ background: '#fff', border: card.stage === 'closed_won' ? '1.5px solid #10B981' : '1px solid #E4E8F0', borderRadius: 8, padding: 10, marginBottom: 7, opacity: snapshot.isDragging ? .85 : 1, boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,.12)' : 'none', cursor: 'pointer', ...provided.draggableProps.style }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 1 }}>{card.company}</div>
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.contact || '—'}{card.role ? ` · ${card.role}` : ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 4 }}>
            <StarRating contact={contactObj} size={11} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {card.rep_id ? <RepAvatar repId={card.rep_id} size={20} /> : (
                card.stage === 'unassigned' && activeRep !== 'all'
                  ? <button onClick={handleSelfAssign} style={{ fontSize: 9, padding: '2px 7px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>Claim</button>
                  : <span style={{ fontSize: 10, color: '#94A3B8' }}>Unassigned</span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 5 }}>{card.country}{card.service_focus ? ` · ${card.service_focus}` : ''}</div>
          {card.next_task && <TaskRow task={{ title: card.next_task, due_date: card.next_task_due }} />}
          {card.last_activity_at && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Last: {card.last_activity_type} {fmtRelative(card.last_activity_at)}</div>}
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }} onClick={e => e.stopPropagation()}>
            {next && <button onClick={advance} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: '#1A56DB', color: '#fff', border: 'none', cursor: 'pointer' }}>{next.label} →</button>}
            <button onClick={e => { e.stopPropagation(); onOpenDrawer(card.lead_id); }} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 9, border: '1px solid #E4E8F0', background: '#F8FAFC', color: '#475569', cursor: 'pointer' }}>Enrich</button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function KanbanColumn({ stage, cards, activeRep, onOpenDrawer }) {
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #E4E8F0', borderBottom: 'none', borderRadius: '9px 9px 0 0', padding: '9px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color }} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{stage.label}</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748B', background: '#F1F5F9', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>{cards.length}</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: stage.bar }} />
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            style={{ background: snapshot.isDraggingOver ? '#EFF6FF' : '#F1F5F9', border: '1px solid #E4E8F0', borderTop: 'none', borderRadius: '0 0 9px 9px', padding: 7, minHeight: 500, transition: 'background .15s' }}>
            {cards.map((card, index) => <LeadCard key={card.card_id} card={card} index={index} activeRep={activeRep} onOpenDrawer={onOpenDrawer} />)}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function KanbanPage() {
  const { cardsByStage, cards, quotas, assignedCounts, loading, activeRep, setActiveRep, toast, showToast, refresh } = useSales();
  const [repFilter, setRepFilter] = useState('all');
  const [drawerContact, setDrawerContact] = useState(null);

  const filteredByStage = STAGES.reduce((acc, s) => {
    acc[s.id] = repFilter === 'all' ? cardsByStage[s.id] || [] : (cardsByStage[s.id] || []).filter(c => c.rep_id === repFilter);
    return acc;
  }, {});

  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    const card = cards.find(c => c.card_id === draggableId);
    if (!card) return;
    await moveCard({ cardId: draggableId, stage: destination.droppableId });
    showToast(`${card.company} → ${STAGES.find(s => s.id === destination.droppableId)?.label}`);
    refresh();
  }

  const total = cards.length;
  const unassigned = (cardsByStage['unassigned'] || []).length;
  const closedWon  = (cardsByStage['closed_won'] || []).length;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #E4E8F0', padding: '11px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Sales pipeline</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>Eminds.ai · {weekLabel()}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <select value={repFilter} onChange={e => { setRepFilter(e.target.value); setActiveRep(e.target.value); }} style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
            <option value="all">All reps</option>
            {REPS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select style={{ border: '1px solid #D0D7E5', borderRadius: 7, padding: '5px 9px', fontSize: 11, background: '#fff' }}>
            <option>All services</option>
            {SERVICES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #E4E8F0', padding: '10px 20px', display: 'flex', gap: 14, overflowX: 'auto', alignItems: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#64748B', minWidth: 80, flexShrink: 0 }}>Weekly quota</div>
        {REPS.map(r => <QuotaBar key={r.id} repId={r.id} assigned={assignedCounts[r.id] || 0} quota={quotas[r.id] || r.quota} />)}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0', flexWrap: 'wrap' }}>
        <KpiCard label="Active in pipeline" value={total} />
        <KpiCard label="Unassigned" value={unassigned} color={unassigned > 0 ? '#F59E0B' : '#0F172A'} />
        <KpiCard label="Closed Won" value={closedWon} color="#10B981" />
        <KpiCard label="This week" value={weekLabel()} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#94A3B8', fontSize: 13 }}>Loading pipeline...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 10, padding: '14px 20px', overflowX: 'auto', alignItems: 'flex-start' }}>
            {STAGES.map(stage => <KanbanColumn key={stage.id} stage={stage} cards={filteredByStage[stage.id] || []} activeRep={activeRep} onOpenDrawer={setDrawerContact} />)}
          </div>
        </DragDropContext>
      )}

      {drawerContact && <ContactDrawer leadId={drawerContact} onClose={() => setDrawerContact(null)} onSaved={() => refresh()} />}
      <Toast toast={toast} />
    </div>
  );
}
