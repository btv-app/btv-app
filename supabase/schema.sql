-- Between the Villes: database schema for Supabase (Postgres).
-- Run in the Supabase SQL editor once the project exists. Not applied anywhere yet.

create type event_status as enum ('pending', 'approved', 'declined');
create type user_role as enum ('resident', 'owner');

-- One row per signed-in person, created on first sign-in.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role user_role not null default 'resident',
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  town text not null,
  venue text not null,
  event_date date not null,
  time_text text not null,          -- as the organizer wrote it, e.g. "7-10 PM"
  category text not null,
  description text not null default '',
  latitude double precision,
  longitude double precision,
  flyer_path text,                  -- object path in the "flyers" storage bucket
  status event_status not null default 'pending',
  submitted_by uuid references profiles on delete set null,
  reviewed_by uuid references profiles on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index events_date_idx on events (event_date) where status = 'approved';

create table saved_events (
  user_id uuid references profiles on delete cascade,
  event_id uuid references events on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- Local sponsor ads sold directly by the owner; AdMob fills slots with no active sponsor.
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  headline text not null,
  image_path text,
  link_url text,
  placement text not null check (placement in ('list', 'detail')),
  starts_on date not null,
  ends_on date not null
);

create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

alter table profiles enable row level security;
alter table events enable row level security;
alter table saved_events enable row level security;
alter table sponsors enable row level security;

-- Profiles: people see and edit their own; the owner sees everyone.
create policy "own profile" on profiles for select using (id = auth.uid() or is_owner());
create policy "update own profile" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Events: everyone sees approved ones; submitters see their own; the owner sees all.
create policy "read events" on events for select
  using (status = 'approved' or submitted_by = auth.uid() or is_owner());
-- Residents can only submit pending events in their own name.
create policy "submit events" on events for insert
  with check (submitted_by = auth.uid() and (status = 'pending' or is_owner()));
-- Only the owner approves, declines or edits.
create policy "owner manages events" on events for update using (is_owner());
create policy "owner deletes events" on events for delete using (is_owner());

create policy "own saved events" on saved_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read active sponsors" on sponsors for select
  using (current_date between starts_on and ends_on or is_owner());
create policy "owner manages sponsors" on sponsors for all using (is_owner()) with check (is_owner());
