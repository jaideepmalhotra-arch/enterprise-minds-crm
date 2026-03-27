import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import EMProvider from './data/EMContext.jsx';
import EMSidebar from './components/layout/EMSidebar.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import PipelinePage  from './pages/Pipeline.jsx';
import ClientsPage   from './pages/Clients.jsx';
import TasksPage     from './pages/Tasks.jsx';
import ActivityPage  from './pages/Activity.jsx';

const META = {
  '/em':           { title: 'Dashboard',     sub: 'Pipeline overview · tasks · recent activity' },
  '/em/pipeline':  { title: 'Pipeline',      sub: 'Kanban & list view · Lead to Deal Got' },
  '/em/clients':   { title: 'Clients',       sub: 'Client database · contacts · history' },
  '/em/tasks':     { title: 'Tasks',         sub: 'Due today, overdue and upcoming' },
  '/em/activity':  { title: 'Activity feed', sub: 'All logged activities · last 30 days' },
};

function Topbar() {
  const { pathname } = useLocation();
  const meta = META[pathname] || { title: '', sub: '' };
  return (
    <div style={{ background: '#0D1F3C', borderBottom: '1px solid rgba(201,168,76,.2)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      <div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 500, color: '#C9A84C', letterSpacing: '.3px' }}>{meta.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(201,168,76,.5)', marginTop: 1, fontFamily: "'Raleway',sans-serif", letterSpacing: '.5px' }}>{meta.sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.3)', fontSize: 11, fontWeight: 600, color: '#C9A84C', fontFamily: "'Raleway',sans-serif" }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A84C' }} />
        Live · Supabase
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <EMSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FAF6EE', marginLeft: 210 }}>
        <Topbar />
        <Routes>
          <Route path="/em"          element={<DashboardPage />} />
          <Route path="/em/pipeline" element={<PipelinePage />} />
          <Route path="/em/clients"  element={<ClientsPage />} />
          <Route path="/em/tasks"    element={<TasksPage />} />
          <Route path="/em/activity" element={<ActivityPage />} />
          <Route path="*"            element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <EMProvider>
        <Layout />
      </EMProvider>
    </BrowserRouter>
  );
}
