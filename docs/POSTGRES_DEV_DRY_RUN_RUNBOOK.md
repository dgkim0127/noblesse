# PostgreSQL Dev Dry-run Runbook

## Purpose

This runbook describes how to validate the SQL scaffold in a dev PostgreSQL database under the PostgreSQL-only architecture.

It replaces the Supabase SQL Editor path as the primary dry-run plan. The goal is to prove schema, seed data, and analytics views in a reset-safe PostgreSQL environment before any production migration or backend API implementation.

Before running SQL, complete the local environment check in `docs/POSTGRES_LOCAL_ENV_CHECK.md`.

Do not run SQL until the dev environment choice is confirmed.

Before dry-run, also complete `docs/POSTGRES_CLIENT_PATH_CHECK.md`.

Do not run SQL until a `psql` or pgAdmin4 client path is confirmed.

## Environment Options

- Local PostgreSQL
- Docker PostgreSQL
- pgAdmin4-connected dev PostgreSQL
- Neon dev branch
- Railway/Render dev PostgreSQL
- Cloud SQL dev instance

See `docs/POSTGRES_DEV_ENV_OPTIONS.md` for a comparison of dev environment options and their tradeoffs.

## Safety

- Do not use a production DB.
- Do not use a POS DB.
- Do not use operating data.
- Do not record `DATABASE_URL`, passwords, or secrets in the repo.
- Do not connect the frontend to PostgreSQL.
- Do not add backend API code in this dry-run step.
- Do not change Firebase Hosting settings.

## Execution Order

1. `supabase/schema.sql`
2. `supabase/analytics_views.sql`
3. `supabase/seed_mock_data.sql`

Notes:

- `supabase/rls_policies.sql` uses Supabase `auth.uid()` helpers, so it is excluded from the primary PostgreSQL-only dry-run.
- If Supabase compatibility is being reviewed separately, run `rls_policies.sql` only in a dev Supabase project and record that result separately.
- In plain PostgreSQL, backend API authorization is the primary security layer.

## Manual Execution Guide

The maintainer should run this manually:

1. Confirm `docs/POSTGRES_LOCAL_ENV_CHECK.md` has been reviewed.
2. Confirm `docs/POSTGRES_CLIENT_PATH_CHECK.md` has been reviewed.
3. Choose a dev PostgreSQL environment.
4. Create an empty dev database.
5. Open a SQL client:
   - pgAdmin4
   - psql
   - provider SQL console
6. If using `psql`, enable stop-on-error before running any SQL file.
7. Run the full contents of `supabase/schema.sql`.
8. If step 7 succeeds, run the full contents of `supabase/analytics_views.sql`.
9. If step 8 succeeds, run the full contents of `supabase/seed_mock_data.sql`.
10. Run the row count smoke test.
11. Run the analytics view smoke test.
12. Record the result in `supabase/VALIDATION_NOTES.md`.

Important:

- For interactive `psql`, run `\set ON_ERROR_STOP on` before executing files.
- For command-line `psql`, pass `-v ON_ERROR_STOP=1`.
- If one step fails, do not continue to the next SQL file.
- Partial seed state is not a pass. If a seed file fails mid-run, rerun in a clean dev database.
- Record only the error category or message summary.
- Do not record secrets, connection strings, host, port, username, or password.

## Clean Retry Policy

If a dry-run creates a partial seed state, the next attempt must use a clean dev database.

Recommended retry path:

- Create a fresh dev database name such as `noblesse_dev_retry`.
- Or drop/recreate only a dev database after the maintainer explicitly confirms it is safe.

Never drop a production database, a POS database, or any database that may contain operating data. If an existing database is found and its purpose is unclear, stop and ask the maintainer to confirm the retry target.

## Smoke Tests

### Row Count Query

```sql
select 'users' as table_name, count(*) from public.users
union all select 'buyers', count(*) from public.buyers
union all select 'products', count(*) from public.products
union all select 'product_prices', count(*) from public.product_prices
union all select 'inquiries', count(*) from public.inquiries
union all select 'inquiry_items', count(*) from public.inquiry_items
union all select 'admin_quotes', count(*) from public.admin_quotes
union all select 'admin_quote_items', count(*) from public.admin_quote_items
union all select 'terms_versions', count(*) from public.terms_versions
union all select 'buyer_agreements', count(*) from public.buyer_agreements;
```

Expected:

- `products` >= 5
- `terms_versions` >= 5
- `buyer_agreements` > 0
- `inquiries` > 0

### Analytics View Query

```sql
select * from public.v_top_requested_products_30d limit 10;
select * from public.v_top_requested_products_by_market limit 10;
select * from public.v_buyer_inquiry_summary limit 10;
select * from public.v_category_inquiry_summary limit 10;
select * from public.v_quote_conversion_monthly limit 10;
select * from public.v_popular_option_combinations limit 10;
select * from public.v_monthly_inquiry_trend limit 10;
```

Confirm:

- Views can be queried.
- Seed rows appear where expected.
- Market/currency grouping is correct.
- Monthly grouping is correct.
- Numeric totals do not break on null values.

### Integrity Checks

- Foreign key references are valid.
- `product_prices` market/currency values match allowed values.
- `admin_quotes` and `admin_quote_items` rows link correctly.
- `inquiries` and `inquiry_items` rows link correctly.

## Not Included

- Supabase Auth RLS test
- Frontend DB connection
- Production migration
- Backend API implementation

## Result Recording

Record the dry-run result in `supabase/VALIDATION_NOTES.md`.

Do not record secrets, passwords, connection strings, provider project IDs, or production details.
