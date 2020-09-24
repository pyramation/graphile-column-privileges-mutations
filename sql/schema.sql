BEGIN;
CREATE EXTENSION IF NOT EXISTS citext;
DROP SCHEMA IF EXISTS app_public CASCADE;
CREATE SCHEMA app_public;
GRANT usage ON SCHEMA app_public TO authenticated;
CREATE TABLE app_public.users (
    id serial PRIMARY KEY,
    username citext,
    email citext,
    PASSWORD text,
    UNIQUE (username),
    UNIQUE (email)
);
GRANT INSERT ON TABLE app_public.users TO authenticated;
GRANT SELECT (id, username, email) ON TABLE app_public.users TO authenticated;
GRANT UPDATE (username, email, PASSWORD) ON TABLE app_public.users TO authenticated;
GRANT DELETE ON TABLE app_public.users TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_public TO authenticated;
COMMIT;

