# Admin Staging DB User Secret Recovery Report

## Scope

- Recover staging DB user password handoff.
- Reset existing staging DB application user password.
- Add first staging database URL secret version.
- No DB connection.
- No psql.
- No schema migration.
- No Cloud Run update.
- No runtime Secret IAM.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.

## Approval

- `APPROVE_STAGING_DB_USER_SECRET_RECOVERY`: Yes.
- `APPROVE_DB_USER_PASSWORD_RESET`: Yes.
- `APPROVE_SECRET_MANAGER_VERSION_ADD`: Yes.
- instance: `noblesse-staging-pg`
- database: `noblesse_staging`
- user: `noblesse_staging_app`
- secret: `noblesse-staging-database-url`

## Preflight

- DB user existed before recovery: Yes.
- secret version count before: 0.
- raw user list recorded: No.
- raw secret value accessed: No.

## Execution

- password reset executed: Yes.
- password recorded: No.
- raw command with password recorded: No.
- secret version add executed: Yes.
- TEMP password/secret files removed: Yes.
- temporary runner removed: Not used.

## Validation

- DB user exists after recovery: Yes.
- secret version count after: 1.
- new secret version added: Yes.
- secret value accessed/read: No.
- raw DB URL recorded: No.
- raw password recorded: No.
- raw Cloud SQL connection name recorded: No.

## No-Go Boundaries

- DB connection/psql: No-Go.
- schema migration: No-Go.
- Cloud Run DB update: No-Go.
- Runtime Secret IAM grant: No-Go.
- Firebase Auth/rewrite: No-Go.
- production write: No-Go.

## Go / No-Go

- DB user password recovery: Go.
- First staging secret version: Go.
- Runtime DB connection: No-Go.
- Schema migration: No-Go.
- Production write: No-Go.

## Next Gate

- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`
- `APPROVE_RUNTIME_SECRET_IAM = YES`
- `APPROVE_CLOUD_RUN_DB_SECRET_UPDATE = YES`

Recommended order:

1. schema migration approval path
2. runtime secret accessor IAM
3. Cloud Run DB secret/socket update
4. staging DB read smoke

## 32L-9 Migration Path Decision

- Staging schema migration path decision is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Recommended path: Cloud Run Job / one-off migration runner.
- Local Codex psql and direct secret value read are not recommended.
- Public migration endpoint is No-Go.
- DB connection, SQL execution, Runtime Secret IAM, Cloud Run DB update, Firebase rewrite, and production write remain No-Go.

## 32L-11 Runtime Secret IAM

- Runtime secret IAM grant result is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity now has secret-level `roles/secretmanager.secretAccessor` on `noblesse-staging-database-url`.
- Secret value was not accessed/read.
- Secret version count remains 1.
- Cloud Run DB update, Cloud Run Job execution, schema migration execution, Firebase Auth/rewrite, and production write remain No-Go.
