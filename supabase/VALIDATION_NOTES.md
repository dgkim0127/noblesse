# Supabase Validation Notes

Use this template when validating the SQL scaffold in local Supabase or a separate dev Supabase project.

Do not paste secrets, service keys, or production connection details into this file.

## Run Metadata

- Date: 2026-06-11
- Environment: Not executed. Local PostgreSQL service was present, but no local Supabase/dev Supabase connection was available without prompting for secrets.
- Reviewer: Codex
- SQL commit: `3652c777496aa49c2a5c1fdccdc49b1dd8ad961f`
- Local/dev confirmation: Intended local/dev validation only.
- Production confirmation: Production Supabase project was not used.
- Secret handling: No connection string, anon key, service role key, or database password was recorded.

## Execution Results

### Static Review

- Result: Passed in 21B.
- Reviewed files: `schema.sql`, `rls_policies.sql`, `analytics_views.sql`, `seed_mock_data.sql`, and supporting docs.
- Changes required before SQL execution: None known from static review.
- Ready for local/dev SQL dry-run: Yes, but dry-run was not executed in 21C because a non-production Supabase/dev connection was not available in the current session.

### schema.sql

- Result: Not executed.
- Notes: Blocked before SQL execution because no non-production Supabase/dev connection was available without requesting or recording secrets.

### rls_policies.sql

- Result: Not executed.
- Notes: Must run only after `schema.sql` succeeds in local Supabase or a separate dev Supabase project.

### analytics_views.sql

- Result: Not executed.
- Notes: Must run only after `rls_policies.sql` succeeds.

### seed_mock_data.sql

- Result: Not executed.
- Notes: Local/dev only. Must not be run against production.

## Basic Row Count Smoke Test

- `users`: Not executed.
- `buyers`: Not executed.
- `products`: Not executed.
- `product_prices`: Not executed.
- `inquiries`: Not executed.
- `inquiry_items`: Not executed.
- `admin_quotes`: Not executed.
- `admin_quote_items`: Not executed.
- `terms_versions`: Not executed.
- `buyer_agreements`: Not executed.

## RLS Smoke Test

- Public visible catalog read: Not executed.
- Pending buyer price access blocked: Not executed.
- Approved buyer assigned-market price access: Not executed.
- Buyer own inquiry read: Not executed.
- Buyer cannot read other buyer inquiry: Not executed.
- Admin read/write policy: Not executed.
- Agreement history read: Not executed.
- Notes: Requires a local/dev Supabase Auth context. Do not use production credentials or service role keys for this note.

## Analytics View Smoke Test

- `v_top_requested_products_30d`: Not executed.
- `v_top_requested_products_by_market`: Not executed.
- `v_buyer_inquiry_summary`: Not executed.
- `v_category_inquiry_summary`: Not executed.
- `v_quote_conversion_monthly`: Not executed.
- `v_popular_option_combinations`: Not executed.
- `v_monthly_inquiry_trend`: Not executed.

## Issues

- Issue: Non-production Supabase/dev connection was not available in the current session without entering a secret.
- Impact: 21C SQL dry-run could not be completed safely.
- Next action: Run the SQL files in a local Supabase or separate dev Supabase SQL editor using the documented order, then update this file with execution results and row counts.

## Decision

- Go / No-Go: No-Go for completed dry-run. Ready for dry-run once a non-production Supabase/dev environment is available.
- Follow-up owner: Project maintainer with access to local/dev Supabase.

## Next Manual Dev Run

- Date:
- Environment: PostgreSQL dev database
- Dev project confirmed:
- Production excluded:
- schema.sql:
- rls_policies.sql: Supabase-specific; not part of the primary PostgreSQL-only dry-run.
- analytics_views.sql:
- seed_mock_data.sql:
- Row count smoke test:
- Analytics view smoke test:
- PostgreSQL authorization model check:
- Go / No-Go:
- Issues:
- Next action:

Do not record Supabase URLs, anon keys, service role keys, database passwords, connection strings, or production project details in this file.

## PostgreSQL-only Follow-up

