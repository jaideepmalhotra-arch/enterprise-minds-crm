import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Reps (loaded dynamically from DB — see SalesContext) ────────────────────
export const REPS = []; // kept for legacy imports, actual data comes from Supabase

// ─── Pipeline stages ──────────────────────────────────────────────────────────
export const STAGES = [
  { id: 'assigned',    label: 'Assigned',              color: '#3B82F6', bar: '#BFDBFE' },
  { id: 'enriched',    label: 'Enriched',              color: '#8B5CF6', bar: '#DDD6FE' },
  { id: 'research',    label: 'Research',              color: '#6366F1', bar: '#C7D2FE' },
  { id: 'email_sent',  label: 'Email Sent',            color: '#F59E0B', bar: '#FDE68A' },
  { id: 'li_request',  label: 'LinkedIn Request',      color: '#0A66C2', bar: '#BFDBFE' },
  { id: 'li_message',  label: 'LinkedIn Message',      color: '#0A66C2', bar: '#93C5FD' },
  { id: 'call',        label: 'Call',                  color: '#10B981', bar: '#A7F3D0' },
  { id: 'meeting',     label: 'Online Meeting',        color: '#EC4899', bar: '#FBCFE8' },
  { id: 'proposal',    label: 'Proposal',              color: '#06B6D4', bar: '#A5F3FC' },
  { id: 'negotiation', label: 'Negotiation',           color: '#F97316', bar: '#FED7AA' },
  { id: 'closed_won',  label: 'Closed Won',            color: '#10B981', bar: '#A7F3D0' },
  { id: 'lost',        label: 'Lost',                  color: '#94A3B8', bar: '#E2E8F0' },
];

export const STAGE_NEXT = {
  assigned:    'enriched',
  enriched:    'research',
  research:    'email_sent',
  email_sent:  'li_request',
  li_request:  'li_message',
  li_message:  'call',
  call:        'meeting',
  meeting:     'proposal',
  proposal:    'negotiation',
  negotiation: 'closed_won',
};

// ─── Services ─────────────────────────────────────────────────────────────────
export const SERVICES = [
  'Digital Transformation','Cloud Solutions','AI / ML Implementation',
  'ERP Implementation','Cybersecurity','Data Analytics','Staff Augmentation',
];

// ─── Activity types ───────────────────────────────────────────────────────────
export const ACTIVITY_TYPES = [
  { id: 'email',     label: 'Email',            color: '#3B82F6' },
  { id: 'call',      label: 'Call',             color: '#10B981' },
  { id: 'li_conn',   label: 'LI Connect',       color: '#0A66C2' },
  { id: 'li_msg',    label: 'LI Message',       color: '#0A66C2' },
  { id: 'whatsapp',  label: 'WhatsApp',         color: '#25D366' },
  { id: 'meeting',   label: 'Meeting',          color: '#8B5CF6' },
  { id: 'note',      label: 'Note',             color: '#64748B' },
  { id: 'enriched',  label: 'Enriched',         color: '#F59E0B' },
  { id: 'follow_up', label: 'Follow-up',        color: '#EC4899' },
];

// ─── Country → language map for email drafts ──────────────────────────────────
export const COUNTRY_LANG = {
  France: 'fr', Belgium: 'fr', Switzerland: 'fr',
  Germany: 'de', Austria: 'de',
  Spain: 'es', Mexico: 'es',
  Italy: 'it',
  Netherlands: 'nl',
  Portugal: 'pt', Brazil: 'pt',
  Poland: 'pl',
  Sweden: 'sv', Denmark: 'sv', Norway: 'sv',
};

// ─── Email templates by language ─────────────────────────────────────────────
export function getEmailDraft(contact, lang = 'en') {
  const name = contact.contact ? contact.contact.split(' ')[0] : '';
  const company = contact.company || '';
  const templates = {
    en: {
      subject: `Enterprise Minds — AI & Digital Transformation for ${company}`,
      body: `Hi ${name},\n\nI hope this message finds you well.\n\nI'm reaching out from Enterprise Minds — we help organisations like ${company} accelerate their AI and digital transformation journey.\n\nWould you be open to a brief 20-minute call to explore if there's a fit?\n\nLooking forward to connecting.\n\nBest regards,\n[Your Name]\nEnterprise Minds`,
    },
    fr: {
      subject: `Enterprise Minds — IA & Transformation Digitale pour ${company}`,
      body: `Bonjour ${name},\n\nJ'espère que vous allez bien.\n\nJe vous contacte au nom d'Enterprise Minds — nous aidons des organisations comme ${company} à accélérer leur transformation digitale et IA.\n\nSeriez-vous disponible pour un bref appel de 20 minutes ?\n\nCordialement,\n[Votre Nom]\nEnterprise Minds`,
    },
    de: {
      subject: `Enterprise Minds — KI & Digitale Transformation für ${company}`,
      body: `Sehr geehrte/r ${name},\n\nIch hoffe, diese Nachricht erreicht Sie wohlauf.\n\nIch melde mich von Enterprise Minds — wir unterstützen Unternehmen wie ${company} bei ihrer KI- und Digitalen Transformation.\n\nWären Sie für ein kurzes 20-minütiges Gespräch offen?\n\nMit freundlichen Grüßen,\n[Ihr Name]\nEnterprise Minds`,
    },
    es: {
      subject: `Enterprise Minds — IA & Transformación Digital para ${company}`,
      body: `Hola ${name},\n\nEspero que estés bien.\n\nMe pongo en contacto desde Enterprise Minds — ayudamos a organizaciones como ${company} a acelerar su transformación digital e IA.\n\n¿Estarías disponible para una breve llamada de 20 minutos?\n\nUn cordial saludo,\n[Tu Nombre]\nEnterprise Minds`,
    },
    it: {
      subject: `Enterprise Minds — AI & Trasformazione Digitale per ${company}`,
      body: `Gentile ${name},\n\nSpero che stia bene.\n\nLa contatto da Enterprise Minds — supportiamo organizzazioni come ${company} nel percorso di trasformazione digitale e AI.\n\nSarebbe disponibile per una breve chiamata di 20 minuti?\n\nCordiali saluti,\n[Il Suo Nome]\nEnterprise Minds`,
    },
    nl: {
      subject: `Enterprise Minds — AI & Digitale Transformatie voor ${company}`,
      body: `Beste ${name},\n\nIk hoop dat het goed met u gaat.\n\nIk neem contact op namens Enterprise Minds — wij helpen organisaties zoals ${company} bij hun digitale en AI-transformatie.\n\nZou u open staan voor een kort gesprek van 20 minuten?\n\nMet vriendelijke groet,\n[Uw Naam]\nEnterprise Minds`,
    },
  };
  return templates[lang] || templates.en;
}
