# Admin RBAC Migration Idempotency Report

## Scope

- N38 lifecycle migration idempotency review and implementation.
- Migration execution: No.
- DB/psql connection: No.
- Cloud Run Job redeploy/execute: No.
- Cloud Run/Firebase deploy: No.
- Real buyer/admin state mutation: No.
- Production data mutation: No.

## Existing Re-run Risk

- The previous lifecycle migration could derive `users.account_status` from legacy `users.status` on repeated runs.
- The previous lifecycle migration could derive `buyers.verification_status` from legacy `users.status` on repeated runs.
- That structure risked overwriting canonical values such as rejected, suspended, or account blocked.
- The previous admin profile backfill also included role mutation behavior that could normalize existing admin roles on repeated runs.

## Migration SQL Changes

- `users.account_status` is added as nullable first, then only NULL rows are backfilled from legacy `users.status`.
- Existing `users.account_status` values are preserved on repeated runs.
- `buyers.verification_status` is added as nullable first, then only NULL rows are backfilled from legacy `users.status`.
- Existing `buyers.verification_status` values, including rejected and suspended, are preserved on repeated runs.
- `submitted_at` and `reviewed_at` are backfilled only when those columns are NULL.
- Existing admin profile roles are not overwritten.
- Missing admin profiles are inserted only for users with `role = admin`.
- If an active approved admin exists but no owner admin profile exists after backfill, the migration fails closed and requires explicit admin bootstrap/recovery rather than auto-promoting on re-run.

## Migration Ledger

- The migration runner now creates `public.app_schema_migrations` if needed.
- Ledger columns:
  - `migration_name text primary key`
  - `checksum text not null`
  - `applied_at timestamptz not null default now()`
- The runner calculates a SHA-256 checksum from the raw SQL text.
- First run with no ledger row executes schema SQL and inserts the ledger row in the same transaction.
- Repeated run with the same `migration_name` and same checksum does not execute schema SQL and returns `alreadyApplied = true`.
- Repeated run with the same `migration_name` and different checksum fails safely before schema SQL execution.
- Raw SQL, DB URL, password, private key, and secret-shaped values are not logged.

## Validation

- Backend fake-pool tests cover first run, repeated run, checksum mismatch, ledger insert rollback, SQL failure rollback, invalid migration names, and sanitized errors.
- Static lifecycle SQL tests verify NULL-only backfills and canonical value preservation.
- Packaged backend migration remains byte-identical to the canonical Supabase migration file.
- Fresh-install schema now includes the app schema migration ledger table.

## Go / No-Go

- Migration idempotency implementation: Go.
- Migration execution: Not run.
- Staging DB migration: No-Go until separate execution approval.
- Production DB migration: No-Go until separate production approval.

## Next Gate

- Approve controlled migration runner packaging/deploy if the current Cloud Run Job image must be refreshed.
- Approve controlled staging migration execution only after confirming the packaged job uses this idempotent runner and migration SQL.
