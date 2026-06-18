# Admin Staging DB Secret Value Recovery Report

## Scope

- Fast diagnosis of the staging DB URL secret/configuration after `Invalid database URL configuration`.
- Approved secret inspected: `noblesse-staging-database-url`.
- No unrelated secret inspected.
- No secret value printed, logged, documented, or committed.
- No DB connection.
- No migration Job rerun.
- No migration Job definition update.
- No IAM change.
- No unrelated dirty source touched.

## Runtime Surface

- Job name: `noblesse-staging-schema-migration`.
- execution service account present: Yes.
- raw service account recorded: No.
- DB URL env var name: `DATABASE_URL`.
- connected Secret Manager secret: `noblesse-staging-database-url`.
- secret version reference: `latest`.

## Secret Metadata

- secret exists: Yes.
- enabled versions: 1.
- disabled versions: 0.
- destroyed versions: 0.
- latest enabled version: 1.

## Payload Access

- payload access attempted: Yes.
- payload access scope: `noblesse-staging-database-url` only.
- secret value output: No.
- secret value written to file: No.
- exact length recorded: No.

## Redacted Validation Result

- empty: No.
- length bucket: 81-200.
- leading/trailing whitespace: No.
- newline present: No.
- surrounding quote/escape issue: No.
- `DATABASE_URL=` prefix present: No.
- scheme present: Yes.
- scheme type: postgres.
- username component: Yes.
- password component: Yes.
- host component: Yes.
- database path component: Yes.
- query component: No.
- placeholder present: No.
- Node URL parse success: Yes.

## Root Cause Category

- Category: F. evidence insufficient / runtime value mismatch.

Reason:

- The Job points to the expected env var and secret.
- The secret latest value is non-empty and parseable by Node URL parsing when inspected under the approved recovery gate.
- No safe secret/config-only mutation is supported by the current evidence.

## Recovery Action

- Secret version added: No.
- Existing version disabled/destroyed: No.
- Job updated: No.
- Job rerun: No.
- IAM changed: No.

## Next Gate

- `APPROVE_STAGING_MIGRATION_JOB_RUNTIME_ENV_DIAGNOSTIC = YES`

The next step should inspect the Cloud Run Job runtime environment behavior without exposing the DB URL and without rerunning the migration unless a separate rerun gate is approved.
