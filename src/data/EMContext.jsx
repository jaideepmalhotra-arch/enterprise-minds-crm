import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, PIPELINE_STAGES } from './supabase.js';
import { fetchDeals, fetchTasks, subscribeToDeals } from './api.js';

const EMContext = createContext(null);
export const useEM = () => useContext(EMContext);

export default function EMProvider({ children }) {
  const [deals,   setDeals]   = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadDeals = useCallback(async () => {
    try {
      const data = await fetchDeals();
      setDeals(data);
    } catch (e) { console.error(e); }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    Promise.all([loadDeals(), loadTasks()]).finally(() => setLoading(false));
  }, [loadDeals, loadTasks]);

  useEffect(() => {
    const sub = subscribeToDeals(() => loadDeals());
    return () => supabase.removeChannel(sub);
  }, [loadDeals]);

  const dealsByStage = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.id] = deals.filter(d => d.stage === s.id).sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  const today = new Date().toISOString().slice(0, 10);
  const overdueTasks  = tasks.filter(t => t.due_date && t.due_date < today);
  const todayTasks    = tasks.filter(t => t.due_date === today);
  const upcomingTasks = tasks.filter(t => !t.due_date || t.due_date > today);

  // Pipeline value
  const pipelineValue = deals
    .filter(d => !['won','lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const wonValue = deals
    .filter(d => d.stage === 'won')
    .reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <EMContext.Provider value={{
      deals, dealsByStage, tasks, overdueTasks, todayTasks, upcomingTasks,
      loading, toast, showToast, pipelineValue, wonValue,
      refresh: () => Promise.all([loadDeals(), loadTasks()]),
    }}>
      {children}
    </EMContext.Provider>
  );
}
