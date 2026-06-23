# Admin Production DB Migration Plan

## Purpose

- Plan production PostgreSQL provider, schema migration, backup/restore, staging clone, and DB rollout boundaries before enabling admin_memo in production.
- Convert 32J-1 and 32J-2 infrastructure decisions into a database-specific plan.
- Keep production DB creation, DB connection, SQL execution, schema changes, migrations, Auth integration, rewrite, and deploy blocked.
- This step is docs-only.

## Current Decision Status

- Production DB planning: Go
- Production DB creation: No-Go
- Production SQL execution: No-Go
- Production DB/Auth integration: No-Go
- Firebase Hosting /api rewrite: No-Go
- Production admin_memo rollout: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- docs/ADMIN_PRODUCTION_INFRA_DECISION.md
- docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md
- docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md
- docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md
- docs/ADMIN_WRITE_API_CONTRACT.md
- docs/ADMIN_WRITE_SAFETY_GATES.md
- supabase/schema.sql
- supabase/VALIDATION_NOTES.md

## Production DB Provider Options

Options:

- Cloud SQL PostgreSQL
- Approved managed PostgreSQL fallback
- Local PostgreSQL is not production
- Frontend Supabase client is not allowed for admin writes

Recommended direction:

- Select one approved production PostgreSQL provider.
- Prefer a provider that:
  - supports secure backend runtime connectivity
  - supports backup/restore
  - supports least-privilege credential management
  - can be accessed from Cloud Run or equivalent backend runtime
  - can be managed without exposing connection string in frontend, GitHub, docs, or chat

Current status:

- provider not selected
- production DB not created
- no DB connection made in 32J-3

No-Go:

- do not create Cloud SQL
- do not create Neon/Supabase production DB
- do not connect to production DB
- do not run SQL

## Recommended DB Direction

Recommended:

- Use Cloud SQL PostgreSQL if Google Cloud operational path is preferred.
- Use another approved managed PostgreSQL only if it satisfies:
  - secure secret storage
  - backend-only access
  - backup/restore
  - auditability
  - staging clone support
  - no frontend secret exposure

Reason:

- Admin writes need server-side transaction control.
- Admin writes need same-transaction audit_logs.
- Production DB must be reachable from backend runtime, not frontend.
- Existing local dry-run only proves transaction path, not production readiness.

Decision still required:

- final provider
- region
- instance size/cost boundary
- backup retention
- network access model
- migration process owner

## Schema Migration Process

Current:

- supabase/schema.sql exists as schema scaffold/reference.
- 32I proved admin_memo write against local DB.
- Production schema migration process is not implemented.

Required future process:

1. Review current schema.
2. Define migration format.
3. Define migration execution owner.
4. Define migration review process.
5. Define rollback or restore approach.
6. Apply schema to staging/clone first.
7. Verify core tables:
   - users
   - buyers
   - products
   - categories
   - product_prices
   - inquiries
   - inquiry_items
   - audit_logs
8. Verify admin_memo column exists.
9. Verify audit_logs fields match backend query path.
10. Only then allow production DB readiness testing.

No-Go in 32J-3:

- no migration file creation
- no schema.sql modification
- no SQL execution
- no psql

## Migration Ownership / Approval

Required:

- migration owner identified
- reviewer identified
- execution environment identified
- rollback/restore owner identified
- production approval gate documented

Rules:

- no ad-hoc production SQL
- no unreviewed schema drift
- no SQL copied from chat into production without review
- no secret in migration files
- no frontend direct DB access

Current status:

- planning only
- not assigned in 32J-3

## Backup / Restore Plan

Required before production write:

- automated backup enabled
- manual backup before first production write rollout
- restore procedure documented
- restore tested in staging or disposable clone
- audit_logs preservation policy
- point-in-time recovery decision if provider supports it

Rules:

- do not enable production write without restore confidence
- do not hard delete admin records in first phase
- keep audit_logs append-only

Current status:

- planning only
- not implemented

## Staging / Production-like Clone Plan

