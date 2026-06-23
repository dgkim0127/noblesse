# Admin Real Integration Master Plan

## Purpose

- Connect Secret Manager, staging PostgreSQL, and Firebase Auth in a controlled sequence.
- Keep production write and Firebase rewrite blocked until staging verification passes.
- Prevent frontend direct DB access.
- Prevent secrets from entering repo, docs, frontend, or logs.

## Current State

- health-only Cloud Run runtime: Go
- required APIs: Enabled
- DB: Not connected
- Secret Manager staging container: Created with no value/version
- Cloud SQL Admin API: Enabled
- Cloud SQL connection architecture: Option A recommended, documented
- Backend DB pool socket support: Implemented in config/tests only
- Staging Cloud SQL resource: Not created; revised tier candidate documented
- Firebase Auth backend integration: Not implemented
- admin bootstrap: Not executed
- staging admin_memo write: Not executed
- Firebase /api rewrite: Absent
- production write: No-Go

## Current Approval Scope

Allowed in 32L:

- read-only project/resource boundary audit
- master integration plan documentation
- DB provider decision documentation

Blocked in 32L:

- Secret Manager secret creation beyond the approved staging container
- secret version addition
- runtime secret IAM grant
- staging DB creation
- schema migration execution
- Cloud Run DB secret update
- Firebase Auth code integration
- Firebase Admin runtime IAM
- admin bootstrap
- staging admin_memo write
- Firebase /api rewrite
- Firebase deploy
- production admin write

## Project / Resource Boundary Audit

Read-only audit result:

- active Google Cloud project configured: Yes
- active account present: Yes
- real project id recorded: No
- real account email recorded: No
- Cloud Run health-only service exists: Yes
- region is asia-northeast3: Yes
- service ready: Yes
- dedicated runtime identity assigned: Yes
- raw service URL recorded: No
- raw runtime service account email recorded: No
- Firebase hosting target is noblesse: Yes
- public directory is dist: Yes
- /api rewrite is absent: Yes
- .firebaserc noblesse target maintained: Yes
- other Cloud Run services present in the active project: No
- POS/default Firebase site remains untouched: Unknown from read-only audit
- Cloud Run service and Noblesse hosting target are intentionally scoped: Yes
- active project name suggests shared POS/default resource risk: Yes

Boundary judgment:

- Project/resource isolation is acceptable for the existing health-only service because the service name, runtime identity, and Firebase hosting target are Noblesse-scoped.
- Project/resource isolation is not sufficient to start new Secret Manager, DB, IAM, or Firebase rewrite mutations without a separate resource-boundary approval.
- If the active project also hosts POS/default resources, every new secret, DB, service account, and rewrite must use Noblesse-specific naming and must be reviewed before creation.
- All new cloud mutations remain No-Go until the next approval flag is explicitly enabled.

## Required Sequence

1. Resource/project boundary approval
2. Secret Manager and least-privilege IAM
3. Staging DB provider and schema
4. Staging DB URL secret version
5. Cloud Run staging DB secret injection
6. DB read-only smoke
7. Firebase Auth backend verification
8. Admin bootstrap
9. Staging admin_memo write + audit_logs
10. Firebase Hosting /api rewrite
11. Production rollout approval

## Why All Three Are Required

Secret Manager:

- protects DB credentials
- supports IAM and rotation
- contains no business data

Database:

- stores users, products, inquiries, admin_memo, audit_logs
- provides role/status authorization data

Firebase Auth:

- verifies user identity
- provides uid
- does not replace PostgreSQL role/status authorization

## Non-negotiable Boundary

- identity comes from Firebase Auth
- authorization comes from PostgreSQL users.auth_uid/role/status
- DB credentials come from Secret Manager
- all writes go through Cloud Run backend
- frontend never accesses PostgreSQL directly

## DB Provider Decision

Recommended provider:

- Cloud SQL PostgreSQL for the primary staging-to-production path after resource-boundary approval.

Reason:

