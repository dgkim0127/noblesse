# Dev Supabase SQL Editor Runbook

This runbook explains how to manually validate the Noblesse SQL scaffold in a non-production Supabase environment.

Use this only for a separate dev Supabase project or a local Supabase database. The maintainer runs SQL directly in the Supabase SQL Editor and records only the result summary in `supabase/VALIDATION_NOTES.md`.

Codex and frontend code must not receive, store, or print secrets.

## Purpose

- Validate Noblesse PostgreSQL/Supabase SQL before any production migration.
- Keep the first dry-run outside production.
- Confirm schema, RLS policies, analytics views, seed data, and smoke tests.
- Avoid putting Supabase URL, anon key, service role key, database password, or connection string into Codex, GitHub, docs, or `.env.example`.

## Safety Rules

- Do not run this against a production Supabase project.
- Use a separate dev Supabase project or a local Supabase environment.
- Do not record service role key, database password, anon key, or connection string in Codex, GitHub, docs, or `.env.example`.
- Run SQL directly in Supabase SQL Editor and record only results in `supabase/VALIDATION_NOTES.md`.
- `supabase/seed_mock_data.sql` is local/dev only and must not be used in production.
- If one SQL file fails, stop. Do not continue to the next SQL file.
- Do not reset an operating production database.
- Do not add a real frontend Supabase connection.
- Do not implement an admin write path in this step.
- Do not run Firebase deploy commands.

## Option A. Separate Dev Supabase Project

1. Create a new project in the Supabase dashboard.
2. Use a clearly non-production name, for example:
   - `noblesse-dev`
   - `noblesse-catalog-dev`
3. Include `dev` in the project name so it is not confused with production.
4. Open the dev project SQL Editor.
5. Run the SQL files in the order listed below.
6. Record only success/failure, row counts, and notes in `supabase/VALIDATION_NOTES.md`.

Do not write the Supabase URL, keys, database password, connection string, or project reference ID into this repo. Do not import operating data.

## Option B. Local Supabase

1. Make sure Docker is running.
2. Confirm Supabase CLI is available in the local environment.
3. Use a local Supabase database that can be reset safely.
4. Run the same SQL files in the same order.
5. Record only result summaries in `supabase/VALIDATION_NOTES.md`.

This runbook prioritizes the SQL Editor path. If local CLI setup is uncertain, pause and use a reset-safe local/dev environment instead of improvising with production resources.

## SQL Execution Order

Run these files in order:

1. `supabase/schema.sql`
2. `supabase/rls_policies.sql`
3. `supabase/analytics_views.sql`
4. `supabase/seed_mock_data.sql`

For every step:

- Confirm the previous step succeeded.
- Copy the full file into the dev SQL Editor.
- Execute it in the dev project only.
- Stop immediately on failure.
- Record the result in `supabase/VALIDATION_NOTES.md`.

## Step 1. Run schema.sql

Execution location:

- Supabase Dashboard
- Dev project
- SQL Editor

Copy this file:

- `supabase/schema.sql`

Success criteria:

- No error.
- Tables are created.
- Triggers are created.
- Indexes are created.

Verification query:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected tables:

- `users`
- `buyers`
- `categories`
- `products`
- `product_prices`
- `collections`
- `product_collections`
- `inquiries`
- `inquiry_items`
- `admin_quotes`
- `admin_quote_items`
- `banners`
- `catalog_files`
- `terms_versions`
- `buyer_agreements`

If it fails, check:

- `pgcrypto` extension availability.
- Foreign key creation order.
- Check constraint values.
- Trigger target tables.
- SQL syntax.

Record the result in the `schema.sql` section of `supabase/VALIDATION_NOTES.md`.

## Step 2. Run rls_policies.sql

Prerequisite:

- `schema.sql` succeeded.

Copy this file:

- `supabase/rls_policies.sql`

Success criteria:

- Helper functions are created.
- RLS is enabled.
- Policies are created.

Verification queries:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Record the result in the `rls_policies.sql` section of `supabase/VALIDATION_NOTES.md`.