Required:

- staging DB or disposable production-like clone
- same schema as production target
- seeded with safe non-sensitive sample data
- admin_memo dry-run repeated against staging/clone
- audit_logs verified
- rollback behavior verified

Rules:

- no real customer data unless explicitly approved and sanitized
- no production write before staging/clone verification
- no secret recorded in docs/GitHub/chat

Current status:

- planning only
- not created

32L-2 update:

- Staging Cloud SQL connection decision is documented in `docs/ADMIN_STAGING_CLOUD_SQL_CONNECTION_DECISION.md`.
- Recommended staging topology is Cloud Run native Cloud SQL connection with Unix socket.
- Cloud SQL Admin API was enabled in 32L-3 and documented in `docs/ADMIN_CLOUD_SQL_ADMIN_API_ENABLEMENT_REPORT.md`.
- Existing Cloud SQL instances are present in the configured project, but the Noblesse staging-named candidate is not present.
- Backend pool socket-mode config support was implemented in 32L-4 without DB connection.
- 32L-5 attempted the approved staging Cloud SQL creation and was blocked by approved tier/machine type availability.
- Target staging instance was not created.
- Staging database was not created.
- 32L-5R documents the revised tier plan in `docs/ADMIN_STAGING_DB_TIER_REVISION_PLAN.md`.
- First revised candidate is `db-g1-small`.
- Fallback candidate is `db-custom-1-3840` if shared-core is blocked.
- No automatic tier/version substitution is allowed.
- A revised create approval is required before retry.
- Staging DB creation remains No-Go.
- Schema migration execution remains No-Go.

## Data Seed / Bootstrap Boundary

Required future seed/bootstrap data:

- one approved admin user
- one buyer/trade account
- one inquiry
- audit_logs table available
- products/categories only if needed for read QA

Admin bootstrap:

- handled separately in Auth/admin bootstrap plan
- no public admin signup
- no frontend-created admin role

Rules:

- seed data must not contain real secrets
- seed data must not contain production customer data unless explicitly approved
- admin bootstrap must be auditable

Current status:

- planning only
- no seed inserted in 32J-3

## DB Access / Network Boundary

Production target:

- backend runtime accesses DB
- frontend never accesses DB directly
- DB credentials stored in Secret Manager or equivalent
- runtime service account has least-privilege secret access

Network model decision required:

- Cloud SQL connector or equivalent
- private IP vs public IP with restrictions
- allowed runtime identity
- connection pool strategy
- SSL/TLS requirements

No-Go:

- no DB access from browser
- no DATABASE_URL in frontend
- no broad public DB access
- no raw connection string in Firebase config

## DB Role / Permission Plan

Future required DB roles:

- application runtime role
- migration/admin role
- read-only inspection role if needed

Application runtime role:

- must be able to read/write only required application tables
- should not be database superuser
- should not own schema unless explicitly approved
- should support transaction writes to inquiries and audit_logs

Migration role:

- may apply schema changes
- should not be used by runtime

Current status:

- planning only
- no DB role created

## Production admin_memo DB Readiness

Before production admin_memo write:

- production DB provider selected
- schema applied through approved process
- audit_logs table verified
- inquiries.admin_memo verified
- backend transaction path verified against staging/clone
- secret injected server-side only
- Firebase admin auth verified
- admin bootstrap complete
- feature flag/disable path ready
- rollback/restore tested

Current status:

- not ready

Conclusion:

- local dry-run was successful
- production DB readiness remains No-Go

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-3 Judgment |
| --- | --- | --- | --- |
| Production DB provider | Cloud SQL or approved managed PostgreSQL | Not selected | Plan only |
| Schema migration process | Reviewed migration process | Not implemented | Plan only |
| Backup/restore | Automated + manual backup before rollout | Not implemented | Plan only |
| Staging clone | Required before production write | Not created | Plan only |
| Runtime DB role | Least-privilege app role | Not created | Plan only |
| Migration role | Separate migration/admin role | Not created | Plan only |
| Production admin_memo write | First write candidate only | Local proof only | No-Go |
| Status/buyer/product/price/quote writes | Later phases | Blocked | No-Go |

