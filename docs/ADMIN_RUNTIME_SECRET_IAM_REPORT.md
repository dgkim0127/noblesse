# Admin Runtime Secret IAM Report

## Scope

- Grant dedicated Noblesse runtime identity access to staging DB URL secret only.
- Secret-level IAM only.
- No secret value access.
- No secret version addition.
- No Cloud Run update.
- No DB connection.
- No schema migration.
- No Cloud Run Job execution.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Approval

- `APPROVE_RUNTIME_SECRET_IAM`: Yes.
- secret: `noblesse-staging-database-url`
- role: `roles/secretmanager.secretAccessor`
- target identity: dedicated Noblesse runtime service account.
- raw service account email recorded: No.
- raw project id recorded: No.

## Preflight

- secret exists: Yes.
- secret version count before: 1.
- dedicated runtime identity verified: Yes.
- existing secretAccessor binding before: No.
- raw IAM policy recorded: No.
- allUsers/allAuthenticatedUsers present before grant: No.
- unexpected owner/editor/admin role present before grant: No.

## Execution

- IAM grant executed: Yes.
- already existed: No.
- project-wide IAM changed: No.
- other secret IAM changed: No.
- Owner/Editor/Admin role added: No.
- allUsers/allAuthenticatedUsers added: No.

## Validation

- secretAccessor present for runtime identity: Yes.
- scope is secret-level: Yes.
- secret value accessed/read: No.
- secret version count after: 1.
- Cloud Run updated/deployed: No.
- DB connection/psql: No.
- schema migration: No.
- raw IAM policy recorded: No.

## No-Go

- Cloud Run DB update: No-Go.
- Cloud Run Job packaging/execution: No-Go.
- schema migration execution: No-Go.
- Firebase Auth/rewrite: No-Go.
- production write: No-Go.

## Next Gate

- `APPROVE_CLOUD_RUN_MIGRATION_JOB_PACKAGING = YES`

Reason:

- migration runner code exists, and the future runtime identity can now read the staging DB secret.
- Next step is to package/create a controlled migration job path, still without executing migration unless separately approved.

## 32L-12 Migration Job Packaging

- Cloud Run migration job packaging result is documented in `docs/ADMIN_CLOUD_RUN_MIGRATION_JOB_PACKAGING_REPORT.md`.
- A staging schema migration job resource now exists for a future approved execution.
- The job references the staging DB URL secret but the secret value was not accessed/read.
- The job was not executed, schema migration was not executed, and Cloud Run app DB update remains No-Go.
