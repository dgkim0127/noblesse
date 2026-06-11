# Supabase Migration Checklist

This checklist defines the validation work required before Noblesse applies the PostgreSQL/Supabase scaffold to any production business database.

## 1. Purpose

- Noblesse production business data is based on PostgreSQL/Supabase.
- Firebase may remain for Hosting and optional Storage.
- Firestore is not the long-term business source of truth.
- This checklist exists to verify SQL, RLS, seed data, and analytics views before production migration work begins.

## 2. Scope

Validation targets:

- `supabase/schema.sql`
- `supabase/rls_policies.sql`
- `supabase/analytics_views.sql`
- `supabase/seed_mock_data.sql`

Excluded from this step:

- production migration
- frontend Supabase connection
- service role key usage
- `DATABASE_URL` usage
- real Auth connection
- real admin write path

## 3. Recommended Validation Environment

- Use local Supabase or a separate dev Supabase project.
- Do not use the production project for first validation.
- Use an environment that can be reset after testing.
- Keep validation data synthetic or development-only.
- For manual SQL Editor validation, follow `docs/DEV_SUPABASE_SQL_EDITOR_RUNBOOK.md`.
- Record dry-run results in `supabase/VALIDATION_NOTES.md` without recording secrets.

## 4. Execution Order

Before executing SQL, complete the 21B static review:

- confirm file existence
- compare table and column names across schema, RLS, views, and seed
- confirm check constraint values
- confirm seed order matches FK dependencies
- confirm no frontend connection, credential, or migration command was added

Static review must pass before any SQL execution or local/dev dry-run.

Run the files in this order:

1. `schema.sql`
2. `rls_policies.sql`
3. `analytics_views.sql`
4. `seed_mock_data.sql`

Notes:

- `seed_mock_data.sql` is local/dev only.
- Do not run seed data in production.
- If any earlier file fails, stop and fix that layer before continuing.
- `supabase/SQL_EDITOR_COPY_ORDER.md` provides a short copy order, but the runbook remains the full safety reference.

## 5. Pre-flight Checks

Confirm before execution:

- `pgcrypto` or equivalent UUID support is available for `gen_random_uuid()`.
- Table creation order matches foreign key dependencies.
- Foreign key dependency order is valid.
- Check constraint values match the current application contract.
- Market values are `KR`, `JP`, `US`, `GLOBAL`.
- Currency values are `KRW`, `JPY`, `USD`.
- Inquiry statuses are `requested`, `checking`, `quoted`, `confirmed`, `cancelled`.
- Admin Quote statuses are `draft`, `sent`, `accepted`, `cancelled`.
- Agreement keys are:
  - `terms_of_service`
  - `buyer_terms`
  - `privacy_collection_use`
  - `marketing_updates`
  - `privacy_policy`
- `supabase/STATIC_REVIEW_REPORT.md` says the scaffold is ready for local/dev SQL dry-run.

## 6. Schema Validation Checklist

Validate these tables:

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

For each table, confirm:

- primary key
- foreign key
- unique constraint
- check constraint
- default value
- `created_at` / `updated_at`
- indexes

Specific file purpose:

- `schema.sql`: core tables, constraints, indexes, updated_at trigger, `terms_versions`, and `buyer_agreements`.
- `rls_policies.sql`: public read rules, buyer own-data rules, approved buyer price access rules, admin policies, and direct browser insert restrictions.
- `analytics_views.sql`: admin analytics views for reporting.
- `seed_mock_data.sql`: local/dev verification data only; production use is prohibited.

## 7. RLS Validation Checklist

Validate:

- RLS is enabled on all business tables.
- Public users can read visible categories, products, collections, banners, and public catalog files.
- Pending buyers cannot read `product_prices`.
- Approved buyers can read `product_prices` only for their assigned market.
- Buyers can read their own profile.
- Buyers can read their own inquiries and inquiry items.
- Admin users can read/write all admin-relevant tables.
- `buyer_agreements` buyer own read works.
- Active `terms_versions` public read works.
- Direct browser insert into sensitive tables is not trusted.
- Production Request Quote should use trusted RPC/API.

Notes:

- Current RLS is draft.
- Supabase `auth.uid()` behavior must be tested in dev.
- Admin role helper logic must be reviewed before production.
- Service-role-based execution can create or inspect policies, but it does not validate buyer/admin RLS behavior.
- Auth-context RLS smoke tests may require a separate dev setup with real pending buyer, approved buyer, and admin sessions.

## 8. Analytics View Validation Checklist

Validate these views:

- `v_top_requested_products_30d`
- `v_top_requested_products_by_market`
- `v_buyer_inquiry_summary`
- `v_category_inquiry_summary`
- `v_quote_conversion_monthly`
- `v_popular_option_combinations`
- `v_monthly_inquiry_trend`

Confirm:

- view creation succeeds
- views return rows after seed
- null-safe aggregation
- market/currency grouping
- monthly grouping
- status conversion counts

## 9. Seed Validation Checklist

Confirm seed inserts:

- admin user
- approved buyer
- categories
- collections
- `NB-001` through `NB-005` products
- product prices
- inquiry / inquiry items
- admin quote / admin quote items
- `terms_versions`
- `buyer_agreements`

Notes:

- Seed data is dev/local only.
- Seed data is prohibited in production.
- Sample email/domain values are not operating data.

## 10. Security Checklist

Required:

- no `DATABASE_URL` in frontend
- no `SUPABASE_SERVICE_ROLE_KEY` in frontend
- no service role in `.env.example`
- `VITE_SUPABASE_ANON_KEY` may later be used for a public client, but never for admin writes
- admin writes must go through trusted API/RPC
- Request Quote submit must reload `product_prices` server-side
- `priceSnapshot` is reference only
- confirmed totals must be recalculated server-side
- `audit_logs` table is needed before real admin operations

## 11. Rollback / Reset Plan

- Local/dev DB reset must be available before testing.
- Schema drop/reset procedures are allowed only in dev validation environments.
- Production rollback requires a separate migration strategy.
- Do not treat dev reset steps as production rollback steps.

## 12. Go / No-Go Criteria

Go conditions:

- all SQL files execute in dev
- RLS smoke test passes
- manual SQL Editor dry-run results are recorded in `supabase/VALIDATION_NOTES.md`
- analytics views return expected seed rows
- no frontend secrets
- no direct admin write from browser
- `docs/ADMIN_API_PLAN.md` reviewed

No-Go conditions:

- RLS lets pending buyers read prices
- buyer can read other buyer data
- admin write requires frontend service key
- views fail
- seed fails
- price totals are trusted from client