## Recommended Next Phases

### 32J-4

Secret Manager plan:

- secret names
- access policy
- local vs production separation
- service account access
- no secret values

### 32J-5

Firebase Auth admin verification plan:

- Firebase Admin SDK runtime strategy
- ID token verification
- users.auth_uid mapping
- admin bootstrap

### 32J-6

Admin bootstrap plan:

- controlled first admin
- disable/rollback
- no public signup

### 32J-7

Staging or production-like admin_memo dry-run plan

### 32J-8

Firebase Hosting /api rewrite plan

Important:

- Do not jump directly to production DB creation.
- Do not enable production write before runtime, secret, Auth, and staging/clone verification.

## 32J-4 Production Secret Manager Plan Follow-up

- Production secret management planning is documented in `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`.
- DB readiness requires Secret Manager or equivalent storage for DATABASE_URL.
- No secret was created in 32J-4.
- Production DB readiness remains No-Go.

## 32J-5 Admin Firebase Auth Verification Plan Follow-up

- Firebase Auth admin verification planning is documented in `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`.
- Production admin auth requires users.auth_uid mapping and admin bootstrap before DB write rollout.
- Production DB write readiness remains No-Go until Auth, secret, runtime, staging, and rollback gates are satisfied.

## 32J-6 Admin Bootstrap Plan Follow-up

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- Future bootstrap must use an approved migration/DB execution path and must not create a public admin signup path.
- No admin user, DB insert/update, SQL execution, migration file, bootstrap script, Firebase Auth integration, rewrite, or deploy was added in 32J-6.

## 32J-7 Admin Staging Memo Dry-run Plan Follow-up

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- A staging/prod-like clone remains required before production admin_memo write rollout.
- No staging DB, clone, SQL execution, schema/migration change, production DB connection, rewrite, or deploy was added in 32J-7.

## 32J-8 Admin Firebase API Rewrite Plan Follow-up

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Rewrite must not be added before production DB and staging/prod-like dry-run gates are satisfied.
- No DB connection, SQL execution, schema/migration change, Firebase config change, rewrite, or deploy was added in 32J-8.

## 32J-9 Admin Production Rollout Checklist Follow-up

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- The production DB/migration gate remains No-Go in the rollout checklist.
- No DB creation/connection, SQL execution, schema/migration change, rewrite, or deploy was added in 32J-9.

## 32L-6 Staging Cloud SQL Resource Follow-up

- Staging Cloud SQL instance/database creation is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- This is a staging resource gate only and does not approve production DB creation.
- DB user/password, schema migration, Secret Manager version addition, Cloud Run DB update, Firebase rewrite, and production admin writes remain No-Go.

## 32L-7 Cloud SQL Client IAM Follow-up

- Cloud SQL Client IAM grant is documented in `docs/ADMIN_CLOUD_SQL_CLIENT_IAM_REPORT.md`.
- This prepares Cloud SQL socket access for the dedicated runtime identity only.
- DB user/password, DB connection, schema migration, Secret Manager version addition, Cloud Run DB update, Firebase rewrite, and production admin writes remain No-Go.

## 32L-8 Staging DB User / Secret Follow-up

- Staging DB user and secret handoff is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- Staging DB user creation: Yes.
- Secret version addition: No.
- Password and DB URL recorded: No.
- Schema migration remains No-Go until secret recovery and a separate migration approval are completed.

## 32L-8R Staging DB User Secret Recovery Follow-up

