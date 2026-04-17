import React from 'react';
import { ComingSoonPage } from '../utils/moduleTheme.jsx';

export function LeadScoringPage() {
  return <ComingSoonPage mod="input" title="Lead Scoring"
    desc="Automatically score and rank leads based on role, company size, data completeness and engagement."
    features={['Role-based scoring rules (CXO/VP/Director = high)', 'Company size signals', 'Data completeness score', 'Auto-set relevancy (High/Medium/Low)', 'Bulk recalculate button', 'Score history timeline']} />;
}

export function DataExportPage() {
  return <ComingSoonPage mod="input" title="Data Export"
    desc="Export any filtered view of contacts, pipeline, or activities to CSV or Excel for offline use."
    features={['Export filtered Contacts view', 'Export Pipeline cards', 'Export Activity Feed', 'Custom column selection', 'Schedule recurring exports', 'Excel + CSV format support']} />;
}

export function CampaignsPage() {
  return <ComingSoonPage mod="process" title="Campaigns"
    desc="Run multi-step email campaigns to segmented lead lists with tracking and analytics."
    features={['Create campaigns from filtered contact lists', 'Multi-language templates (EN/FR/DE/ES/IT/NL)', 'Schedule sends — 1 email every 3 minutes', 'Campaign status tracking (Draft/Sending/Sent)', 'Open and bounce tracking', 'Rep attribution per campaign']} />;
}

export function EmailSequencesPage() {
  return <ComingSoonPage mod="process" title="Email Sequences"
    desc="Automate multi-step follow-up sequences per lead — enroll, track, pause or cancel anytime."
    features={['Day 0/3/7/14 drip sequence', 'Enroll leads from ContactDrawer', 'pg_cron automation via Supabase', 'Resend API for delivery', 'Pause / cancel per lead', 'Sequence status in activity timeline']} />;
}

export function WhatsAppPage() {
  return <ComingSoonPage mod="process" title="WhatsApp"
    desc="One-click WhatsApp outreach with auto-logging — open wa.me and log the contact as an activity instantly."
    features={['Quick-log button in ContactDrawer', 'Opens wa.me/{phone} in new tab', 'Auto-logs whatsapp activity', 'WhatsApp shown in activity feed', 'Bulk WhatsApp message builder', 'Template message library']} />;
}

export function TerritoryMapPage() {
  return <ComingSoonPage mod="output" title="Territory Map"
    desc="World map showing lead density and pipeline activity by country, coloured by rep territory."
    features={['Choropleth map via react-simple-maps', 'Lead count per country', 'Rep territory colour coding', 'Hover tooltip: country, leads, rep', 'Filter by rep or stage', 'Export map as image']} />;
}

export function RepDigestPage() {
  return <ComingSoonPage mod="output" title="Rep Performance Digest"
    desc="Weekly automated email to each rep summarising their KPIs — tasks done, emails sent, leads moved."
    features={['Monday 8am automated delivery', 'Per-rep KPI summary', 'Activities logged this week', 'Tasks completed vs overdue', 'Pipeline stage movements', 'Sent via Resend API']} />;
}

export function NotificationsPage() {
  return <ComingSoonPage mod="feedback" title="Notifications"
    desc="Browser push notifications for overdue tasks, campaign completions, and system alerts."
    features={['Browser push when task is overdue', 'Daily digest notification', 'Campaign send completion alert', 'Mention / tag notifications', 'Notification preference settings', 'Quiet hours configuration']} />;
}

export function IntegrationsPage() {
  return <ComingSoonPage mod="feedback" title="Integrations"
    desc="Connect Eminds CRM to external tools — Apollo, JustCall, LinkedIn, Resend and more."
    features={['Apollo.io contact sync', 'JustCall call logging', 'LinkedIn data enrichment', 'Resend email delivery', 'Google Calendar sync', 'Zapier / Make webhook support']} />;
}
