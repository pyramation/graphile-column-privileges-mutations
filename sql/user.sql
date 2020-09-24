BEGIN;
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM
            pg_catalog.pg_roles
        WHERE
            rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_password';
END IF;
END
$do$;
GRANT anonymous TO app_user;
GRANT authenticated TO app_user;
COMMIT;

