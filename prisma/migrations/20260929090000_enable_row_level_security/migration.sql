-- Defence in depth for hosted Postgres (Supabase exposes the public schema through its Data API).
--
-- GatVuller reaches the database only through Prisma, connected as the table owner. Row level security
-- with no policies denies every other role (anon, authenticated, any leaked API key) and does not affect
-- the owner, which is exempt unless FORCE ROW LEVEL SECURITY is set. Nothing here changes how the app runs.
--
-- Tables added by later migrations must enable it too; src/lib/rls.test.ts fails the build if one forgets.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', t.tablename);
  END LOOP;
END $$;
