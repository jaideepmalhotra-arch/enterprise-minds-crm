import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import SalesProvider from './data/SalesContext.jsx';
import SalesSidebar from './components/layout/SalesSidebar.jsx';

import ContactsPage    from './pages/Contacts.jsx';
import ImportPage      from './pages/Import.jsx';
import EnrichmentPage  from './pages/Enrichment.jsx';
import KanbanPage      from './pages/Kanban.jsx';
import AssignmentDesk  from './pages/AssignmentDesk.jsx';
import DedupeReview    from './pages/DedupeReview.jsx';
import SettingsPage    from './pages/Settings.jsx';
import DashboardPage   from './pages/Dashboard.jsx';
import MyTasksPage     from './pages/MyTasks.jsx';
import ActivityFeedPage from './pages/ActivityFeed.jsx';
import ConferencesPage  from './pages/Conferences.jsx';

function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: '#64748B' }}>
      <div style={{ fontSize: 32 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{title}</div>
      <div style={{ fontSize: 13 }}>Coming soon</div>
    </div>
  );
}

const PAGE_META = {
  '/sales':              { title: 'Pipeline',           sub: 'Kanban · deal stages' },
  '/sales/assign':       { title: 'Assign Leads',       sub: 'Select leads · push to pipeline' },
  '/sales/tasks':        { title: 'My Tasks',           sub: 'Open · overdue · snoozed · done' },
  '/sales/activity':     { title: 'Activity Feed',      sub: 'All team actions · chronological' },
  '/sales/dashboard':    { title: 'Team Dashboard',     sub: 'KPIs · quota progress · rep breakdown' },
  '/sales/contacts':     { title: 'Contacts',           sub: 'Full contact database · search, edit, manage' },
  '/sales/import':       { title: 'Import',             sub: 'Upload Excel or CSV · bulk import contacts' },
  '/sales/enrichment':   { title: 'Enrichment',         sub: 'Contacts with missing data · fill gaps' },
  '/sales/conferences':  { title: 'Conference Library', sub: 'Event attendees · review and promote to leads' },
  '/sales/analytics':    { title: 'Analytics',          sub: 'Country breakdown · source analysis · trends' },
  '/sales/dedupe':       { title: 'Deduplicate',        sub: 'Review & remove duplicate contacts' },
  '/sales/settings':     { title: 'Settings',           sub: 'Manage reps, quotas and CRM configuration' },
};

function Topbar() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || { title: '', sub: '' };
  return (
    <div style={{ background: '#0F172A', borderBottom: '1px solid rgba(26,86,219,.2)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      <div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '.3px' }}>{meta.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, letterSpacing: '.5px' }}>{meta.sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(26,86,219,.2)', border: '1px solid rgba(26,86,219,.4)', fontSize: 11, fontWeight: 600, color: '#93C5FD' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6' }} />
        Live · Supabase
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SalesSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#F5F7FA', marginLeft: 210 }}>
        <Topbar />
        <Routes>
          <Route path="/sales"               element={<KanbanPage />} />
          <Route path="/sales/assign"        element={<AssignmentDesk />} />
          <Route path="/sales/tasks"         element={<MyTasksPage />} />
          <Route path="/sales/activity"      element={<ActivityFeedPage />} />
          <Route path="/sales/dashboard"     element={<DashboardPage />} />
          <Route path="/sales/contacts"      element={<ContactsPage />} />
          <Route path="/sales/import"        element={<ImportPage />} />
          <Route path="/sales/enrichment"    element={<EnrichmentPage />} />
          <Route path="/sales/conferences"   element={<ConferencesPage />} />
          <Route path="/sales/analytics"     element={<ComingSoon title="Analytics" />} />
          <Route path="/sales/dedupe"        element={<DedupeReview />} />
          <Route path="/sales/settings"      element={<SettingsPage />} />
          <Route path="*"                    element={<KanbanPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SalesProvider>
        <Layout />
      </SalesProvider>
    </BrowserRouter>
  );
}
