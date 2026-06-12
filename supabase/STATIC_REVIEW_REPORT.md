# Supabase Static Review Report

This report records a static review only. No SQL was executed, no migration was run, and no Supabase project was connected.

## Reviewed Commit

- `9952f1ea16c65407ea492cc52753a3c05a843e69`

## Reviewed Files

- `supabase/schema.sql`
- `supabase/rls_policies.sql`
- `supabase/analytics_views.sql`
- `supabase/seed_mock_data.sql`
- `supabase/README.md`
- `docs/SUPABASE_MIGRATION_CHECKLIST.md`
- `docs/POSTGRES_SCHEMA_PLAN.md`
- `docs/ADMIN_API_PLAN.md`
- `supabase/VALIDATION_NOTES.md`

## schema.sql Findings

- `pgcrypto` extension is declared before `gen_random_uuid()` defaults.
- Table creation order follows FK dependencies: `users`, `buyers`, catalog tables, inquiry tables, quote tables, public content tables, agreement tables.
- Role, status, market, currency, inquiry status, Admin Quote status, and agreement key checks match the documented contract.
- SQL snake_case naming is intentional and maps to React/mock camelCase at the API boundary.
- Required indexes are present. `products(code)` is covered by the unique constraint.
- `updated_at` trigger function exists. `product_prices.updated_at` had no trigger and was updated in this pass.
- `terms_versions` and `buyer_agreements` references match the agreement plan.

## rls_policies.sql Findings

- RLS is enabled on all current business tables.
- Helper functions use `users.auth_uid = auth.uid()::text`, `users.role`, and approved buyer status consistently with the schema.
- Public read policies are limited to visible catalog/content records and active terms versions.
- Buyer read policies are scoped to the current buyer profile, inquiries, inquiry items, and agreements.
- Protected price access is limited to admins or approved buyers in their assigned market.
- Admin policies are present for admin-relevant tables.
- RLS policy creation was not idempotent for most policies. `drop policy if exists` statements were added before direct `create policy` statements.
- Draft direct insert policies for `inquiries` and `inquiry_items` remain narrow but should be replaced by trusted RPC/API before production.

## analytics_views.sql Findings

- All documented view names are present and match `AdminAnalyticsPage`.
- Referenced table and column names match `schema.sql`.
- Status values align with the inquiry and Admin Quote status checks.
- Market and currency grouping is included in amount-based views.
- Aggregations use `coalesce` where needed for numeric totals.
- Monthly grouping uses `date_trunc('month', created_at)::date`.

## seed_mock_data.sql Findings

- Seed order follows FK dependencies: users before buyers, categories before products, products before prices and collections, inquiries before items, Admin Quotes before quote items.
- Agreement versions are inserted before buyer agreements.
- `NB-001` through `NB-005` products are present.
- Product prices use allowed market and currency values.
- Inquiry and Admin Quote statuses use allowed values.
- Seed is clearly marked development-only.
- Garbled Korean agreement seed text was replaced with readable Korean mock agreement text.

## Changes Made

- Added `trg_product_prices_updated_at` in `schema.sql`.
- Added `drop policy if exists` before direct RLS policy creation in `rls_policies.sql`.
- Replaced garbled Korean agreement seed text in `seed_mock_data.sql`.
- Added static review references to the migration checklist, schema plan, admin API plan, Supabase README, and validation notes.

## Unresolved Risks

- RLS helpers depend on Supabase `auth.uid()` and must be smoke-tested in a real local/dev Supabase environment.
- Direct approved-buyer insert policies for Request Quote draft data remain a draft bridge; production should use trusted RPC/API.
- `audit_logs` table is still planned and must be added before production admin write operations.
- Static review cannot prove SQL runtime behavior; local/dev SQL dry-run is still required.

## Next Step Recommendation

A. Ready for local/dev SQL dry-run

## 21C Follow-up

21C dry-run was attempted later, but no non-production Supabase/dev connection was available in the current session without entering a secret. No SQL was executed. See `supabase/VALIDATION_NOTES.md`.

## 22A PostgreSQL-only Follow-up

The static review remains useful as a SQL scaffold review, but the primary architecture direction has changed to PostgreSQL-only. Supabase-specific RLS and `auth.uid()` assumptions need separate re-review if plain PostgreSQL is used.

For the next dry-run, use a reset-safe PostgreSQL dev database and follow `docs/POSTGRES_DEV_DRY_RUN_RUNBOOK.md`. Do not treat Supabase policy review as the final PostgreSQL security model.

## 22G PostgreSQL Dry-run Follow-up

The first user-executed PostgreSQL-only dry-run created schema objects and analytics views successfully, but seed execution failed because Windows `psql` client encoding could not interpret UTF-8 Korean seed text. The seed file now sets UTF-8 client encoding before inserting development seed data.

Future `psql` dry-runs should enable stop-on-error to avoid partial seed state. If partial seed occurs, retry in a clean dev database.
