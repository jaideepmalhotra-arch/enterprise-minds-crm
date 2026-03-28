-- ─────────────────────────────────────────────
-- Eminds.ai Sales CRM · Supabase Schema
-- Run this once in Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. REPS
create table if not exists reps (
  id          text primary key,
  name        text not null,
  initials    text not null,
  color_bg    text not null,
  color_text  text not null,
  focus       text,
  active      boolean default true,
  created_at  timestamptz default now()
);

insert into reps (id, name, initials, color_bg, color_text, focus) values
  ('R1', 'Rep 1', 'R1', '#E6F1FB', '#0C447C', 'India · BFSI'),
  ('R2', 'Rep 2', 'R2', '#E1F5EE', '#085041', 'Middle East · Govt'),
  ('R3', 'Rep 3', 'R3', '#EEEDFE', '#3C3489', 'USA · UK'),
  ('R4', 'Rep 4', 'R4', '#FBEAF0', '#72243E', 'SEA · E-commerce')
on conflict (id) do nothing;

-- 2. WEEKLY QUOTAS
create table if not exists weekly_quotas (
  id          uuid primary key default gen_random_uuid(),
  rep_id      text references reps(id) on delete cascade,
  week_start  date not null,
  quota       int not null default 50,
  created_at  timestamptz default now(),
  unique (rep_id, week_start)
);

-- 3. LEADS
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  company       text not null,
  contact       text,
  role          text,
  email         text,
  phone         text,
  country       text,
  city          text,
  linkedin      text,
  website       text,
  industry      text,
  company_size  text,
  services      text[],
  source        text,
  tier          text check (tier in ('complete','partial','minimal','empty')),
  notes         text,
  date_added    date,
  imported_at   timestamptz default now(),
  last_synced   timestamptz default now()
);

create index if not exists leads_country_idx on leads(country);
create index if not exists leads_tier_idx    on leads(tier);

-- 4. PIPELINE CARDS
create table if not exists pipeline_cards (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete cascade unique,
  rep_id        text references reps(id) on delete set null,
  stage         text not null default 'unassigned'
                check (stage in (
                  'unassigned','assigned','research',
                  'outreach','discovery','proposal','negotiation','closed_won'
                )),
  stage_status  text,
  position      int default 0,
  service_focus text,
  priority      text default 'normal' check (priority in ('high','normal','low')),
  assigned_at   timestamptz,
  assigned_by   text,
  moved_at      timestamptz default now(),
  created_at    timestamptz default now()
);

create index if not exists cards_stage_idx on pipeline_cards(stage);
create index if not exists cards_rep_idx   on pipeline_cards(rep_id);
create index if not exists cards_lead_idx  on pipeline_cards(lead_id);

-- 5. ACTIVITIES
create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads(id) on delete cascade,
  rep_id      text references reps(id) on delete set null,
  type        text not null check (type in (
                'email','call','li_conn','li_msg',
                'whatsapp','meeting','note','enriched'
              )),
  note        text,
  outcome     text,
  logged_at   timestamptz default now()
);

create index if not exists activities_lead_idx on activities(lead_id);
create index if not exists activities_time_idx on activities(logged_at desc);

-- 6. TASKS
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references leads(id) on delete cascade,
  rep_id       text references reps(id) on delete set null,
  title        text not null,
  type         text check (type in ('call','email','li_conn','li_msg','meeting','whatsapp','other')),
  due_date     date,
  priority     text default 'medium' check (priority in ('high','medium','low')),
  status       text default 'open' check (status in ('open','done','snoozed')),
  created_by   text,
  created_at   timestamptz default now(),
  completed_at timestamptz
);

-- 7. EXHIBITORS (conferences)
create table if not exists exhibitors (
  id           uuid primary key default gen_random_uuid(),
  exhibition   text not null,
  company      text not null,
  category     text,
  booth        text,
  country      text,
  website      text,
  contact      text,
  email        text,
  notes        text,
  status       text default 'new' check (status in ('new','reviewed','promoted','not_relevant')),
  imported_at  timestamptz default now()
);

-- 8. LEADS DELETED (recycle bin)
create table if not exists leads_deleted (
  id          uuid primary key default gen_random_uuid(),
  original_id uuid,
  company     text, contact text, role text, email text, phone text,
  country     text, city text, linkedin text, website text,
  industry    text, source text, tier text, notes text,
  services    text[], products text[],
  deleted_at  timestamptz default now(),
  expires_at  timestamptz default (now() + interval '7 days')
);

-- 9. AUDIT LOG
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,
  summary      text not null,
  detail       jsonb,
  performed_by text,
  created_at   timestamptz default now()
);

-- 10. RPC for accurate exhibition counts
create or replace function get_exhibition_counts()
returns table(exhibition text, count bigint)
language sql as $$
  select exhibition, count(*) as count
  from exhibitors
  where exhibition is not null
  group by exhibition
  order by exhibition;
$$;

-- 11. REALTIME
alter publication supabase_realtime add table pipeline_cards;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table tasks;

-- 12. KANBAN VIEW
create or replace view kanban_view as
select
  pc.id           as card_id,
  pc.stage, pc.stage_status, pc.position,
  pc.priority     as card_priority,
  pc.service_focus,
  pc.assigned_at, pc.moved_at,
  r.id            as rep_id,
  r.name          as rep_name,
  r.initials      as rep_initials,
  r.color_bg      as rep_color_bg,
  r.color_text    as rep_color_text,
  l.id            as lead_id,
  l.company, l.contact, l.role, l.email, l.phone,
  l.country, l.services, l.tier, l.source, l.linkedin,
  (select t.title from tasks t where t.lead_id = l.id and t.status = 'open' order by t.due_date asc nulls last limit 1) as next_task,
  (select t.due_date from tasks t where t.lead_id = l.id and t.status = 'open' order by t.due_date asc nulls last limit 1) as next_task_due,
  (select t.type from tasks t where t.lead_id = l.id and t.status = 'open' order by t.due_date asc nulls last limit 1) as next_task_type,
  (select a.type from activities a where a.lead_id = l.id order by a.logged_at desc limit 1) as last_activity_type,
  (select a.logged_at from activities a where a.lead_id = l.id order by a.logged_at desc limit 1) as last_activity_at
from pipeline_cards pc
join leads l on l.id = pc.lead_id
left join reps r on r.id = pc.rep_id
order by pc.stage, pc.position;