- Supabase dry-run remains not executed.
- The next dry-run should target a reset-safe PostgreSQL dev database.
- Use `docs/POSTGRES_DEV_DRY_RUN_RUNBOOK.md`.
- Exclude Supabase-specific `rls_policies.sql` from the primary PostgreSQL-only dry-run unless a separate Supabase compatibility review is explicitly needed.
- Keep secrets and provider connection details out of this file.

## PostgreSQL-only Dev Dry-run

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: PostgreSQL Windows service
- Production excluded: Yes
- POS DB excluded: Yes
- Secret recorded: No
- dev database created: No
- schema.sql: Not executed.
- analytics_views.sql: Not executed.
- seed_mock_data.sql: Not executed.
- Row count smoke test: Not executed.
- Analytics view smoke test: Not executed.
- Issues: Local PostgreSQL connection was blocked by authentication/password requirement before the dev database could be created. Manual password input required. No password or connection details were entered or recorded.
- Go / No-Go: No-Go for completed dry-run.
- Next action: Run the dry-run manually with direct user password input in a local terminal, or adjust the local dev authentication setup without recording secrets.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 26C Backend Phase 1 Route Contract And Mock QA Follow-up

- Date: 2026-06-14
- Change: Added `docs/BACKEND_PHASE1_ROUTE_CONTRACT.md` and strengthened backend mock tests.
- Scope: Route contract and mock QA only for Phase 1 read/auth routes.
- DB dry-run status: Unchanged; local PostgreSQL dry-run remains complete with `audit_logs`.
- SQL execution required in 26C: No.
- Implementation status: No production DB connection, Auth provider connection, Cloud Run service, Cloud SQL/Neon resource, Firebase rewrite change, Firebase configuration change, SQL execution, migration, frontend API integration, or deploy action was added.
- Next action: Run local route QA before any provider resource or rewrite work.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 26B Backend Phase 1 Scaffold Follow-up

- Date: 2026-06-14
- Change: Created local backend Phase 1 scaffold under `backend/`.
- Scope: `GET /api/health`, `GET /api/catalog/products`, `GET /api/catalog/products/:productCode`, and `GET /api/buyer/me`.
- DB dry-run status: Unchanged; local PostgreSQL dry-run remains complete with `audit_logs`.
- SQL execution required in 26B: No.
- Implementation status: Local scaffold only. No production DB connection, Auth provider connection, Cloud Run service, Cloud SQL/Neon resource, Firebase rewrite change, Firebase configuration change, SQL execution, migration, or deploy action was added.
- Next action: Run local route QA for the Phase 1 scaffold before any provider resource or rewrite work.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## PostgreSQL-only 22F Manual Dry-run Result Intake

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: PostgreSQL Windows service
- Production excluded: Yes
- POS DB excluded: Yes
- Secret recorded: No
- dev database target: `noblesse_dev`
- dev database created: Yes
- schema.sql: Success. Extension, function, tables, triggers, and indexes were created. `DROP TRIGGER` notices for missing existing triggers were expected and non-blocking.
- analytics_views.sql: Success. Seven analytics views were created.
- seed_mock_data.sql: Failed. Windows `psql` client encoding `UHC` could not interpret UTF-8 Korean seed text, and `psql` continued after the error, leaving a partial seed state.
- Row count smoke test:
  - `users`: 2
  - `buyers`: 1
  - `products`: 5
  - `product_prices`: 9
  - `inquiries`: 1
  - `inquiry_items`: 2
  - `admin_quotes`: 1
  - `admin_quote_items`: 2
  - `terms_versions`: 0
  - `buyer_agreements`: 0
- Row count judgment:
  - `products`: Pass
  - `inquiries`: Pass
  - `terms_versions`: Fail
  - `buyer_agreements`: Fail
- Analytics view smoke test:
  - `v_top_requested_products_30d`: Success, rows returned
  - `v_top_requested_products_by_market`: Success, rows returned
  - `v_buyer_inquiry_summary`: Success, rows returned
  - `v_category_inquiry_summary`: Success, rows returned
  - `v_quote_conversion_monthly`: Success, rows returned
  - `v_popular_option_combinations`: Success, rows returned
  - `v_monthly_inquiry_trend`: Success, rows returned
