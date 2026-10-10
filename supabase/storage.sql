-- Between the Villes: storage for event flyers. Run in the Supabase SQL editor after schema.sql.
-- Safe to run more than once.
--
-- Flyers are public images (anyone can view them, like the events they belong to). People can only
-- upload into a folder named after their own user id, and only the owner can delete flyers.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flyers', 'flyers', true, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "upload own flyers" on storage.objects;
create policy "upload own flyers" on storage.objects for insert to authenticated
  with check (bucket_id = 'flyers' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "owner deletes flyers" on storage.objects;
create policy "owner deletes flyers" on storage.objects for delete to authenticated
  using (bucket_id = 'flyers' and public.is_owner());

commit;