Note: SQL Editor execution can confirm helper and policy creation. Auth-context RLS behavior may require a separate smoke test with real dev buyer/admin Auth contexts.

## Step 3. Run analytics_views.sql

Prerequisites:

- `schema.sql` succeeded.
- `rls_policies.sql` succeeded.

Copy this file:

- `supabase/analytics_views.sql`

Success criteria:

- Views are created.
- No column mismatch.
- No `group by` error.
- No `date_trunc` error.

Verification query:

```sql
select table_name
from information_schema.views
where table_schema = 'public'
order by table_name;
```

Expected views:

- `v_top_requested_products_30d`
- `v_top_requested_products_by_market`
- `v_buyer_inquiry_summary`
- `v_category_inquiry_summary`
- `v_quote_conversion_monthly`
- `v_popular_option_combinations`
- `v_monthly_inquiry_trend`

Record the result in the `analytics_views.sql` section of `supabase/VALIDATION_NOTES.md`.

## Step 4. Run seed_mock_data.sql

Prerequisites:

- `schema.sql` succeeded.
- `rls_policies.sql` succeeded.
- `analytics_views.sql` succeeded.

Copy this file:

- `supabase/seed_mock_data.sql`

Success criteria:

- Seed inserts complete.
- No foreign key mismatch.
- No check constraint error.
- No duplicate issue.

Important:

- This seed is dev/local only.
- Do not run it in production.
- It is not operating data.

Record the result in the `seed_mock_data.sql` section of `supabase/VALIDATION_NOTES.md`.

## Basic Row Count Smoke Test

Run this after seed succeeds:

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

Exact row counts may change with seed content. Record the returned counts in `supabase/VALIDATION_NOTES.md`.

## Analytics View Smoke Test

Run these after seed succeeds:

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

- Queries succeed.
- Rows are returned after seed.
- Numeric aggregation is not broken by null values.
- Market/currency grouping is correct.
- Monthly grouping is correct.

Record the result in the Analytics View Smoke Test section of `supabase/VALIDATION_NOTES.md`.

## RLS Smoke Test

Separate these two levels of RLS validation.

### A. Basic Policy Creation Check

Confirm:

- Policies exist.
- RLS is enabled.
- Helper functions exist.

This can be checked from SQL Editor using the policy and table queries above.

### B. Auth-Context RLS Test

Validate later with real dev Auth contexts:

- Pending buyer price access is blocked.
- Approved buyer can read assigned-market prices.
- Buyer can read own inquiries.
- Buyer cannot read another buyer's inquiry.
- Buyer can read own agreement history.
- Admin can use admin read/write policies.

Do not count a service-role-key bypass as an RLS behavior test. RLS validation must use real dev buyer/admin Auth context and must not use production.

## Updating Validation Notes

After manual execution, update `supabase/VALIDATION_NOTES.md` with:

- Date.
- Environment type.
- Confirmation that it was local/dev.
- Confirmation that production was excluded.
- Per-file success/failure.
- Row count smoke test result.
- Analytics view smoke test result.
- RLS policy creation check.
- Auth-context RLS result or `not executed`.
- Go / No-Go.
- Issues and next action.

Do not record secrets, project keys, passwords, connection strings, or project reference IDs.

## Stop Conditions

Stop and record a No-Go if:

- Any SQL file fails.
- Production project was used accidentally.
- Any secret was copied into a file, issue, PR, or chat.
- Row count smoke test fails after seed.
- Analytics view smoke test fails after seed.
- RLS is not enabled or policies are missing.

## Go / No-Go

Go for the next implementation step only when:

- All four SQL files execute successfully in local/dev.
- Row count smoke test passes.
- Analytics view smoke test passes.
- Basic RLS policy creation check passes.
- Auth-context RLS test is either passed or explicitly scheduled as the next controlled dev-only step.
- No frontend secrets or direct admin write path were added.

No-Go if any SQL file fails, production was used, secrets were recorded, or RLS/analytics checks are incomplete without a documented next action.
