-- Between the Villes: database schema for Supabase (Postgres).
-- Paste into the Supabase SQL editor and run. See supabase/SETUP.md.
--
-- Safe to run more than once: it creates what is missing, updates functions, trigger and
-- policies to this version, and never drops a table, column, type or row. It runs as one
-- transaction, so if any check below fails, nothing is changed.

begin;

-- Status and role types. If a type already exists, check it has every label the app uses
-- instead of failing with "already exists". Extra labels are left alone.
do $$
declare
  t record;
  have text[];
  missing text[];
begin
  for t in
    select * from (values
      ('event_status', array['pending', 'approved', 'declined']),
      ('user_role', array['resident', 'owner'])
    ) as v(name, labels)
  loop
    if to_regtype('public.' || t.name) is null then
      execute format('create type public.%I as enum (%s)', t.name,
        (select string_agg(quote_literal(l), ', ') from unnest(t.labels) as l));
    else
      select coalesce(array_agg(e.enumlabel::text order by e.enumsortorder), '{}') into have
      from pg_enum e where e.enumtypid = ('public.' || t.name)::regtype;
      missing := array(select unnest(t.labels) except select unnest(have));
      if cardinality(missing) > 0 then
        raise exception 'Type % already exists with labels % but is missing %. Run supabase/fix-enum-labels.sql on its own, then run this script again. Nothing was changed.',
          t.name, have, missing;
      end if;
    end if;
  end loop;
end $$;

-- One row per signed-in person, created on first sign-in.
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role user_role not null default 'resident',
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  town text not null,
  venue text not null,
  event_date date not null,
  time_text text not null,          -- as the organizer wrote it, e.g. "7-10 PM"
  category text not null,           -- allowed values: see events_category_check below
  description text not null default '',
  is_free boolean not null default false,
  latitude double precision,
  longitude double precision,
  flyer_path text,                  -- object path in the "flyers" storage bucket
  status event_status not null default 'pending',
  submitted_by uuid references profiles on delete set null,
  reviewed_by uuid references profiles on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on events (event_date) where status = 'approved';

create table if not exists saved_events (
  user_id uuid references profiles on delete cascade,
  event_id uuid references events on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- Local sponsor ads sold directly by the owner; AdMob fills slots with no active sponsor.
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  headline text not null,
  image_path text,
  link_url text,
  placement text not null check (placement in ('list', 'detail')),
  starts_on date not null,
  ends_on date not null
);

-- "create table if not exists" skips a table that is already there, even one with a
-- different shape. Stop here if an existing table lacks a column the app reads or writes.
do $$
declare
  missing text;
begin
  select string_agg(v.t || '.' || v.c, ', ') into missing
  from (values
    ('profiles', 'id'), ('profiles', 'display_name'), ('profiles', 'role'),
    ('events', 'id'), ('events', 'title'), ('events', 'town'), ('events', 'venue'),
    ('events', 'event_date'), ('events', 'time_text'), ('events', 'category'),
    ('events', 'description'), ('events', 'is_free'), ('events', 'latitude'),
    ('events', 'longitude'), ('events', 'status'), ('events', 'submitted_by'),
    ('events', 'reviewed_by'), ('events', 'reviewed_at'),
    ('saved_events', 'user_id'), ('saved_events', 'event_id'),
    ('sponsors', 'placement'), ('sponsors', 'starts_on'), ('sponsors', 'ends_on')
  ) as v(t, c)
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = v.t and column_name = v.c
  );
  if missing is not null then
    raise exception 'These tables already exist but are missing columns the app needs: %. Nothing was changed.', missing;
  end if;
end $$;

-- Event fields added after the first version. "if not exists" skips any that are already there.
alter table events add column if not exists address text;            -- street address; venue holds the name
alter table events add column if not exists start_time time;
alter table events add column if not exists end_time time;
alter table events add column if not exists price_text text;         -- e.g. "$10, kids free"
alter table events add column if not exists link_url text;           -- tickets, Facebook event or website
alter table events add column if not exists categories text[];       -- one to three; the first is the main one
alter table events add column if not exists cancelled boolean not null default false;  -- still listed, marked cancelled
alter table events add column if not exists recurrence jsonb;        -- how it repeats, e.g. {"freq":"weekly","interval":1,"weekdays":[6]}

-- Events from before multiple categories keep their one category as the list.
update events set categories = array[category] where categories is null or cardinality(categories) = 0;

