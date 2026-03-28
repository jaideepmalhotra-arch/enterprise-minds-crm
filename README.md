# Eminds.ai Sales CRM

React + Vite + Supabase CRM for Eminds.ai — IT/AI consulting firm.

## Setup

### 1. Supabase
1. Create a new Supabase project at supabase.com
2. Go to SQL Editor → paste contents of `supabase-schema.sql` → Run
3. Copy your Project URL and anon key

### 2. Environment variables
1. Rename `.env.example` to `.env`
2. Fill in your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. GitHub + Vercel
1. Push all files to your GitHub repo `enterprise-minds-crm`
2. In Vercel → Settings → Environment Variables → add the two vars above
3. Redeploy

## Pages built
- ✅ Contacts — with star quality rating + ContactDrawer
- ✅ Import — Apollo CSV, Excel, conference lists
- ✅ Enrichment — cards open ContactDrawer
- ✅ Pipeline (Kanban) — drag & drop, 8 stages
- ✅ Assign Leads — quota tracking per rep
- ✅ Deduplicate — email + LinkedIn matching
- 🚧 Conference Library — coming next
- 🚧 Analytics — coming next
- 🚧 Tasks, Activity Feed, Dashboard — coming next

## Tech stack
- React 18 + Vite
- Supabase (DB + Auth)
- @hello-pangea/dnd (Kanban drag & drop)
- react-router-dom v6
- Plus Jakarta Sans + DM Mono fonts
