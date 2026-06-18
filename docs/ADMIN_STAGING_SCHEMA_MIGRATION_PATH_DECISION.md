# Admin Staging Schema Migration Path Decision

## Purpose

- Decide how staging schema migration will be executed before touching the staging database.
- Prevent ad-hoc psql, secret leakage, and public migration endpoints.
- Keep actual DB connection and migration blocked in this step.

## Current State

- Cloud SQL instance: exists.
- database: exists.
- DB user: exists.
- staging DB URL secret version: exists.
- Runtime Secret IAM: not granted.
- Cloud Run DB update: not done.
- schema migration: not executed.
- production write: No-Go.

## Migration Source Review

- schema source: `supabase/schema.sql`.
- destructive SQL risk: Low for data; the file uses `create table if not exists`, `create index if not exists`, and trigger replacement with `drop trigger if exists` / `create trigger`.
- Supabase-specific SQL risk: Low-to-medium; the file uses PostgreSQL `pgcrypto` and `gen_random_uuid()`, but does not define RLS policies or Supabase `auth` / `storage` schema objects.
- seed data included: No.
- required tables/columns: includes `users.auth_uid`, `users.role`, `users.status`, `inquiries.admin_memo`, and `audit_logs`.
- rollback/reset status: planned but not implemented for staging execution.
- migration ordering: single schema file exists, but no approved migration runner or execution order wrapper exists yet.

## Options

### Option A. Local operator migration through Cloud SQL Auth Proxy / psql

Pros:

- Simple and fast.
- Migration output can be inspected directly.

Cons:

- Requires local psql/proxy setup.
- Requires the operator environment to handle secret values.
- Has higher Codex/chat/docs secret leakage risk.
- Lower repeatability.

Judgment:

- Not recommended for the Codex-driven path.
- Acceptable only if the operator executes manually outside Codex and provides a sanitized result.

### Option B. Cloud Run Job / one-off migration runner

Pros:

- Runs inside the Cloud Run / Cloud SQL / Secret Manager / IAM boundary.
- Minimizes local secret handling.
- Better future repeatability.
- Can use the same network/runtime model as the health-only backend.

Cons:

- Requires migration runner implementation.
- Requires Secret Manager accessor IAM.
- Requires Cloud SQL socket connection setup.
- Requires Cloud Run job or equivalent execution approval.

Judgment:

- Recommended controlled path.

### Option C. Cloud Build migration step with Secret Manager

Pros:

- Can integrate with a future build/deploy pipeline.
- Runs in a cloud-controlled environment.

Cons:

- Requires Cloud Build secret access/IAM.
- Risks mixing migration and build responsibilities too early.
- Rollback/debug can be more complex.

Judgment:

- Later CI/CD candidate, not first staging migration.

### Option D. Cloud SQL import from Cloud Storage

Pros:

- Can fit large SQL file imports.

Cons:

- Requires GCS bucket/object/IAM setup.
- Has weaker incremental migration control.
- Schema validation and rollback are harder.

Judgment:

- Not recommended for first controlled staging migration.

### Option E. Backend admin migration endpoint

Judgment:

- No-Go.
- A public or HTTP-triggered migration endpoint is unnecessary attack surface.

## Recommended Path

- Option B: Cloud Run Job / one-off migration runner.
- no public migration endpoint.
- no local Codex psql path.
- no direct secret value read in Codex.
- migration runner implemented separately before execution.

Recommended sequence:

1. `APPROVE_SCHEMA_MIGRATION_RUNNER_IMPLEMENTATION = YES`
2. Implement a migration runner under the backend boundary.
3. Runner uses `DATABASE_URL`, `DB_CONNECTION_MODE`, and `CLOUD_SQL_INSTANCE_CONNECTION_NAME`.
4. Runner reads the approved SQL file and applies it in a transaction where possible.
5. Tests use fake pool/mock SQL parsing only.
6. `APPROVE_RUNTIME_SECRET_IAM = YES`
7. Allow secret access only for the migration job/runtime identity.
8. `APPROVE_CLOUD_RUN_MIGRATION_JOB_EXECUTION = YES`
9. Run the migration job.
10. Produce a sanitized migration report.
11. Run DB read smoke.
12. Only then consider Cloud Run app DB secret/socket update.

## Required Gates

- `APPROVE_SCHEMA_MIGRATION_RUNNER_IMPLEMENTATION = YES`
- `APPROVE_RUNTIME_SECRET_IAM = YES`
- `APPROVE_CLOUD_RUN_MIGRATION_JOB_EXECUTION = YES`
- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`

## Explicit No-Go

- no DB connection in 32L-9.
- no psql.
- no SQL execution.
- no secret access/read.
- no Cloud Run update/deploy.
- no IAM change.
- no Firebase rewrite/deploy.
- no production write.

## Next Gate

- `APPROVE_SCHEMA_MIGRATION_RUNNER_IMPLEMENTATION = YES`

## 32L-10 Runner Implementation

- Schema migration runner implementation is added under the backend boundary.
- Runner files:
  - `backend/src/db/schemaMigrationRunner.js`
  - `backend/src/scripts/runStagingSchemaMigration.js`
  - `backend/tests/schemaMigrationRunner.test.js`
- Runner manages the transaction:
  - `BEGIN`
  - execute approved schema SQL
  - `COMMIT`
  - `ROLLBACK` on failure
- Runner rejects empty SQL and transaction-control SQL in the source file.
- Runner returns/logs sanitized metadata only.
- Script entrypoint refuses to run unless `ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER=true`.
- Tests use fake pool/client only.
- No real DB connection, secret access, Cloud Run Job creation/execution, psql, SQL execution, or migration execution happened in 32L-10.

## Next Gate After 32L-10

- `APPROVE_RUNTIME_SECRET_IAM = YES`
- `APPROVE_CLOUD_RUN_MIGRATION_JOB_PACKAGING = YES`
- `APPROVE_CLOUD_RUN_MIGRATION_JOB_EXECUTION = YES`

## 32L-11 Runtime Secret IAM

- Runtime secret IAM grant result is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity has secret-level `roles/secretmanager.secretAccessor` for the staging DB URL secret.
- Secret value was not accessed/read, and secret version count remains unchanged at 1.
- Cloud Run Job packaging/execution and schema migration execution remain No-Go until separately approved.

## Next Gate After 32L-11

- `APPROVE_CLOUD_RUN_MIGRATION_JOB_PACKAGING = YES`

## 32L-12 Cloud Run Migration Job Packaging

- Cloud Run migration job packaging result is documented in `docs/ADMIN_CLOUD_RUN_MIGRATION_JOB_PACKAGING_REPORT.md`.
- The migration job resource exists and points to the guarded migration runner.
- Job execution count remains 0 from this step.
- Secret value access/read, DB connection by operator, schema migration execution, Cloud Run app DB update, Firebase rewrite, and production write remain No-Go.

## Next Gate After 32L-12

- `APPROVE_CLOUD_RUN_MIGRATION_JOB_EXECUTION = YES`
- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`
