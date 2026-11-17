# Dubocars — Project Spec

## Overview
Dubocars is a small, mobile-first web app where a family or group schedules who uses which car and when. Each car is a column and time runs top to bottom, like Google Calendar's day view, styled to feel like iOS.

## Stack
- Next.js (App Router) + React + TypeScript
- Supabase (Postgres + Realtime), client uses the anon key
- Tailwind CSS
- Deploy target: Vercel

## Login (name-only, no auth)
- First screen has one text input: "What's your name?" and a Continue button.
- Look up the name in `users`, case-insensitive (`ilike` / `lower(name)`), trimmed.
- If it's found and `paused = false`, log in. If it's not found or the user is paused, show a friendly inline error.
- Keep the logged-in user (id, name, color) in `localStorage` and skip the login screen on later visits.
- Include a small "Not you? Switch" option to log out.

## Main screen (the only screen after login)
- **Header** (sticky, translucent blur): selected date (e.g. "Mon, Nov 16"), Today button, calendar button, user avatar circle in the user's color.
- **Calendar button** opens a bottom sheet with a month picker plus a typed date input. Any future date can be picked; planning ahead is a core feature.
- Swipe left/right (or arrows) to move to the previous/next day.
- **Grid:** one column per active car (from `cars`, ordered by `sort_order`), with car names in a sticky column header. Time labels on the left. Vertical scroll covers 24h and opens near the current time. A red "now" line shows on today.
- **Bookings** are rounded blocks filling their car column and time range, colored with the booking user's color. Each shows the user's name and time range (e.g. "Ben · 2:00–4:30 PM").

## Creating / editing bookings
- Tapping an empty slot creates a booking for the logged-in user on that car, starting at the tapped time (snapped to 15 min), default 1h.
- A bottom sheet opens to adjust car, start, end (date can differ for multi-day) and an optional note.
- Changes **auto-save**: no Save button. A small "Saving…" → "Saved ✓" pill appears in the header.
- Tapping an existing booking opens the same sheet. Only the owner can edit or delete it; others see it read-only.
- Long-press + drag to move or resize is a nice-to-have.
- Overlapping bookings on the same car are rejected; show "Toyota is already booked then."

## Realtime
- Subscribe to Supabase Realtime on `bookings` so everyone sees changes instantly without refreshing.
- Use optimistic UI updates.

## Config via database (no code changes)
- Add/remove/pause cars in `cars`. Paused cars are hidden.
- Add users, change colors, and pause users in `users`. Paused users can't log in, but their past bookings stay visible.

## Design direction
- Layout reference: Google Calendar mobile day view (see `refs/`). Restyle it to feel **Apple / iOS**, not Material.
- System font stack (`-apple-system, SF Pro`), generous spacing, large bold date title, soft rounded corners (12–16px).
- Translucent blurred header and bottom sheets (`backdrop-filter`), subtle shadows, no harsh borders.
- Event blocks are soft tinted (user color at ~20% opacity) with a solid left accent bar and dark text, like iOS Calendar.
- Light and dark mode via `prefers-color-scheme`.
- Smooth spring animations for sheets and blocks.
- Phone-first (375–430px), thumb-friendly 44px tap targets. Desktop just centers a wider layout.

## Database (paste into Supabase SQL editor)
```sql
create extension if not exists btree_gist;

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
  exclude using gist (car_id with =, tstzrange(starts_at, ends_at) with &&)
);

insert into cars (name, sort_order) values
  ('Honda', 1), ('Hyundai', 2), ('Toyota', 3);

-- example users
insert into users (name, color) values
  ('Ben', '#0A84FF'), ('Sarah', '#FF375F');

alter table users enable row level security;
alter table cars enable row level security;
alter table bookings enable row level security;
create policy "public read users" on users for select using (true);
create policy "public read cars" on cars for select using (true);
create policy "public all bookings" on bookings for all using (true) with check (true);

alter publication supabase_realtime add table bookings;
```

## Env
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Note
Name-only login isn't real security: anyone who knows a name can log in as that person. That's acceptable for this private group app.

## Decisions (these override anything above)

1. **Overlaps allowed.** Bookings on the same car may overlap. Overlapping blocks sit side by side within the car column, each at a narrower width, so all of them stay visible and tappable (Google Calendar style). Remove the overlap error message.
2. **Ownership.** The logged-in user can edit or delete only their own bookings. Everyone else's open read-only (name, time, note). Enforce this in the UI.
3. **Time step.** 15 minutes. Tapping snaps to the 15-min slot you tapped, pickers use 15-min increments, and the shortest booking is 15 min. A new booking defaults to 30 min.
4. **Visible hours.** 6:00 AM to 12:00 AM (midnight). Bookings must start at or after 6 AM and end by midnight.
5. **Single-day only.** A booking starts and ends on the same day; there are no multi-day bookings. The edit sheet has no date-change for the end time.

### SQL changes (run instead of the original `bookings` table)
```sql
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
```
(The `btree_gist` extension and the exclusion constraint are no longer needed.)

Note there are two reference images under refs/ which can help you get an idea of the structure.