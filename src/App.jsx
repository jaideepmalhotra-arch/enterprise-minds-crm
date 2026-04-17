import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import SalesProvider from './data/SalesContext.jsx';
import SalesSidebar from './components/layout/SalesSidebar.jsx';
import { MOD, PAGE_MOD } from './utils/moduleTheme.js';

import HomePage         from './pages/Home.jsx';
import ContactsPage     from './pages/Contacts.jsx';
import ImportPage       from './pages/Import.jsx';
import AddContactPage   from './pages/AddContact.jsx';
import EnrichmentPage   from './pages/Enrichment.jsx';
import KanbanPage       from './pages/Kanban.jsx';
import AssignmentDesk   from './pages/AssignmentDesk.jsx';
import DedupeReview     from './pages/DedupeReview.jsx';
import SettingsPage     from './pages/Settings.jsx';
import DashboardPage    from './pages/Dashboard.jsx';
import MyTasksPage      from './pages/MyTasks.jsx';
import ActivityFeedPage from './pages/ActivityFeed.jsx';
import ConferencesPage  from './pages/Conferences.jsx';
import AnalyticsPage    from './pages/Analytics.jsx';

import {
  LeadScoringPage, DataExportPage,
  CampaignsPage, EmailSequencesPage, WhatsAppPage,
  TerritoryMapPage, RepDigestPage,
  NotificationsPage, IntegrationsPage,
} from './pages/PlaceholderPages.jsx';

const PAGE_META = {
  '/sales/home':         { title:'Home',               sub:'CRM overview · all modules at a glance' },
  '/sales/import':       { title:'Import',             sub:'Upload Excel or CSV · bulk import contacts' },
  '/sales/add-contact':  { title:'Add Contact',        sub:'Manually add a single lead' },
  '/sales/conferences':  { title:'Conference Library', sub:'Event attendees · review and promote to leads' },
  '/sales/lead-scoring': { title:'Lead Scoring',       sub:'Auto-score leads by role, size and engagement' },
  '/sales/export':       { title:'Data Export',        sub:'Export filtered contacts and pipeline to CSV' },
  '/sales/contacts':     { title:'Contacts',           sub:'Full contact database · search & manage' },
  '/sales':              { title:'Pipeline',           sub:'Kanban · 11 deal stages' },
  '/sales/assign':       { title:'Assign Leads',       sub:'Select leads · push to pipeline' },
  '/sales/tasks':        { title:'My Tasks',           sub:'Open · overdue · snoozed · done' },
  '/sales/enrichment':   { title:'Enrichment',         sub:'Contacts with missing data · fill gaps' },
  '/sales/dedupe':       { title:'Deduplicate',        sub:'Review & remove duplicate contacts' },
  '/sales/campaigns':    { title:'Campaigns',          sub:'Email campaigns to segmented lead lists' },
  '/sales/sequences':    { title:'Email Sequences',    sub:'Automated multi-step follow-up drips' },
  '/sales/whatsapp':     { title:'WhatsApp',           sub:'One-click outreach with auto-logging' },
  '/sales/dashboard':    { title:'Team Dashboard',     sub:'KPIs · quota progress · rep breakdown' },
  '/sales/analytics':    { title:'Analytics',          sub:'Country · source · pipeline · velocity' },
  '/sales/activity':     { title:'Activity Feed',      sub:'All team actions · chronological' },
  '/sales/territory':    { title:'Territory Map',      sub:'Lead density by country · rep territories' },
  '/sales/digest':       { title:'Rep Digest',         sub:'Weekly automated performance email' },
  '/sales/settings':     { title:'Settings & Audit',   sub:'Reps · quotas · audit log · config' },
  '/sales/notifications':{ title:'Notifications',      sub:'Browser push alerts for tasks and campaigns' },
  '/sales/integrations': { title:'Integrations',       sub:'Apollo · JustCall · LinkedIn · Resend' },
};

function Topbar() {
  const { pathname } = useLocation();
  const meta  = PAGE_META[pathname] || { title:'', sub:'' };
  const modId = PAGE_MOD[pathname];
  const m     = modId ? MOD[modId] : null;

  return (
    <div style={{ background:'#fff', borderBottom:`1px solid ${m ? m.border : '#E4E8F0'}`, padding:'0 24px', height:52, display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
        {m && (
          <>
            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:m.badgeBg, color:m.badgeText }}>{m.icon} {m.label}</span>
            <span style={{ color:'#CBD5E1' }}>/</span>
          </>
        )}
        <span style={{ fontSize:13, fontWeight:700, color: m ? m.textDark : '#0F172A' }}>{meta.title}</span>
        {meta.sub && <span style={{ fontSize:11, color:'#94A3B8', marginLeft:4 }}>· {meta.sub}</span>}
      </div>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20, background:'#F0FDF4', border:'1px solid #86EFAC', fontSize:10, fontWeight:600, color:'#065F46' }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10B981' }}/>
        Live · Supabase
      </div>
    </div>
  );
}

function Layout() {
  const { pathname } = useLocation();
  const modId = PAGE_MOD[pathname];
  const pageBg = modId ? MOD[modId].pageBg : '#F0F2F7';

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <SalesSidebar />
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:pageBg, marginLeft:224, transition:'background .3s' }}>
        <Topbar />
        <Routes>
          <Route path="/sales/home"          element={<HomePage />} />
          <Route path="/sales"               element={<KanbanPage />} />
          <Route path="/sales/assign"        element={<AssignmentDesk />} />
          <Route path="/sales/tasks"         element={<MyTasksPage />} />
          <Route path="/sales/activity"      element={<ActivityFeedPage />} />
          <Route path="/sales/dashboard"     element={<DashboardPage />} />
          <Route path="/sales/contacts"      element={<ContactsPage />} />
          <Route path="/sales/import"        element={<ImportPage />} />
          <Route path="/sales/add-contact"   element={<AddContactPage />} />
          <Route path="/sales/enrichment"    element={<EnrichmentPage />} />
          <Route path="/sales/conferences"   element={<ConferencesPage />} />
          <Route path="/sales/analytics"     element={<AnalyticsPage />} />
          <Route path="/sales/dedupe"        element={<DedupeReview />} />
          <Route path="/sales/settings"      element={<SettingsPage />} />
          <Route path="/sales/lead-scoring"  element={<LeadScoringPage />} />
          <Route path="/sales/export"        element={<DataExportPage />} />
          <Route path="/sales/campaigns"     element={<CampaignsPage />} />
          <Route path="/sales/sequences"     element={<EmailSequencesPage />} />
          <Route path="/sales/whatsapp"      element={<WhatsAppPage />} />
          <Route path="/sales/territory"     element={<TerritoryMapPage />} />
          <Route path="/sales/digest"        element={<RepDigestPage />} />
          <Route path="/sales/notifications" element={<NotificationsPage />} />
          <Route path="/sales/integrations"  element={<IntegrationsPage />} />
          <Route path="*"                    element={<HomePage />} />
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
