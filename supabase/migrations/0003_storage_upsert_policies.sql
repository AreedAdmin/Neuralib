-- Allow upsert + cache eviction on neuralib-exports.
-- The original 0001_init bucket policies (applied via MCP during Phase 2) covered
-- INSERT + SELECT only. Supabase Storage's `upload({ upsert: true })` writes a row
-- with INSERT semantics, but the underlying ON CONFLICT path needs UPDATE permission
-- on storage.objects too — without it, re-uploading the same content_hash trips
-- "new row violates row-level security policy".

create policy "neuralib_exports_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'neuralib-exports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'neuralib-exports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "neuralib_exports_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'neuralib-exports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
