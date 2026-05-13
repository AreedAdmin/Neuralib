-- Expose the `neuralib` schema to PostgREST.
-- By default Supabase only exposes `public` and `graphql_public`; without
-- this config, supabase-js requests with `db.schema = "neuralib"` fail with
-- PGRST106 ("Invalid schema: neuralib").
--
-- This sets the GUC at the role level for the three Postgrest auth roles.
-- A NOTIFY tells the running PostgREST instance to reload its schema cache.
--
-- Idempotent: re-running with the same value is a no-op.

alter role authenticator   set pgrst.db_schemas to 'public, graphql_public, neuralib';
alter role anon            set pgrst.db_schemas to 'public, graphql_public, neuralib';
alter role authenticated   set pgrst.db_schemas to 'public, graphql_public, neuralib';

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