- Cloud Run, Secret Manager, and the current runtime service are already in Google Cloud.
- Cloud SQL keeps IAM, region selection, monitoring, backup/restore, and operational ownership in one cloud boundary.
- The first real integration path needs clear runtime/secret/database ownership more than maximum provider flexibility.
- Same-region planning with the Cloud Run service is possible.
- Staging and production can be separated with distinct instances or databases once approved.

Fallback:

- Approved managed PostgreSQL fallback remains acceptable if the operator prioritizes lower early staging cost and faster database setup over Google Cloud integration.
- Fallback providers still require provider-specific backup, pooling, region, security, and secret-rotation review.

Decision constraints:

- No actual DB is created in 32L.
- No provider account, DB identifier, connection string, password, or price quote is recorded.
- Staging and production must remain separated regardless of provider.

## Secret Manager / IAM Plan

32L-1 result:

- Staging secret container `noblesse-staging-database-url` is created.
- Replication is automatic.
- Labels are `app=noblesse`, `env=staging`, and `purpose=database-url`.
- No secret value/version was added.
- No IAM was changed.
- No DB, Cloud Run, Firebase Auth, Firebase rewrite, or deploy change was made.
- Result is documented in `docs/ADMIN_STAGING_SECRET_CONTAINER_REPORT.md`.

Next cloud mutation candidate after approval:

- create or prepare the staging DB resource boundary before any secret value/version

Approval required:

- `APPROVE_STAGING_DB_CREATE = YES`

Rules:

- keep the existing staging secret container value-less until the staging DB is approved
- do not add a secret value/version
- do not create production secret
- do not grant runtime IAM yet
- do not record secret value
- do not grant project-wide Secret Manager access

Expected resource/cost class:

- existing metadata-only secret container; no DB, no runtime traffic, no production data

Rollback impact:

- secret container can be deleted later if explicitly approved
- no application traffic should depend on it until a secret version and runtime reference are separately approved

## Staging DB Plan

32L-2 result:

- Staging Cloud SQL connection decision is documented in `docs/ADMIN_STAGING_CLOUD_SQL_CONNECTION_DECISION.md`.
- Recommended path is Cloud Run native Cloud SQL connection with Unix socket.
- Cloud SQL Admin API is currently missing and was not enabled.
- Existing Cloud SQL instance status is unknown because Cloud SQL Admin API is missing.
- Backend pool socket support is not implemented.
- Staging secret container remains value-less with zero versions.
- No DB, IAM, Cloud Run, Firebase, backend code, SQL, or package change was made.

32L-3 result:

- Cloud SQL Admin API enablement is documented in `docs/ADMIN_CLOUD_SQL_ADMIN_API_ENABLEMENT_REPORT.md`.
- Cloud SQL Admin API changed from Missing to Enabled.
- Existing Cloud SQL instances are present in the configured project, but the Noblesse staging-named candidate is not present.
- Raw instance names, IP addresses, connection names, project id, and account email are not recorded.
- No Cloud SQL instance/database/user was created.
- No IAM, DB connection, SQL, migration, secret version, Cloud Run update, Firebase rewrite, or production write was performed.

32L-4 result:

- Backend DB config supports `DB_CONNECTION_MODE=tcp` and `DB_CONNECTION_MODE=cloudsql-socket`.
- `CLOUD_SQL_INSTANCE_CONNECTION_NAME` is server-only config and is required for production strict socket mode.
- Pool max, connection timeout, and idle timeout options are parsed and tested.
- Cloud SQL socket pool config is tested without opening a DB connection.
- No Cloud SQL instance/database/user, IAM, SQL, migration, secret version, Cloud Run update, Firebase rewrite, or production write was performed.

32L-5 result:

- Staging Cloud SQL resource attempt is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- Instance creation was attempted with the approved staging spec and blocked by approved tier/machine type availability.
- Target staging instance does not exist after the attempt.
- Staging database was not created.
- No DB user/password, IAM, DB connection, SQL, migration, secret version, Cloud Run update, Firebase rewrite, or production write was performed.

