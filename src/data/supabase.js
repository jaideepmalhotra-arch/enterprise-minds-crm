import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Eminds Reps ─────────────────────────────────────────────────────────────
export const REPS = [
  { id: 'R1', name: 'Rep 1',  initials: 'R1', colorBg: '#E6F1FB', colorText: '#0C447C', focus: 'India · BFSI',         quota: 50 },
  { id: 'R2', name: 'Rep 2',  initials: 'R2', colorBg: '#E1F5EE', colorText: '#085041', focus: 'Middle East · Govt',   quota: 50 },
  { id: 'R3', name: 'Rep 3',  initials: 'R3', colorBg: '#EEEDFE', colorText: '#3C3489', focus: 'USA · UK',             quota: 50 },
  { id: 'R4', name: 'Rep 4',  initials: 'R4', colorBg: '#FBEAF0', colorText: '#72243E', focus: 'SEA · E-commerce',     quota: 50 },
];

// ─── Pipeline stages ──────────────────────────────────────────────────────────
export const STAGES = [
  { id: 'unassigned', label: 'Unassigned',     color: '#94A3B8', bar: '#E2E8F0' },
  { id: 'assigned',   label: 'Assigned',       color: '#3B82F6', bar: '#BFDBFE' },
  { id: 'research',   label: 'Research',       color: '#8B5CF6', bar: '#DDD6FE' },
  { id: 'outreach',   label: 'Outreach',       color: '#F59E0B', bar: '#FDE68A' },
  { id: 'discovery',  label: 'Discovery Call', color: '#EC4899', bar: '#FBCFE8' },
  { id: 'proposal',   label: 'Proposal',       color: '#06B6D4', bar: '#A5F3FC' },
  { id: 'negotiation',label: 'Negotiation',    color: '#F97316', bar: '#FED7AA' },
  { id: 'closed_won', label: 'Closed Won',     color: '#10B981', bar: '#A7F3D0' },
];

export const STAGE_NEXT = {
  unassigned: 'assigned',
  assigned:   'research',
  research:   'outreach',
  outreach:   'discovery',
  discovery:  'proposal',
  proposal:   'negotiation',
  negotiation:'closed_won',
  closed_won:  null,
};

// ─── Services (replaces Products) ────────────────────────────────────────────
export const SERVICES = [
  'Digital Transformation',
  'Cloud Solutions',
  'AI / ML Implementation',
  'ERP Implementation',
  'Cybersecurity',
  'Data Analytics',
  'Staff Augmentation',
];

// ─── Activity types ───────────────────────────────────────────────────────────
export const ACTIVITY_TYPES = [
  { id: 'email',    label: 'Email',    color: '#3B82F6' },
  { id: 'call',     label: 'Call',     color: '#10B981' },
  { id: 'li_conn',  label: 'LI Connect', color: '#0A66C2' },
  { id: 'li_msg',   label: 'LI Message', color: '#0A66C2' },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { id: 'meeting',  label: 'Meeting',  color: '#8B5CF6' },
  { id: 'note',     label: 'Note',     color: '#64748B' },
  { id: 'enriched', label: 'Enriched', color: '#F59E0B' },
];
