# Admin Cloud Run Migration Job Packaging Report

## Scope

- Create/package Cloud Run Job for future staging schema migration.
- Source deploy using `backend/Dockerfile`.
- Cloud Build may execute.
- No job execution.
- No schema migration execution.
- No DB connection by operator/Codex.
- No secret value access.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Approval

- `APPROVE_CLOUD_RUN_MIGRATION_JOB_PACKAGING`: Yes.
- `APPROVE_CLOUD_BUILD_EXECUTION_FOR_MIGRATION_JOB`: Yes.
- `APPROVE_CLOUD_RUN_JOB_RESOURCE_CREATE`: Yes.
- job name: `noblesse-staging-schema-migration`
- region: `asia-northeast3`

## Packaging

- job existed before: No.
- job deploy/create executed: Yes.
- Cloud Build executed: Yes.
- source path: `backend`
- Dockerfile used: Yes.
- Artifact Registry created/reused: handled by Cloud Run source deploy; raw image/repository path not recorded.
- job exists after: Yes.
- job execution triggered: No.

## Job Configuration

- service account assigned: Yes.
- raw service account email recorded: No.
- Cloud SQL connection attached: Yes.
- raw instance connection name recorded: No.
- `DATABASE_URL` secret reference present: Yes.
- secret value accessed/read: No.
- command: `node`
- args: migration runner script.
- tasks=1: Yes.
- max retries=0: Yes.
- task timeout=10m: Yes.
- `NODE_ENV=production`: Yes.
- `DB_CONNECTION_MODE=cloudsql-socket`: Yes.
- `ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER=true`: Yes.
- `CLOUD_SQL_INSTANCE_CONNECTION_NAME` present: Yes.
- raw env values recorded: No.

## No-Go

- migration job execution: No-Go.
- schema migration execution: No-Go.
- DB connection/psql by operator: No-Go.
- Cloud Run app DB update: No-Go.
- Firebase Auth/rewrite: No-Go.
- production write: No-Go.

## Go / No-Go

- Migration Job packaging: Go.
- Migration Job execution: No-Go.
- Staging schema migration: No-Go.
- Production write: No-Go.

## Next Gate

- `APPROVE_CLOUD_RUN_MIGRATION_JOB_EXECUTION = YES`
- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`

Reason:

- The job must be explicitly executed only after user approval.