32L-5R result:

- Revised staging tier plan is documented in `docs/ADMIN_STAGING_DB_TIER_REVISION_PLAN.md`.
- First revised candidate is `db-g1-small`.
- Fallback is `db-custom-1-3840` if shared-core is blocked.
- No automatic tier/version substitution is allowed.
- No Cloud SQL instance/database/user, DB connection, IAM, SQL, migration, secret version, Cloud Run update, Firebase rewrite, or production write was performed.

Approval required:

- `APPROVE_STAGING_DB_CREATE_REVISED = YES`
- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`

Rules:

- staging only
- synthetic data only
- no production customer data
- Cloud Run native Cloud SQL socket connection is the preferred staging path
- direct public TCP is not recommended for first staging rollout
- revised candidate is `db-g1-small`, but another create attempt requires explicit approval
- no production DB
- no schema migration before provider, reset, and backup/restore path are approved
- runtime DB role must not be a superuser

Minimum schema readiness:

- users
- buyers
- categories
- products
- product_prices
- inquiries
- inquiry_items
- audit_logs
- inquiries.admin_memo
- users.auth_uid
- users.role
- users.status

## DB Secret Version / Cloud Run Link Plan

Approval required:

- `APPROVE_SECRET_MANAGER_VERSION_ADD = YES`
- `APPROVE_RUNTIME_SECRET_IAM = YES`
- `APPROVE_CLOUD_RUN_DB_SECRET_UPDATE = YES`

Rules:

- DB URL value must never be printed, committed, or pasted into docs.
- Cloud Run must receive the DB URL only by Secret Manager reference.
- Health-only mode may stay enabled during staging transition.
- Firebase credentials remain absent until Firebase Auth integration is separately approved.

## Firebase Auth Backend Plan

Approval required:

- `APPROVE_FIREBASE_AUTH_CODE_INTEGRATION = YES`
- `APPROVE_FIREBASE_ADMIN_RUNTIME_IAM = YES` if runtime IAM adjustment is required

Rules:

- prefer runtime identity / Application Default Credentials
- do not use committed service account JSON
- do not trust frontend viewerState for admin role/status
- map decoded Firebase uid to PostgreSQL users.auth_uid
- require users.role = admin and users.status = approved

Failure contract:

- no token -> 401
- invalid token -> 401
- uid not found -> 403
- buyer role -> 403
- pending admin -> 403
- blocked admin -> 403
- approved admin -> allowed for approved scope only

## Admin Bootstrap Plan

Approval required:

- `APPROVE_ADMIN_BOOTSTRAP = YES`

Rules:

- staging identity only until production rollout is separately approved
- no public bootstrap endpoint
- actual uid/email must not be recorded in docs
- disable path must be known before staging write

## Staging admin_memo Write Plan

Approval required:

- `APPROVE_STAGING_ADMIN_MEMO_WRITE = YES`

Required before execution:

- staging DB connected
- Firebase Auth verification working
- staging admin bootstrapped
- safe synthetic inquiry exists
- rollback/disable path ready

Expected verification:

- audit_logs count before
- PATCH admin_memo
- inquiry.admin_memo changed
- auditLogId returned
- audit_logs count after
- latest action = admin.inquiry.memo.update
- requestId present

## Firebase Hosting /api Rewrite Plan

Approval required:

- `APPROVE_FIREBASE_API_REWRITE = YES`
- `APPROVE_FIREBASE_DEPLOY = YES`

Rules:

- Cloud Run DB/Auth staging verification must pass first.
- Staging admin_memo dry-run must pass first.
- Firebase target must remain noblesse.
- public directory must remain dist.
- POS/default site protection must be reviewed.
- Production write remains disabled unless separately approved.

## Production Write Boundary

Production write remains No-Go until:

- staging DB/Auth/Secret integration passes
- staging admin_memo write passes
- Firebase rewrite/rollback passes
- production DB and secret strategy are separately approved
- `APPROVE_PRODUCTION_ADMIN_WRITE = YES`

Still blocked:

- production admin_memo
- status write
- buyer write
- product write
- price write
- quote write
- hard delete
- payment/checkout/order routes

## Related Documents

- `docs/ADMIN_CLOUD_RUN_HEALTH_ONLY_OPERATIONS_AUDIT.md`
- `docs/ADMIN_CLOUD_RUN_HEALTH_ONLY_DEPLOY_REPORT.md`
- `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`
- `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`
- `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`
- `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`
- `docs/ADMIN_BOOTSTRAP_PLAN.md`
- `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`
- `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`
- `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- `docs/BACKEND_API_BOUNDARY.md`