- Recovery is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_RECOVERY_REPORT.md`.
- First staging database URL secret version: Go.
- Password and DB URL recorded: No.
- Schema migration remains No-Go until a separate migration approval is completed.

## 32L-9 Staging Schema Migration Path Decision Follow-up

- Staging migration path decision is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Recommended path: Cloud Run Job / one-off migration runner.
- Local Codex psql and direct secret value read are not recommended.
- Public migration endpoint is No-Go.
- Migration execution remains No-Go until the migration runner and execution gates are approved.

## 32L-10 Staging Schema Migration Runner Follow-up

- Staging migration runner implementation is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Runner manages transaction begin/commit/rollback and sanitizes result/error output.
- Tests use fake pool/client only.
- No schema migration execution, DB connection, secret access, Cloud Run Job execution, or production migration happened in 32L-10.

## 32L-11 Runtime Secret IAM Follow-up

- Runtime secret IAM grant is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity has secret-level access to the staging DB URL secret.
- Secret value was not accessed/read.
- Secret version count remains unchanged at 1.
- Cloud Run Job packaging/execution and schema migration execution remain No-Go until separately approved.

## 32L-12 Cloud Run Migration Job Packaging Follow-up

- Cloud Run migration job packaging is documented in `docs/ADMIN_CLOUD_RUN_MIGRATION_JOB_PACKAGING_REPORT.md`.
- The staging migration job resource exists and is configured for the guarded migration runner.
- Job execution: No.
- Schema migration execution: No.
- Cloud Run app DB update and production migration remain No-Go.

## 32L-13 Migration Job Execution Follow-up

- Staging schema migration execution report: `docs/ADMIN_STAGING_SCHEMA_MIGRATION_EXECUTION_REPORT.md`.
- Job execution created: Yes.
- Job execution succeeded: No.
- Migration committed: No.
- Schema migration is No-Go pending recovery.
- Production migration and production write remain No-Go.

## 32L-13R Recovery Diagnosis Follow-up

- Recovery diagnosis: `docs/ADMIN_STAGING_SCHEMA_MIGRATION_RECOVERY_DIAGNOSIS.md`.
- Failure category: B. IAM/permission issue before migration runner start.
- No re-execution, IAM change, DB connection, SQL execution, or secret value access happened.
- Production migration and production write remain No-Go.

## N38-A4 RBAC Lifecycle Migration Idempotency Follow-up

- Idempotency report: `docs/ADMIN_RBAC_MIGRATION_IDEMPOTENCY_REPORT.md`.
- The lifecycle migration is now designed so repeated execution does not re-derive canonical account, buyer verification, or admin role state from legacy fields.
- `public.app_schema_migrations` is added to the fresh-install schema as the migration runner ledger.
- The runner records `migration_name`, checksum, and `applied_at`; same checksum is already-applied, checksum mismatch is a safe failure.
- Production schema migration was not executed in this step.

## N38-B1 RBAC Migration Job Repackage Follow-up

- Repackage report: `docs/ADMIN_RBAC_MIGRATION_JOB_REPACKAGE_REPORT.md`.
- The staging migration Job was updated to the idempotent RBAC migration package.
- Cloud Build result: Success.
- Execution count unchanged after update.
- Staging schema migration execution: No.
- Production schema migration execution: No.
- Production DB rollout remains No-Go.

## N38-B2 RBAC Migration Execution Follow-up

- Execution report: `docs/ADMIN_STAGING_RBAC_MIGRATION_EXECUTION_REPORT.md`.
- Staging RBAC lifecycle migration executed once through the existing Cloud Run Job.
- Migration committed: Yes.
- Already applied: No.
- Checksum mismatch: No.
- Production schema migration execution: No.
- Production DB rollout remains No-Go.
- Next gate: `APPROVE_STAGING_RBAC_MIGRATION_IDEMPOTENCY_RECHECK = YES`.

## N38-B3 RBAC Migration Idempotency Recheck Follow-up

- Idempotency recheck report: `docs/ADMIN_STAGING_RBAC_MIGRATION_IDEMPOTENCY_RECHECK_REPORT.md`.
- Same staging RBAC lifecycle migration Job executed once more for the approved idempotency recheck.
- alreadyApplied: true.
- Schema migration committed again: No.
- Lifecycle schema SQL re-executed: No.
- Checksum mismatch: No.
- Production schema migration execution: No.
- Production DB rollout remains No-Go.
- Next gate: `APPROVE_STAGING_RBAC_SCHEMA_AND_OWNER_VERIFICATION = YES`.

## N38-B4 RBAC Schema / Owner Verification Follow-up

- Schema/owner verification report: `docs/ADMIN_STAGING_RBAC_SCHEMA_OWNER_VERIFICATION_REPORT.md`.
- Staging verification used a dedicated read-only Cloud Run Job, not the migration Job.
- Verification result: Go for staging schema, owner backfill, and lifecycle backfill.
- Production schema migration execution: No.
- Production DB rollout remains No-Go.
- Next gate: `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING = YES`.

## N38-B5 Runtime Privilege Hardening Follow-up

- Runtime privilege hardening report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING_REPORT.md`.
- Staging DB Job identity separation completed.
- Runtime hardening Job execution: No-Go, one execution failed with NonZeroExitCode.
- Runtime DB user creation: No.
- Runtime DB secret creation: No.
- Runtime privilege verification: No.
- Production schema migration execution: No.
- Production DB rollout remains No-Go.
- Next gate: `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS = YES`.

