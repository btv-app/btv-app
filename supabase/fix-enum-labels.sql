-- Run this only if schema.sql stopped with "Type ... already exists with labels ... but is missing ...".
-- It adds the missing labels and changes nothing else: existing labels and rows stay as they are.
-- Run it on its own (not pasted together with schema.sql), because Postgres won't let a new
-- label be used in the same transaction that added it. Then run schema.sql again.

do $$
begin
  if to_regtype('public.event_status') is not null then
    alter type public.event_status add value if not exists 'pending';
    alter type public.event_status add value if not exists 'approved';
    alter type public.event_status add value if not exists 'declined';
  end if;
  if to_regtype('public.user_role') is not null then
    alter type public.user_role add value if not exists 'resident';
    alter type public.user_role add value if not exists 'owner';
  end if;
end $$;