## Current Stop Point

Completed safe phases:

- Phase A read-only project/resource boundary audit
- Phase B master integration plan
- Phase C DB provider decision documentation
- Phase D staging Secret Manager container creation with zero versions
- Phase E staging Cloud SQL instance/database creation

First blocked approval gate:

- `APPROVE_SCHEMA_MIGRATION_EXECUTION = NO`
- `APPROVE_RUNTIME_SECRET_IAM = NO`

Next approval needed:

- Approve schema migration execution through a controlled staging path.
- Approve runtime Secret Manager accessor IAM before Cloud Run can consume the staging secret.

No-Go remains:

- Secret Manager version addition
- DB user/password creation
- schema migration
- IAM change
- Cloud Run update
- Firebase Auth code integration
- bootstrap
- staging write
- Firebase rewrite/deploy
- production write

## 32L-6 Staging Cloud SQL Resource

- Staging Cloud SQL resource creation result is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- The approved staging instance/database now exist for future integration gates.
- DB user/password, schema migration, Secret Manager version addition, Cloud SQL Client IAM, Cloud Run DB update, Firebase Auth/rewrite, and production write remain blocked.

## 32L-7 Cloud SQL Client IAM

- Cloud SQL Client IAM grant result is documented in `docs/ADMIN_CLOUD_SQL_CLIENT_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity has `roles/cloudsql.client`.
- DB user/password creation, schema migration, Secret Manager version addition, Cloud Run DB update, Firebase Auth/rewrite, and production write remain blocked.

## 32L-8 DB User / Secret Handoff

- Staging DB user and secret handoff result is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- Staging DB user exists, but the first staging secret version was not added.
- Password and DB URL were not recorded.
- Recovery approval is required before any password reset/delete/recreate or secret version addition.
- Schema migration, Runtime Secret IAM, Cloud Run DB update, Firebase Auth/rewrite, and production write remain blocked.

## 32L-8R DB User Secret Recovery

- Recovery result is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_RECOVERY_REPORT.md`.
- Existing staging DB user password reset: Go.
- First staging database URL secret version: Go.
- Password and DB URL recorded: No.
- Schema migration, Runtime Secret IAM, Cloud Run DB update, Firebase Auth/rewrite, and production write remain blocked.

## 32L-9 Staging Schema Migration Path Decision

- Migration execution path decision is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Recommended path: Cloud Run Job / one-off migration runner.
- Direct local Codex psql, direct secret value read, and public migration endpoints are No-Go.
- Next gate is migration runner implementation, not migration execution.

## 32L-10 Staging Schema Migration Runner

- Migration runner implementation is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Backend runner and fake-pool tests were added.
- Runner is transaction-managed and guarded by `ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER=true`.
- Cloud Run Job packaging/execution, secret access, DB connection, schema migration execution, Runtime Secret IAM, Cloud Run DB update, Firebase rewrite, and production write remain blocked.

## 32L-11 Runtime Secret IAM

- Runtime secret IAM grant result is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity can access only the staging DB URL secret at secret-resource scope.
- Secret value was not accessed/read, and secret version count remains 1.
- Cloud Run DB update, Cloud Run Job execution, schema migration execution, Firebase Auth/rewrite, and production write remain blocked.