## N38-B5R Runtime Privilege Recovery Diagnosis Follow-up

- Recovery diagnosis report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS.md`.
- Read-only diagnostic Job execution: Success, exactly once.
- Classification: B - database/schema ownership or runtime role setup failure.
- Runtime group role exists: No.
- Expected runtime privilege checks missing: 36 of 36.
- Hardening retry, runtime user/secret creation, staging application DB rollout, and production schema migration remain No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_PRIVILEGE_HARDENER_FIX_AND_RERUN = YES`.

## N38-B5F Runtime Privilege Hardener Recovery Follow-up

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_PRIVILEGE_HARDENER_RECOVERY_REPORT.md`.
- Hardening Job update and one approved re-execution succeeded.
- Staging runtime privilege hardening: Go.
- Runtime user/secret creation and runtime verifier remain separate No-Go gates.
- Staging application DB rollout remains No-Go.
- Production schema migration execution: No.
- Production DB rollout remains No-Go.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_AND_SECRET_CREATE = YES`.

## N38-B6 Runtime DB User Secret Follow-up

- Runtime DB user/secret handoff report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_REPORT.md`.
- Staging runtime secret container exists but has zero versions.
- Staging runtime DB login user was not created.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Production DB migration and rollout remain unaffected.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

## N38-B6R2 Runtime DB User Secret Recovery Follow-up

- Runtime DB user/secret recovery completion report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_COMPLETION_REPORT.md`.
- Password reset attempted: Yes, exactly once.
- Password reset result: Failed.
- Staging runtime secret version added: No.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Production DB migration and rollout remain unaffected.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_DIAGNOSIS = YES`.

## N38-B6D Runtime DB Password Reset Diagnosis Follow-up

- Diagnosis report: `docs/ADMIN_STAGING_RUNTIME_DB_PASSWORD_RESET_DIAGNOSIS.md`.
- Diagnosis only; no staging password reset retry, secret version, IAM mutation, DB login/query, Job execution, application deploy, Firebase deploy, or production mutation occurred.
- Category: A - API_SUCCEEDED_LOCAL_WRAPPER_FAILED.
- Production DB migration and rollout remain unaffected.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_PASSWORD_RESET_WRAPPER_RECOVERY = YES`.

## N38-B6R Runtime DB User Secret Recovery Follow-up

- Runtime DB user/secret recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_REPORT.md`.
- Staging runtime DB login user created: Yes.
- Staging runtime secret version added: No.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Production DB migration and rollout remain unaffected.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

## N38-B6R3 Runtime DB Password Wrapper Recovery Follow-up

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_PASSWORD_WRAPPER_RECOVERY_REPORT.md`.
- Password reset command executed exactly once.
- Cloud SQL server-side operation result: Success.
- Staging runtime secret version add result: Not completed; enabled version count remains 0.
- Runtime secret IAM grant: Not executed.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Production DB migration and rollout remain unaffected.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.