- SQL changes made: Added a UTF-8 client encoding guard to `seed_mock_data.sql`.
- Issues: Seed failed on Windows client encoding before agreement seed rows completed. Partial seed state is not accepted as a passing dry-run.
- Go / No-Go: No-Go.
- Next action: Rerun in a clean dev database with `ON_ERROR_STOP` enabled. Recommended retry database: `noblesse_dev_retry`.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## PostgreSQL-only Clean Retry Dry-run Result

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: PostgreSQL Windows service
- Production excluded: Yes
- POS DB excluded: Yes
- Secret recorded: No
- dev database target: `noblesse_dev_retry`
- dev database created: Yes
- ON_ERROR_STOP: Enabled
- schema.sql: Success
- analytics_views.sql: Success
- seed_mock_data.sql: Success
- rls_policies.sql: Intentionally not executed for PostgreSQL-only dry-run because it depends on Supabase `auth.uid()`.
- Row count smoke test:
  - `users`: 2
  - `buyers`: 1
  - `products`: 5
  - `product_prices`: 9
  - `inquiries`: 1
  - `inquiry_items`: 2
  - `admin_quotes`: 1
  - `admin_quote_items`: 2
  - `terms_versions`: 5
  - `buyer_agreements`: 4
- Row count judgment:
  - `products`: Pass
  - `terms_versions`: Pass
  - `buyer_agreements`: Pass
  - `inquiries`: Pass
- Analytics view smoke test:
  - `v_top_requested_products_30d`: Success, rows returned
  - `v_top_requested_products_by_market`: Success, rows returned
  - `v_buyer_inquiry_summary`: Success, rows returned
  - `v_category_inquiry_summary`: Success, rows returned
  - `v_quote_conversion_monthly`: Success, rows returned
  - `v_popular_option_combinations`: Success, rows returned
  - `v_monthly_inquiry_trend`: Success, rows returned
- Go / No-Go: Go for PostgreSQL-only local dry-run.
- Next action: Move to backend API design and `audit_logs` planning before any real frontend writes.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 23A Audit Logs Scaffold Follow-up

- Date: 2026-06-12
- Change: Added `audit_logs` table scaffold and indexes to `schema.sql`.
- Backend API boundary: Documented in `docs/BACKEND_API_BOUNDARY.md`.
- Previous dry-run status: 22I PostgreSQL-only clean retry dry-run passed before `audit_logs` was added.
- Current validation status: The previous Go result does not cover the new `audit_logs` table until a new local/dev dry-run passes.
- Required next dry-run: Re-run `schema.sql`, `analytics_views.sql`, and `seed_mock_data.sql` in a clean dev database.
- Expected audit result after seed: `audit_logs` table exists and row count is 0.
- Go / No-Go: No-Go for the updated schema until the 23A schema change is rerun locally.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 23C Audit Logs Dry-run Result Intake

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: User-executed local PostgreSQL dry-run
- Production excluded: User stated production DB was not used.
- POS DB excluded: User stated POS DB was not used.
- Secret recorded: No password, username, host, port, connection string, or `DATABASE_URL` was provided or recorded.
- schema.sql: Result not recorded. The 23C intake message did not include the actual 23B execution result.
- analytics_views.sql: Result not recorded. The 23C intake message did not include the actual 23B execution result.
- seed_mock_data.sql: Result not recorded. The 23C intake message did not include the actual 23B execution result.
- rls_policies.sql: Intentionally not executed for PostgreSQL-only dry-run.
- audit_logs row count: Result not recorded. No audit log count was provided.
- Row count smoke test: Result not recorded. No table counts were provided.
- Row count judgment: Not available without concrete counts.
- Analytics view smoke test: Result not recorded. No view success/failure or row-return summary was provided.
- SQL changes made: None.
- Issues: The intake request contained a placeholder instead of concrete 23B audit dry-run output, so this file cannot mark the updated schema dry-run as passed.
- Go / No-Go: No-Go for verified 23A `audit_logs` schema completion until concrete SQL execution results, row counts, and analytics view smoke-test summaries are provided.
- Next action: Provide the 23B audit dry-run summary without secrets, including each SQL file success/failure, `audit_logs` row count, row count judgment, analytics view smoke-test results, issues, and final Go / No-Go recommendation.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 23B Audit Logs Clean Dry-run Result

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: PostgreSQL Windows service
- Production excluded: Yes
- POS DB excluded: Yes
- Secret recorded: No
- dev database target: `noblesse_dev_audit`
- dev database created: Yes
- ON_ERROR_STOP: Enabled
- schema.sql: Success
- analytics_views.sql: Success
- seed_mock_data.sql: Success
- rls_policies.sql: Intentionally not executed for PostgreSQL-only dry-run because it depends on Supabase `auth.uid()`.
- audit_logs table: Created through `schema.sql`
- Row count smoke test:
  - `users`: 2
  - `buyers`: 1
  - `products`: 5
  - `product_prices`: 9
  - `inquiries`: 1
  - `inquiry_items`: 2
  - `admin_quotes`: 1
  - `admin_quote_items`: 2
  - `terms_versions`: 5
  - `buyer_agreements`: 4
  - `audit_logs`: 0