## 32L-12 Cloud Run Migration Job Packaging

- Cloud Run migration job packaging result is documented in `docs/ADMIN_CLOUD_RUN_MIGRATION_JOB_PACKAGING_REPORT.md`.
- A staging migration job resource was created for future execution.
- The job was not executed and schema migration was not executed.
- Cloud Run app DB update, Firebase Auth/rewrite, and production write remain blocked.

## 32L-13 Migration Job Execution

- Migration job execution result is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_EXECUTION_REPORT.md`.
- The approved migration job was executed once, but it did not complete successfully.
- No retry/re-execution, local psql, manual SQL, Cloud Run app update, Firebase rewrite, or production write was performed.
- Recovery approval is required before any further migration attempt.

## 32L-13R Recovery Diagnosis

- Recovery diagnosis is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_RECOVERY_DIAGNOSIS.md`.
- Failure category is IAM/permission before migration runner start.
- Job config appears structurally correct, but the execution did not reach Node or the migration runner.
- Next gate is `APPROVE_MIGRATION_IAM_FIX = YES`.

## N38-A4 RBAC Lifecycle Migration Idempotency

- Idempotency report: `docs/ADMIN_RBAC_MIGRATION_IDEMPOTENCY_REPORT.md`.
- The N38 lifecycle migration now preserves canonical `account_status`, `verification_status`, and existing admin roles on repeated runs.
- The schema migration runner now uses `public.app_schema_migrations` with a SHA-256 checksum ledger.
- Repeated execution with the same migration name/checksum is a no-op; checksum mismatch fails before schema SQL execution.
- No DB connection, psql, Cloud Run Job execution, deploy, secret access, or production data mutation happened in N38-A4.

## N38-B1 RBAC Migration Job Repackage

- Repackage report: `docs/ADMIN_RBAC_MIGRATION_JOB_REPACKAGE_REPORT.md`.
- Cloud Build and existing staging migration Job update completed for the idempotent N38 lifecycle migration package.
- The migration Job now pins the staging DB URL secret to a specific enabled version.
- Job execution, schema migration execution, DB connection, Cloud Run app deploy, Firebase deploy, and production mutation did not happen.
- Next gate is `APPROVE_STAGING_RBAC_MIGRATION_EXECUTION = YES`.

## N38-B2 RBAC Migration Execution

- Execution report: `docs/ADMIN_STAGING_RBAC_MIGRATION_EXECUTION_REPORT.md`.
- Existing staging migration Job was executed exactly once and completed successfully.
- Migration committed: Yes.
- Already applied: No.
- Checksum mismatch: No.
- No retry, Job redeploy, Cloud Build, direct operator DB connection, local psql, secret value access, Cloud Run app deploy, Firebase deploy, or production mutation happened.
- Schema/owner verification, runtime DB privilege hardening, app DB rollout, and production rollout remain separate No-Go gates.
- Next gate is `APPROVE_STAGING_RBAC_MIGRATION_IDEMPOTENCY_RECHECK = YES`.

## N38-B3 RBAC Migration Idempotency Recheck

- Idempotency recheck report: `docs/ADMIN_STAGING_RBAC_MIGRATION_IDEMPOTENCY_RECHECK_REPORT.md`.
- Same staging migration Job was executed exactly once after the first committed run.
- alreadyApplied: true.
- Schema migration committed again: No.
- Lifecycle schema SQL re-executed: No.
- Checksum mismatch: No.
- No retry, Job redeploy, Cloud Build, direct operator DB connection, local psql, secret value access, Cloud Run app deploy, Firebase deploy, or production mutation happened.
- Migration idempotency: Go.
- Schema/owner verification, runtime DB privilege hardening, app DB rollout, and production rollout remain separate No-Go gates.
- Next gate is `APPROVE_STAGING_RBAC_SCHEMA_AND_OWNER_VERIFICATION = YES`.

## N38-B4 RBAC Schema / Owner Verification

