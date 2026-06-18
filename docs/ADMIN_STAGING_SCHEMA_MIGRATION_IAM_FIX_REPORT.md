# Admin Staging Schema Migration IAM Fix Report

## Scope

- Review the failed staging schema migration execution for a minimal IAM fix.
- Do not repeat the 32L-13R diagnosis.
- Do not re-run the migration Job.
- Do not update the migration Job definition.
- Do not access Secret Manager values.
- Do not connect to the database.
- Do not change unrelated source files.

## Approval

- `APPROVE_MIGRATION_IAM_FIX`: Yes.
- `APPROVE_MIGRATION_JOB_RERUN`: No.
- `APPROVE_SECRET_VALUE_ACCESS`: No.
- `APPROVE_CLOUD_RUN_MIGRATION_JOB_REDEPLOY`: No.

## Evidence Reviewed

- Existing diagnosis report: `docs/ADMIN_STAGING_SCHEMA_MIGRATION_RECOVERY_DIAGNOSIS.md`.
- Failed execution status was checked read-only.
- Cloud Run Job app logs were checked in sanitized form only.
- Secret IAM, Cloud SQL IAM, and Cloud SQL resources were checked read-only.
- Raw project id, service account email, execution id, connection name, DB URL, and secret value were not recorded.

## IAM Gap Review

- Secret-level `roles/secretmanager.secretAccessor` for the runtime identity: Present.
- Project-level `roles/cloudsql.client` for the runtime identity: Present.
- Cloud SQL instance/database/user resources: Present.
- Container image import/start signal: Present.
- App log signal: `Invalid database URL configuration.`
- DB URL/password/private key leak detected: No.
- Raw SQL leak detected: No.

## IAM Change

- IAM change applied: No.
- Principal changed: None.
- Role granted: None.

Reason:

- The current read-only evidence does not show a missing IAM role.
- Granting additional IAM would broaden permissions without a confirmed missing permission.
- The failure now classifies as a configuration/secret-value validity issue before the schema migration runner can create a DB pool.

## Updated Failure Classification

- Previous classification: B. IAM/permission issue.
- Current classification: A. configuration mismatch / secret value validity issue.
- Sanitized reason: `DATABASE_URL` is present through the secret reference, but the application rejects it as an invalid database URL.

## Deliberately Not Done

- No IAM role grant.
- No Owner/Editor/Admin role grant.
- No Secret Manager value access/read.
- No DB connection or psql.
- No migration Job re-run.
- No migration Job update/redeploy.
- No Cloud Run app update/deploy.
- No Firebase rewrite/deploy.
- No unrelated dirty source staged.

## Recommended Next Gate

- `APPROVE_STAGING_DB_SECRET_VALUE_RECOVERY = YES`

The next step should validate and repair the staging DB URL secret value through an approved secret recovery path, without printing or committing the value.

## 32L-15R Secret Value Recovery

- Secret value recovery diagnosis is documented in `docs/ADMIN_STAGING_DB_SECRET_VALUE_RECOVERY_REPORT.md`.
- The Job points to `DATABASE_URL` and `noblesse-staging-database-url:latest`.
- The approved staging secret was inspected without printing or recording the value.
- The latest secret value was non-empty and parseable by Node URL parsing.
- No new secret version was added.
- No IAM change, DB connection, Job rerun, Job update, Firebase rewrite, or production write happened.
- Next recommended gate: `APPROVE_STAGING_MIGRATION_JOB_RUNTIME_ENV_DIAGNOSTIC = YES`.
