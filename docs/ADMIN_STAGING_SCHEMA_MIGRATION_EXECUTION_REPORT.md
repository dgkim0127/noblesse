# Admin Staging Schema Migration Execution Report

## Scope

- Execute approved Cloud Run staging schema migration Job once.
- Apply schema to staging database through guarded runner.
- No local psql.
- No operator DB connection.
- No Secret Manager value read by operator.
- No Cloud Run app DB update.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Approval

- `APPROVE_CLOUD_RUN_MIGRATION_JOB_EXECUTION`: Yes.
- `APPROVE_SCHEMA_MIGRATION_EXECUTION`: Yes.
- job: `noblesse-staging-schema-migration`
- region: `asia-northeast3`
- schema source: `supabase/schema.sql`

## Preflight

- job existed: Yes.
- execution count before: 0.
- staging DB exists: Yes.
- staging DB user exists: Yes.
- secret version count: 1.
- raw DB URL recorded: No.
- raw Cloud SQL connection name recorded: No.

## Execution

- job execute command run: Yes.
- execution created: Yes.
- execution completed: No.
- execution succeeded: No.
- execution count after: 1.
- tasks completed: Unknown.
- raw execution id recorded: No.
- raw logs recorded: No.
- automatic retry/re-execution by Codex: No.

## Migration Result

- schema migration started log present: No.
- schema migration committed log present: No.
- schema migration failed log present: No.
- transaction managed by runner: Not reached.
- rollback required: Not confirmed; runner did not appear to start.
- safe failure category: permission/IAM failure before migration runner start.
- secret leak detected: No.
- raw SQL leak detected: No.
- platform identifiers present in raw provider logs: Yes; raw logs were not copied to repo/docs/chat.

## No-Go Boundaries

- Cloud Run app DB update: No-Go.
- Firebase Auth/rewrite: No-Go.
- production write: No-Go.
- status/buyer/product/price/quote writes: No-Go.
- local psql: No-Go.
- manual SQL recovery: No-Go.

## Go / No-Go

- staging schema migration: No-Go.
- DB read smoke: No-Go until recovery succeeds and is separately approved.
- Cloud Run app DB update: No-Go.
- production write: No-Go.

## Next Gate

- `APPROVE_STAGING_SCHEMA_MIGRATION_RECOVERY = YES`

Reason:

- The job execution was created, but it did not complete successfully and the migration runner start/commit logs were not present.
- Recovery should inspect and fix the permission/IAM boundary without re-running the migration until explicitly approved.

## 32L-13R Recovery Diagnosis

- Read-only recovery diagnosis is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_RECOVERY_DIAGNOSIS.md`.
- Failure category: B. IAM/permission issue before migration runner start.
- Sanitized reason: image pull/container-start permission signal.
- Job config was rechecked and expected command/env/secret reference/Cloud SQL attachment were present.
- No re-execution, Job update, IAM change, secret value access, DB connection, SQL execution, Firebase rewrite, or production write happened in 32L-13R.
- Next recommended gate: `APPROVE_MIGRATION_IAM_FIX = YES`.

## N38-B1 RBAC Migration Job Repackage Follow-up

- Repackage report: `docs/ADMIN_RBAC_MIGRATION_JOB_REPACKAGE_REPORT.md`.
- Existing staging migration Job was updated to include the idempotent N38 lifecycle migration and ledger/checksum runner.
- Previous failed execution history was retained.
- New Job execution created: No.
- Migration execution: No.
- Next migration execution still requires `APPROVE_STAGING_RBAC_MIGRATION_EXECUTION = YES`.