- Schema/owner verification report: `docs/ADMIN_STAGING_RBAC_SCHEMA_OWNER_VERIFICATION_REPORT.md`.
- A separate Cloud Run verification Job ran read-only SELECT checks against staging exactly once.
- Existing staging migration Job was not executed and remained at execution count 12.
- Ledger/checksum, required schema objects, buyer lifecycle backfill counts, admin profile/owner coverage, and permission override invariants passed.
- Runtime DB privilege hardening, application rollout, Firebase deploy, and production rollout remain No-Go.
- Next gate is `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING = YES`.

## N38-B5 Staging Runtime DB Privilege Hardening

- Runtime privilege hardening report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING_REPORT.md`.
- Backend hardening/verifier source and fake-pool tests were added and pushed.
- DB Job identity separation completed for staging migration and RBAC verification Jobs without re-executing those Jobs.
- Application identity migration-secret access was removed.
- The approved runtime hardening Job was executed exactly once but failed with NonZeroExitCode.
- Runtime DB user, runtime secret, runtime privilege verifier Job, Cloud Run app deploy, Firebase deploy, and production rollout were not performed.
- Next gate is `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS = YES`.

## N38-B5R Runtime Privilege Recovery Diagnosis

- Recovery diagnosis report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS.md`.
- Diagnostic runner source commit: `065ae2931`.
- Diagnostic Cloud Run Job ran read-only checks exactly once.
- Migration Job execution count remained 12.
- RBAC verification Job execution count remained 1.
- Failed hardening Job execution count remained 1.
- Classification: B - database/schema ownership or runtime role setup failure.
- Runtime group role exists: No.
- Expected runtime privilege checks missing: 36 of 36.
- Atomicity issue identified: hardener validation currently happens after commit; recovery must validate before commit and rollback on failed checks.
- Runtime DB user creation, runtime secret creation, Cloud Run application deploy, Firebase deploy, and production rollout remain blocked.
- Next gate is `APPROVE_STAGING_RUNTIME_PRIVILEGE_HARDENER_FIX_AND_RERUN = YES`.

## N38-B5F Runtime Privilege Hardener Recovery

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_PRIVILEGE_HARDENER_RECOVERY_REPORT.md`.
- Hardener fix commit: `6b6daece82ef875c987031545ec1eb58fe37974f`.
- Ownership-aware preflight and validation-before-commit were added.
- Hardening Job was updated and executed exactly once.
- Hardening Job result: Success.
- Runtime role created: Yes.
- Expected runtime privilege missing count: 0.
- Unexpected runtime privilege count: 0.
- Migration ledger access: No.
- Runtime DB user creation, runtime secret creation, runtime verifier, application deploy, Firebase deploy, and production rollout remain blocked.
- Next gate is `APPROVE_STAGING_RUNTIME_DB_USER_AND_SECRET_CREATE = YES`.

## N38-B6 Runtime DB User Secret Follow-up

- Runtime DB user/secret handoff report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_REPORT.md`.
- Runtime secret container created: Yes, with zero versions.
- Runtime DB login user created: No.
- Application runtime secretAccessor grant: No.
- DB login/query and runtime verifier execution: No.
- Application/Firebase deploy and production mutation: No.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

## N38-B6R2 Runtime DB User Secret Recovery Follow-up

- Runtime DB user/secret recovery completion report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_COMPLETION_REPORT.md`.
- Password reset attempted: Yes, exactly once.
- Password reset result: Failed.
- Runtime secret version added: No.
- DB login/query and runtime verifier execution: No.
- Application/Firebase deploy and production mutation: No.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_DIAGNOSIS = YES`.

## N38-B6R Runtime DB User Secret Recovery Follow-up

- Runtime DB user/secret recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_REPORT.md`.
- Runtime DB login user created: Yes.
- Runtime secret version added: No.
- Application runtime secretAccessor grant: No.
- DB login/query and runtime verifier execution: No.
- Application/Firebase deploy and production mutation: No.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.
