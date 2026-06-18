# Admin Cloud SQL Client IAM Report

## Scope

- Grant Cloud SQL Client role to dedicated Noblesse runtime identity only.
- No DB user/password.
- No DB connection.
- No SQL/migration.
- No Secret Manager version.
- No Cloud Run update/deploy.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Approval

- `APPROVE_CLOUD_SQL_CLIENT_IAM`: Yes.
- role: `roles/cloudsql.client`
- target identity: dedicated Noblesse runtime service account.
- raw service account email recorded: No.
- raw project id recorded: No.

## Execution

- runtime identity verified as dedicated: Yes.
- IAM grant executed: Yes.
- broad owner/editor/admin role added: No.
- Secret Manager role added: No.
- unrelated IAM mutation: No.

## Validation

- `roles/cloudsql.client` present for runtime identity: Yes.
- raw IAM policy recorded: No.
- Cloud SQL instance unchanged: Yes.
- database unchanged: Yes.
- staging secret version count: 0.

## No-Go

- DB user/password creation: No-Go.
- DB connection/psql: No-Go.
- schema migration: No-Go.
- Secret Manager version addition: No-Go.
- Cloud Run DB update: No-Go.
- Firebase Auth/rewrite: No-Go.
- production write: No-Go.

## Next Gate

- `APPROVE_DB_USER_CREATE = YES`

Reason:

- DB user/password is needed before a staging database URL secret version can exist.

## 32L-8 DB User / Secret Handoff

- Staging DB user and secret handoff result is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- DB user creation: Yes.
- Secret version addition: No, blocked after user creation.
- Password and DB URL recorded: No.
- Recovery approval is required before any password reset/delete/recreate or secret version addition.
