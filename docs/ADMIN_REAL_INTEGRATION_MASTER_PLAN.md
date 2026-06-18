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

Approval required:

- `APPROVE_STAGING_DB_CREATE = YES`
- `APPROVE_SCHEMA_MIGRATION_EXECUTION = YES`

Rules:

- staging only
- synthetic data only
- no production customer data
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

First blocked approval gate:

- `APPROVE_SECRET_MANAGER_SECRET_CREATE = NO`

Next approval needed:

- Decide whether to approve creation of the staging-only Secret Manager secret container candidate.
- Reconfirm resource boundary before creating anything because the active project may share POS/default resources.

No-Go remains:

- Secret Manager mutation
- staging DB creation
- secret version addition
- IAM change
- Cloud Run update
- Firebase Auth code integration
- bootstrap
- staging write
- Firebase rewrite/deploy
- production write
