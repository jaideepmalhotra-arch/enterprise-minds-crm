import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON || 'placeholder'
);

export const PIPELINE_STAGES = [
  { id: 'lead',        label: 'Lead',           color: '#888780', bar: '#D3D1C7' },
  { id: 'enrich',      label: 'Enrich',         color: '#7F77DD', bar: '#AFA9EC' },
  { id: 'discovery',   label: 'Discovery Call', color: '#378ADD', bar: '#85B7EB' },
  { id: 'proposal',    label: 'Proposal Sent',  color: '#F59E0B', bar: '#FCD34D' },
  { id: 'negotiation', label: 'Negotiation',    color: '#E24B4A', bar: '#F09595' },
  { id: 'won',         label: 'Deal Got',       color: '#639922', bar: '#97C459' },
  { id: 'lost',        label: 'Lost',           color: '#475569', bar: '#94A3B8' },
];

export const STAGE_NEXT = {
  lead:        'enrich',
  enrich:      'discovery',
  discovery:   'proposal',
  proposal:    'negotiation',
  negotiation: 'won',
};

export const SERVICES = [
  'AI Strategy & Consulting',
  'AI Implementation',
  'IT Services',
  'Training & Workshops',
  'Fractional AI Officer',
  'Digital Transformation',
  'Other',
];

export const TEAM = [
  { id: 'JM', name: 'Jaideep', initials: 'JM', colorBg: '#E6F1FB', colorText: '#0C447C' },
];

export const ACTIVITY_TYPES = [
  { id: 'call',     label: 'Call',       color: '#E24B4A' },
  { id: 'email',    label: 'Email',      color: '#378ADD' },
  { id: 'meeting',  label: 'Meeting',    color: '#10B981' },
  { id: 'proposal', label: 'Proposal',   color: '#7F77DD' },
  { id: 'whatsapp', label: 'WhatsApp',   color: '#25D366' },
  { id: 'linkedin', label: 'LinkedIn',   color: '#0A66C2' },
  { id: 'note',     label: 'Note',       color: '#888780' },
];
