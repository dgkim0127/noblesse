# SQL Editor Copy Order

Use this quick order only after reading `docs/DEV_SUPABASE_SQL_EDITOR_RUNBOOK.md`.

Run these files in a non-production dev Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/rls_policies.sql`
3. `supabase/analytics_views.sql`
4. `supabase/seed_mock_data.sql`

Stop if any file fails. Do not continue to the next file until the failing layer is fixed and re-run in a reset-safe local/dev environment.

Rules:

- Do not use production.
- Do not paste secrets into the repo.
- Do not run seed data outside local/dev.
- Record results only in `supabase/VALIDATION_NOTES.md`.