- Row count judgment:
  - `products`: Pass
  - `terms_versions`: Pass
  - `buyer_agreements`: Pass
  - `inquiries`: Pass
  - `audit_logs`: Pass
- Analytics view smoke test:
  - `v_top_requested_products_30d`: Success, rows returned
  - `v_top_requested_products_by_market`: Success, rows returned
  - `v_buyer_inquiry_summary`: Success, rows returned
  - `v_category_inquiry_summary`: Success, rows returned
  - `v_quote_conversion_monthly`: Success, rows returned
  - `v_popular_option_combinations`: Success, rows returned
  - `v_monthly_inquiry_trend`: Success, rows returned
- Go / No-Go: Go for PostgreSQL-only local dry-run with `audit_logs`.
- Next action: Move to backend API implementation planning. Do not implement backend until API hosting, auth, and PostgreSQL provider choices are confirmed.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 24A Backend Provider/Auth Decision Follow-up

- Date: 2026-06-12
- Change: Added `docs/BACKEND_PROVIDER_AUTH_DECISION.md`.
- Current default candidate: Firebase Hosting + Cloud Run API + PostgreSQL provider + Firebase Auth identity.
- Implementation status: Documentation only. No backend API, auth integration, DB connection, dependency, SQL execution, or migration was added.
- Production readiness: Not ready for implementation until API hosting, auth provider, and PostgreSQL production provider are confirmed.
- Next action: Choose API hosting, auth provider, and PostgreSQL production provider before backend implementation planning.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 24B Backend Implementation Readiness Follow-up

- Date: 2026-06-12
- Change: Added `docs/BACKEND_IMPLEMENTATION_READINESS.md`.
- DB scaffold validation: Complete for local PostgreSQL with `audit_logs`.
- Next phase: Backend implementation readiness and provider confirmation.
- SQL execution required in 24B: No.
- Implementation status: Documentation only. No backend API, auth integration, DB connection, dependency, SQL execution, migration, provider setup, Firebase configuration change, or deploy action was added.
- Next action: Confirm API hosting, Auth provider details, PostgreSQL production provider, secret storage, and `/api/**` rewrite strategy before code implementation.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 24C Backend Stack Decision Gate Follow-up

- Date: 2026-06-12
- Change: Added `docs/BACKEND_STACK_DECISION_GATE.md`.
- PostgreSQL audit dry-run status: Passed for local PostgreSQL with `audit_logs`.
- Next blocking item: Backend stack gate approval before implementation.
- SQL execution required in 24C: No.
- Implementation status: Documentation only. No backend API, Auth connection, DB connection, SQL execution, migration, dependency, provider resource, Firebase configuration change, or deploy action was added.
- Next action: Confirm Cloud Run, Firebase Auth, PostgreSQL provider, admin bootstrap, secret storage, and `/api/**` rewrite strategy before code implementation.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 25A Backend Human Decision Record Follow-up

