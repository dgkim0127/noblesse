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

## PostgreSQL-only 22F Manual Dry-run Result Intake

- Date: 2026-06-12
- Environment option: Local PostgreSQL
- Provider or local type: User-executed local PostgreSQL dry-run
- Production excluded: User stated production DB was not used.
- POS DB excluded: User stated POS DB was not used.
- Secret recorded: No password, username, host, port, connection string, or `DATABASE_URL` was provided or recorded.
- schema.sql: Result not recorded. The 22G intake message did not include the actual 22F execution result.
- analytics_views.sql: Result not recorded. The 22G intake message did not include the actual 22F execution result.
- seed_mock_data.sql: Result not recorded. The 22G intake message did not include the actual 22F execution result.
- Row count smoke test: Result not recorded. No table counts were provided.
- Analytics view smoke test: Result not recorded. No view success/failure or row-return summary was provided.
- SQL changes made: None.
- Issues: The intake request contained a placeholder instead of concrete 22F dry-run output, so this file cannot mark the dry-run as passed.
- Go / No-Go: No-Go for verified dry-run completion until concrete SQL execution results, row counts, and analytics view smoke-test summaries are provided.
- Next action: Provide the 22F dry-run summary without secrets, including each SQL file success/failure, row count results, analytics view smoke-test results, issues, and final Go / No-Go recommendation.

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
