-- Dubocars schema. Paste the whole file into Supabase → SQL Editor → Run (once, on a fresh project).
-- Follows SPEC.md "Decisions": overlaps allowed, single-day bookings, no exclusion constraint.

-- Tables ---------------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0A84FF',
  paused boolean not null default false,
  created_at timestamptz default now()
);
create unique index users_name_lower on users (lower(name));

create table cars (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  paused boolean not null default false
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text,
  created_at timestamptz default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '18 hours')
);
-- The app loads one day at a time by starts_at.
create index bookings_starts_at on bookings (starts_at);

-- Seed data (edit freely) ------------------------------------------------------

insert into cars (name, sort_order) values
  ('Car1', 1), ('Car2', 2), ('Car3', 3);

insert into users (name, color) values
  ('Name1',  '#D946EF'),  -- pink-purple (magenta)
  ('Name2',   '#FF9500'),  -- orange
  ('Name3',   '#FF3B30'),  -- red
  ('Name4', '#007AFF'),  -- blue
  ('Name5',   '#34C759');  -- green

-- Row Level Security --------------------------------------------------------
-- The browser uses the publishable key (Postgres role "anon").
-- users/cars are read-only from the app; manage them in the Supabase table editor.

alter table users enable row level security;
alter table cars enable row level security;
alter table bookings enable row level security;

create policy "public read users" on users for select using (true);
create policy "public read cars" on cars for select using (true);
create policy "public all bookings" on bookings for all using (true) with check (true);

-- Realtime ------------------------------------------------------------------

alter publication supabase_realtime add table bookings;
