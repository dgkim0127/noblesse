# Admin Staging Schema Migration Recovery Diagnosis

## Scope

- Read-only investigation of failed staging schema migration Job execution.
- No re-execution.
- No Job update.
- No IAM change.
- No secret value access.
- No DB connection.
- No SQL execution.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Current State

- Job exists: Yes.
- execution count: 1.
- latest execution succeeded: No.
- migration committed: No.
- runner start log present: No.
- secret leak detected: No.
- raw SQL leak detected: No.
- raw logs recorded: No.

## Job Configuration Check

- service account assigned: Yes.
- Cloud SQL connection attached: Yes.
- `DATABASE_URL` secret reference present: Yes.
- required env present: Yes.
- command/args expected: Yes.
- task/retry/timeout expected: Yes.
- raw service account/connection/env values recorded: No.

## Execution / Logs Diagnosis

- container start signal: Unknown.
- node process started: No.
- runner guard signal: No.
- migration started signal: No.
- migration committed signal: No.
- migration failed signal: No.
- permission issue signal: Yes.
- secret access denied signal: Unknown.
- Cloud SQL access denied signal: Unknown.
- command/module issue signal: No.
- timeout signal: Present in provider status, but migration runner did not start.
- raw logs recorded: No.

## IAM / Secret / Cloud SQL Check

- secretAccessor present: Yes.
- Cloud SQL Client IAM present: Yes.
- secret version count: 1.
- secret value accessed: No.
- Cloud SQL instance ready: Yes.
- database exists: Yes.
- DB user exists: Yes.
- raw IAM policy recorded: No.
- raw Cloud SQL connection name/IP/user list recorded: No.

## Failure Category

- Category: B. IAM/permission issue.
- Sanitized reason: image pull/container-start permission signal before migration runner start.
- No raw identifiers recorded: Yes.

## Recommended Recovery Gate

- `APPROVE_MIGRATION_IAM_FIX = YES`

Recovery should inspect the image pull/runtime identity permission boundary and any required Artifact Registry or Cloud Run service-agent access. Do not re-run the migration until the fix is separately approved and completed.

## No-Go

- no re-execution in 32L-13R.
- no migration execution.
- no DB connection/psql.
- no secret value access.
- no Cloud Run app update.
- no Firebase rewrite.
- no production write.
