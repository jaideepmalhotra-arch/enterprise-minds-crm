import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, STAGES } from './supabase.js';

const SalesContext = createContext(null);
export const useSales = () => useContext(SalesContext);

export default function SalesProvider({ children }) {
  const [cards,          setCards]          = useState([]);
  const [cardsByStage,   setCardsByStage]   = useState({});
  const [reps,           setReps]           = useState([]);
  const [quotas,         setQuotas]         = useState({});
  const [assignedCounts, setAssignedCounts] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [activeRep,      setActiveRep]      = useState('all');
  const [toast,          setToast]          = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadReps = useCallback(async () => {
    const { data } = await supabase.from('reps').select('*').eq('active', true).order('id');
    return data || [];
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, liveReps] = await Promise.all([
        supabase.from('kanban_view').select('*'),
        loadReps(),
      ]);
      const all = data || [];
      setCards(all);
      setReps(liveReps);

      const byStage = {};
      STAGES.forEach(s => { byStage[s.id] = []; });
      all.forEach(c => {
        if (!byStage[c.stage]) byStage[c.stage] = [];
        byStage[c.stage].push(c);
      });
      setCardsByStage(byStage);

      // Assigned counts from live reps
      const counts = {};
      liveReps.forEach(r => { counts[r.id] = 0; });
      all.forEach(c => { if (c.rep_id) counts[c.rep_id] = (counts[c.rep_id] || 0) + 1; });
      setAssignedCounts(counts);

      // Quotas
      const week = new Date();
      week.setDate(week.getDate() - week.getDay() + 1);
      const weekStr = week.toISOString().slice(0, 10);
      const { data: qData } = await supabase.from('weekly_quotas').select('*').eq('week_start', weekStr);
      const q = {};
      liveReps.forEach(r => { q[r.id] = r.quota || 50; });
      (qData || []).forEach(row => { q[row.rep_id] = row.quota; });
      setQuotas(q);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [loadReps]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SalesContext.Provider value={{ cards, cardsByStage, reps, quotas, assignedCounts, loading, activeRep, setActiveRep, toast, showToast, refresh }}>
      {children}
    </SalesContext.Provider>
  );
}