- Date: 2026-06-12
- Change: Added `docs/BACKEND_HUMAN_DECISION_RECORD.md`.
- DB dry-run status: Complete for local PostgreSQL with `audit_logs`.
- Next blocking item: Human/operator provider, auth, API framework, DB library, migration, rewrite, secret storage, and rollback decisions.
- SQL execution required in 25A: No.
- Implementation status: Documentation only. No backend API, Auth connection, DB connection, SQL execution, migration, dependency, provider resource, Firebase rewrite change, Firebase configuration change, or deploy action was added.
- Next action: Complete the human decision checklist before backend implementation starts.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 25B Backend Human Decisions Selected Follow-up

- Date: 2026-06-12
- Change: Updated `docs/BACKEND_HUMAN_DECISION_RECORD.md` with selected human/operator choices.
- Selected stack: Cloud Run + Firebase Auth email/password first + Cloud SQL primary + Neon fallback + Express + `pg` direct + raw SQL files first.
- Initial API phase: Phase 1 only.
- DB dry-run status: Complete for local PostgreSQL with `audit_logs`.
- SQL execution required in 25B: No.
- Implementation status: Documentation only. No backend API, Auth connection, DB connection, SQL execution, migration, dependency, provider resource, Firebase rewrite change, Firebase configuration change, or deploy action was added.
- Next action: Create a backend scaffold plan before implementation.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## 26A Backend Phase 1 Scaffold Plan Follow-up

- Date: 2026-06-12
- Change: Added `docs/BACKEND_PHASE1_SCAFFOLD_PLAN.md`.
- DB dry-run status: Complete for local PostgreSQL with `audit_logs`.
- Scope: Documentation only for Phase 1 health/catalog/buyer-me scaffold planning.
- SQL execution required in 26A: No.
- Implementation status: Documentation only. No backend folder, backend API, Auth connection, DB connection, SQL execution, migration, dependency, provider resource, Firebase rewrite change, Firebase configuration change, or deploy action was added.
- Next action: Review the Phase 1 scaffold plan before any backend files or package dependencies are created.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.

## PostgreSQL Local Environment Check

- Date: 2026-06-12
- psql: Not found in PATH.
- Docker: Not found in PATH.
- pgAdmin4: Not found in PATH.
- PostgreSQL service: Found and running (`postgresql-x64-17`).
- Recommended path: Use local PostgreSQL for dry-run after confirming a safe SQL client path.
- SQL executed: No

Do not record database password, host, port, username, connection string, or provider secrets in this section.

## PostgreSQL Client Path Check

- Date: 2026-06-12
- psql.exe: Found at `C:\Program Files\PostgreSQL\17\bin\psql.exe`
- psql version: `psql (PostgreSQL) 17.10`
- pgAdmin4.exe: Found at `C:\Program Files\PostgreSQL\17\pgAdmin 4\runtime\pgAdmin4.exe`
- Recommended client: Use psql full path for next dry-run.
- DB connection opened: No
- SQL executed: No
- Secret recorded: No

Do not record database password, host, port, username, connection string, or provider secrets in this section.

## PostgreSQL-only Dev Dry-run Retry

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: PostgreSQL Windows service
- Production excluded: Yes
- POS DB excluded: Yes
- Secret recorded: No
- dev database target: `noblesse_dev`
- dev database created: No
- schema.sql: Not executed.
- analytics_views.sql: Not executed.
- seed_mock_data.sql: Not executed.
- Row count smoke test: Not executed.
- Analytics view smoke test: Not executed.
- Issues: The local PostgreSQL client requires manual password input before a dev database can be created. The dry-run was stopped before database creation and before SQL execution.
- Go / No-Go: No-Go for completed dry-run.
- Next action: Run the dry-run in a local terminal or pgAdmin4 session where the user enters the PostgreSQL password directly, without recording it in chat, docs, GitHub, or config files.

Do not record `DATABASE_URL`, password, host, port, username, or other connection details. Record only success/failure, row count pass/fail, and a short issue summary.
