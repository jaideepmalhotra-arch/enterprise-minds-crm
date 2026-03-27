-- ─────────────────────────────────────────────
-- Enterprise Minds CRM · Supabase Schema
-- Run once in Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. CLIENTS ──────────────────────────────────
create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  company      text not null,
  industry     text,
  website      text,
  country      text,
  city         text,
  company_size text,
  source       text,
  notes        text,
  status       text default 'prospect' check (status in ('active','inactive','prospect')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 2. CONTACTS ─────────────────────────────────
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete cascade,
  name       text not null,
  role       text,
  email      text,
  phone      text,
  linkedin   text,
  is_primary boolean default false,
  notes      text,
  created_at timestamptz default now()
);

create index if not exists contacts_client_idx on contacts(client_id);

-- 3. DEALS (pipeline) ─────────────────────────
create table if not exists deals (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references clients(id) on delete set null,
  title          text not null,
  company        text,
  contact_name   text,
  contact_email  text,
  contact_phone  text,
  stage          text not null default 'lead'
                 check (stage in ('lead','enrich','discovery','proposal','negotiation','won','lost')),
  service        text,
  value          numeric(14,2),
  currency       text default 'USD',
  probability    int default 20,
  owner          text default 'JM',
  position       int default 0,
  expected_close date,
  notes          text,
  lost_reason    text,
  stage_status   text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  closed_at      timestamptz
);

create index if not exists deals_stage_idx  on deals(stage);
create index if not exists deals_client_idx on deals(client_id);

-- 4. ACTIVITIES ───────────────────────────────
create table if not exists activities (
  id         uuid primary key default gen_random_uuid(),
  deal_id    uuid references deals(id) on delete cascade,
  client_id  uuid references clients(id) on delete cascade,
  type       text not null check (type in ('call','email','meeting','proposal','whatsapp','linkedin','note')),
  note       text,
  outcome    text,
  logged_by  text default 'JM',
  logged_at  timestamptz default now()
);

create index if not exists activities_deal_idx   on activities(deal_id);
create index if not exists activities_client_idx on activities(client_id);
create index if not exists activities_time_idx   on activities(logged_at desc);

-- 5. TASKS ────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  deal_id      uuid references deals(id) on delete cascade,
  client_id    uuid references clients(id) on delete cascade,
  title        text not null,
  type         text check (type in ('call','email','meeting','proposal','whatsapp','linkedin','other')),
  due_date     date,
  priority     text default 'medium' check (priority in ('high','medium','low')),
  status       text default 'open' check (status in ('open','done','snoozed')),
  created_at   timestamptz default now(),
  completed_at timestamptz
);

create index if not exists tasks_deal_idx   on tasks(deal_id);
create index if not exists tasks_due_idx    on tasks(due_date);
create index if not exists tasks_status_idx on tasks(status);

-- 6. REALTIME ─────────────────────────────────
alter publication supabase_realtime add table deals;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table tasks;
