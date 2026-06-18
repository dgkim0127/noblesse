# Admin Staging Cloud SQL Resource Report

## Scope

- Create Noblesse staging Cloud SQL PostgreSQL resource only.
- No production DB.
- No DB user/password.
- No schema migration.
- No DB connection.
- No IAM change.
- No Secret Manager version.
- No Cloud Run update.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Approval

- `APPROVE_STAGING_DB_CREATE_REVISED`: Yes.
- instance name: `noblesse-staging-pg`
- database name: `noblesse_staging`
- region: `asia-northeast3`
- database version: `POSTGRES_16`
- tier: `db-g1-small`
- edition: Enterprise
- environment: staging

## Execution

- instance existed before: No.
- instance create executed: Yes.
- database create executed: Yes.
- DB user created: No.
- password recorded: No.
- schema migration executed: No.
- psql executed: No.

## Validation

- instance exists: Yes.
- instance ready: Yes.
- region correct: Yes.
- version expected: Yes.
- tier expected: Yes.
- edition expected: Yes.
- availability zonal: Yes.
- deletion protection disabled: Yes.
- database exists: Yes.
- staging secret version count: 0.
- raw connection name recorded: No.
- raw IP recorded: No.
- raw project id recorded: No.

## No-Go

- Cloud SQL Client IAM: No-Go.
- DB user/password creation: No-Go.
- schema migration: No-Go.
- secret version addition: No-Go.
- Cloud Run DB update: No-Go.
- Firebase Auth/rewrite: No-Go.
- production write: No-Go.

## Next Gate

- `APPROVE_CLOUD_SQL_CLIENT_IAM = YES`
- `APPROVE_DB_USER_CREATE = YES`
- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`
- DB user/password and secret version still require separate approval.

## 32L-7 Cloud SQL Client IAM

- Cloud SQL Client IAM grant result is documented in `docs/ADMIN_CLOUD_SQL_CLIENT_IAM_REPORT.md`.
- `roles/cloudsql.client` is present for the dedicated Noblesse runtime identity.
- DB user/password creation remains No-Go.
- schema migration remains No-Go.
- Secret Manager version addition remains No-Go.
- Cloud Run DB update remains No-Go.
- Firebase Auth/rewrite remains No-Go.

## 32L-8 DB User / Secret Handoff

- Staging DB user and secret handoff result is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- Staging DB user exists: Yes.
- Staging secret version count remains 0.
- Password and DB URL recorded: No.
- DB connection, psql, schema migration, Cloud Run DB update, Runtime Secret IAM, Firebase rewrite/deploy, and production write remain No-Go.
