import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, REPS, STAGES } from './supabase.js';

const SalesContext = createContext(null);
export const useSales = () => useContext(SalesContext);

export default function SalesProvider({ children }) {
  const [cards,          setCards]          = useState([]);
  const [cardsByStage,   setCardsByStage]   = useState({});
  const [quotas,         setQuotas]         = useState({});
  const [assignedCounts, setAssignedCounts] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [activeRep,      setActiveRep]      = useState('all');
  const [toast,          setToast]          = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('kanban_view').select('*');
      const all = data || [];
      setCards(all);
      const byStage = {};
      STAGES.forEach(s => { byStage[s.id] = []; });
      all.forEach(c => {
        if (!byStage[c.stage]) byStage[c.stage] = [];
        byStage[c.stage].push(c);
      });
      setCardsByStage(byStage);

      // Assigned counts
      const counts = {};
      REPS.forEach(r => { counts[r.id] = 0; });
      all.forEach(c => { if (c.rep_id) counts[c.rep_id] = (counts[c.rep_id] || 0) + 1; });
      setAssignedCounts(counts);

      // Quotas
      const week = new Date();
      week.setDate(week.getDate() - week.getDay() + 1);
      const weekStr = week.toISOString().slice(0, 10);
      const { data: qData } = await supabase.from('weekly_quotas').select('*').eq('week_start', weekStr);
      const q = {};
      REPS.forEach(r => { q[r.id] = r.quota; });
      (qData || []).forEach(row => { q[row.rep_id] = row.quota; });
      setQuotas(q);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SalesContext.Provider value={{ cards, cardsByStage, quotas, assignedCounts, loading, activeRep, setActiveRep, toast, showToast, refresh }}>
      {children}
    </SalesContext.Provider>
  );
}