-- Categories the owner manages in the app. The starting list goes in only when the table is
-- first created, so a category the owner removed doesn't come back when this script is rerun.
do $$
begin
  if to_regclass('public.categories') is null then
    create table public.categories (
      name text primary key check (char_length(name) between 1 and 30),
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
    insert into public.categories (name, sort_order)
    select name, ord - 1
    from unnest(array[
      'Music', 'Family', 'Food', 'Festival', 'Community',
      'Support a Cause', 'Community Resources', 'Fitness', 'Shopping'
    ]) with ordinality as t(name, ord);
  end if;
end $$;

-- Towns the owner manages in the app, with a center point for events without a street address.
-- Like categories, the starting list goes in only when the table is first created.
do $$
begin
  if to_regclass('public.towns') is null then
    create table public.towns (
      name text primary key check (char_length(name) between 1 and 30),
      latitude double precision not null,
      longitude double precision not null,
      sort_order int not null default 0,
      created_at timestamptz not null default now()
    );
    insert into public.towns (name, latitude, longitude, sort_order) values
      ('Ashland City', 36.2742, -87.0642, 0),
      ('Kingston Springs', 36.0995, -87.1153, 1),
      ('Pegram', 36.1006, -87.0517, 2),
      ('Pleasant View', 36.3945, -87.0367, 3),
      ('Chapmansboro', 36.3742, -87.1253, 4);
  end if;
end $$;

-- Categories used to be a fixed list checked here. The owner manages them now, so that check
-- goes, and each event instead needs one to three categories.
alter table events drop constraint if exists events_category_check;
alter table events drop constraint if exists events_categories_count;
alter table events add constraint events_categories_count
  check (categories is not null and cardinality(categories) between 1 and 3);
alter table events drop constraint if exists events_recurrence_check;
alter table events add constraint events_recurrence_check check (
  recurrence is null
  or (recurrence->>'freq' in ('daily', 'weekly', 'monthly', 'yearly')
      and (recurrence->>'interval')::int between 1 and 99)
);
-- Links open in the browser, so only web addresses are allowed.
alter table events drop constraint if exists events_link_url_check;
alter table events add constraint events_link_url_check check (link_url is null or link_url ~* '^https?://');

-- New or changed categories and towns must be on the owner's lists. Events keep a category or
-- town the owner removes later, since each check only runs when that field changes. It also keeps
-- the older single "category" column set to the main category.
create or replace function check_event_categories() returns trigger
language plpgsql set search_path = public as $$
declare
  unknown text;
begin
  if tg_op = 'INSERT' or new.categories is distinct from old.categories then
    select string_agg(c, ', ') into unknown
    from unnest(new.categories) as c
    where not exists (select 1 from categories where name = c)
      -- An event may keep a category the owner has since removed from the list.
      and (tg_op = 'INSERT' or not c = any(old.categories));
    if unknown is not null then
      raise exception 'Not a current category: %', unknown;
    end if;
  end if;
  if (tg_op = 'INSERT' or new.town is distinct from old.town)
     and not exists (select 1 from towns where name = new.town) then
    raise exception 'Not a current town: %', new.town;
  end if;
  new.category := new.categories[1];
  return new;
end;
$$;
drop trigger if exists events_check_categories on events;
create or replace trigger events_check_lists before insert or update of categories, town on events
  for each row execute function check_event_categories();

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

-- Create a profile the first time someone signs in, named after their email.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;
create or replace trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- People who signed in before the trigger existed get a profile too.
insert into profiles (id, display_name)
select u.id, split_part(u.email, '@', 1) from auth.users u
on conflict (id) do nothing;

alter table profiles enable row level security;
alter table events enable row level security;
alter table saved_events enable row level security;
alter table sponsors enable row level security;
alter table categories enable row level security;
alter table towns enable row level security;

-- Policies have no "if not exists", so each is dropped and recreated. Inside this
-- transaction there is no moment when a table is left unprotected, and no data is touched.

-- Profiles: people see and edit their own; the owner sees everyone.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select using (id = auth.uid() or is_owner());
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Events: everyone sees approved ones; submitters see their own; the owner sees all.
drop policy if exists "read events" on events;
create policy "read events" on events for select
  using (status = 'approved' or submitted_by = auth.uid() or is_owner());
-- Residents can only submit pending events in their own name.
drop policy if exists "submit events" on events;
create policy "submit events" on events for insert
  with check (submitted_by = auth.uid() and (status = 'pending' or is_owner()));
-- Only the owner approves, declines or edits.
drop policy if exists "owner manages events" on events;
create policy "owner manages events" on events for update using (is_owner());
drop policy if exists "owner deletes events" on events;
create policy "owner deletes events" on events for delete using (is_owner());

drop policy if exists "own saved events" on saved_events;
create policy "own saved events" on saved_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Categories: everyone reads them; only the owner adds or removes them.
drop policy if exists "read categories" on categories;
create policy "read categories" on categories for select using (true);
drop policy if exists "owner manages categories" on categories;
create policy "owner manages categories" on categories for all using (is_owner()) with check (is_owner());

-- Towns: everyone reads them; only the owner adds or removes them.
drop policy if exists "read towns" on towns;
create policy "read towns" on towns for select using (true);
drop policy if exists "owner manages towns" on towns;
create policy "owner manages towns" on towns for all using (is_owner()) with check (is_owner());

drop policy if exists "read active sponsors" on sponsors;
create policy "read active sponsors" on sponsors for select
  using (current_date between starts_on and ends_on or is_owner());
drop policy if exists "owner manages sponsors" on sponsors;
create policy "owner manages sponsors" on sponsors for all using (is_owner()) with check (is_owner());

commit;
