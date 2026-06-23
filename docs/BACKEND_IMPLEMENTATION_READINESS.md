# Backend Implementation Readiness

## Purpose

This document organizes the final provider and readiness decisions needed before Noblesse starts backend API implementation.

This step is documentation only. It does not create a backend API, connect Auth, create a production database, run SQL, add package dependencies, or change Firebase configuration.

The goal is to make the next implementation decision explicit before any provider resources or code are added.

## Current Recommendation

Recommended v1 candidate:

- API hosting: Cloud Run behind Firebase Hosting rewrite
- Auth: Firebase Auth as identity provider
- Business authorization: PostgreSQL `users` and `buyers` loaded by the backend
- PostgreSQL provider: Cloud SQL if Google Cloud operations are acceptable; Neon if simpler managed PostgreSQL operations are preferred

This recommendation is provisional. Cost, region, backup, monitoring, and operator comfort must be confirmed before production implementation.

Backend stack decision gate is documented in `docs/BACKEND_STACK_DECISION_GATE.md`.

Human/operator choices are recorded in `docs/BACKEND_HUMAN_DECISION_RECORD.md`.

Next step is a backend scaffold plan, not implementation.

Selected implementation candidate is Cloud Run + Firebase Auth email/password first + Cloud SQL primary / Neon fallback + Express + `pg` direct + raw SQL files first.

Phase 1 scaffold plan is documented in `docs/BACKEND_PHASE1_SCAFFOLD_PLAN.md`.

Provider resources are still not created. The 26B local Phase 1 scaffold now exists and is limited to health check, catalog product reads, product detail read, and buyer profile read.

Next step is local test and route QA for the scaffold. Provider resource creation, Firebase rewrite changes, production DB creation, and sensitive write APIs remain blocked.

26C status: Phase 1 route contract and mock QA are completed for the current scaffold. Next validation should focus on local route QA without provider resources.

26D status: Local runtime smoke QA is completed for `/api/health` and documented in `docs/BACKEND_LOCAL_RUNTIME_QA.md`. Next step should be local DB-backed read QA or a frontend API client plan, not provider deployment.

31A status: Admin MVP scope is documented in `docs/ADMIN_MVP_SCOPE.md`. Real admin implementation remains blocked until backend/auth/DB readiness is complete. Existing admin preview screens are not real admin security.

31C status: Admin read-only API contract planning is documented in `docs/ADMIN_READ_ONLY_API_CONTRACT.md`. Implementation still requires backend/auth/DB readiness and must stay read-only until status write strategy is approved.

31D status: Admin read-only backend scaffold planning is documented in `docs/ADMIN_READ_ONLY_BACKEND_SCAFFOLD_PLAN.md`. Implementation still needs explicit approval and must begin with mock auth/mock DB tests only.

32L-1 status: Noblesse staging Secret Manager container `noblesse-staging-database-url` is created with automatic replication and staging labels only. No secret value/version, IAM grant, DB connection, Cloud Run update, Firebase rewrite, or deploy change was made. Next implementation readiness gate is staging DB resource approval before any secret version is added.

32L-2 status: Staging Cloud SQL connection architecture is documented in `docs/ADMIN_STAGING_CLOUD_SQL_CONNECTION_DECISION.md`. Recommended path is Cloud Run native Cloud SQL connection with Unix socket. Cloud SQL Admin API is currently missing, backend pool socket support is not implemented, and staging DB creation remains blocked until API enablement and socket-mode support are separately approved.

32L-3 status: Cloud SQL Admin API enablement is documented in `docs/ADMIN_CLOUD_SQL_ADMIN_API_ENABLEMENT_REPORT.md`. API enablement is complete, but backend pool socket support is still not implemented. Staging DB creation, IAM, migration, secret version addition, Cloud Run DB update, Firebase rewrite, and production write remain blocked.

32L-4 status: Backend DB pool socket-mode support is implemented and tested without DB connection. Server-only config now supports `DB_CONNECTION_MODE=tcp`, `DB_CONNECTION_MODE=cloudsql-socket`, `CLOUD_SQL_INSTANCE_CONNECTION_NAME`, and pool timeout settings. Staging DB creation, IAM, migration, secret version addition, Cloud Run DB update, Firebase rewrite, and production write remain blocked.

32L-5 status: Approved staging Cloud SQL resource creation was attempted and blocked by approved tier/machine type availability. The staging instance and database were not created. Next readiness gate is a revised staging tier/version approval before another DB create attempt.

32L-5R status: Revised staging DB tier plan is documented in `docs/ADMIN_STAGING_DB_TIER_REVISION_PLAN.md`. First revised candidate is `db-g1-small`; fallback is `db-custom-1-3840`. Staging DB creation remains blocked until `APPROVE_STAGING_DB_CREATE_REVISED = YES`.

## Decision Status

| Area | Current Status | Decision Needed Before Implementation |
| --- | --- | --- |
| API hosting | Cloud Run selected candidate | Confirm Google Cloud setup, cost, and region |
| Auth | Firebase Auth email/password first selected | Confirm admin strategy execution details |
| PostgreSQL provider | Cloud SQL selected, Neon fallback | Confirm Cloud SQL provider resource plan |
| Storage | Firebase Storage optional | Decide later for images and files |
| Deployment | Firebase Hosting existing, `/api/**` rewrite selected | Plan rewrite after backend scaffold is approved |
| Secrets | Google Secret Manager selected | Plan secret creation without recording secret values |

## PostgreSQL Provider Decision: Cloud SQL vs Neon

### Cloud SQL

Use if:

- Cloud Run is chosen
- Google Cloud operations are acceptable
- Tighter Google Cloud integration is preferred
- Cloud SQL backup, networking, IAM, and region planning can be managed

Risks:

- Setup complexity
- Cost monitoring
- Private/public connectivity decision
- Backup and region planning

### Neon

Use if:

- Simpler managed PostgreSQL setup is preferred
- Dev branch workflow is attractive
- External managed database hosting is acceptable
- Connection pooling can be reviewed before implementation

Risks:

- Cloud Run to Neon connectivity
- Pooling mode choice
- External provider dependency
- Backup, region, and cost review

## Provisional Recommendation

- API: Cloud Run
- Auth: Firebase Auth
- DB: Cloud SQL if the operator accepts Google Cloud setup; otherwise Neon as fallback

Do not call this a final production decision until cost, region, backups, connectivity, and day-to-day operations are confirmed.

## Firebase Auth Readiness Checklist

Confirm before implementation:

- Login methods:
  - Email/password
  - Google login decision
- Buyer registration flow:
  - Firebase user creation
  - Backend creates PostgreSQL `users` and `buyers`
  - Default buyer status is `pending`
- Admin strategy:
  - Admin users are stored in PostgreSQL `users.role = admin`
  - Firebase custom claims are optional optimization, not the sole source of truth
- Backend verifies Firebase ID token
- Backend loads PostgreSQL `users` and `buyers` status
- Approved buyer price access requires PostgreSQL status check
- Admin access requires PostgreSQL role check

Important:

- Firebase Auth identity alone does not grant admin access.
- Firebase Auth identity alone does not grant approved buyer price access.
- PostgreSQL remains the business authorization source.

## Backend API Implementation Checklist

Choose and document before implementation:

- API framework:
  - Express
  - Fastify
- Runtime:
  - Node.js version
- DB library:
  - `pg` direct
  - Prisma
  - Drizzle
- Migration strategy:
  - Raw SQL files first
  - Future migration tool later
- Environment variables:
  - Server-only DB credentials
  - Firebase Admin credentials
- Auth middleware:
  - Verify Firebase ID token
  - Load PostgreSQL user, buyer, and admin status
- Transaction helper:
  - Request Quote transaction
  - Admin Quote transaction
  - `audit_logs` transaction
- Error response convention
- Logging convention
- CORS and Firebase Hosting rewrite strategy
- Local dev API strategy

This section is a selection checklist only. Do not install dependencies or write API code until the provider decisions are confirmed.

## API Route Implementation Priority

### Phase 1

- `GET /api/health`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:productCode`
- `GET /api/buyer/me`

### Phase 2

- `POST /api/buyer/register`
- `POST /api/inquiries`
- `GET /api/inquiries`
- `GET /api/inquiries/:id`

### Phase 3

- `GET /api/admin/dashboard`
- `GET /api/admin/buyers`
- `POST /api/admin/buyers/:buyerId/approve`
- `POST /api/admin/buyers/:buyerId/block`

### Phase 4

- `POST /api/admin/product-prices/:priceId`
- `POST /api/admin/inquiries/:inquiryId/review`
- `POST /api/admin/quotes`
- `POST /api/admin/quotes/:quoteId/send`
- `GET /api/admin/analytics`

Each phase needs planned tests and validation before implementation. Admin write phases must include `audit_logs`.

## Not Implemented In This Step

- No production backend API deployment
- No Firebase Auth connection
- No Cloud Run setup
- No Cloud SQL or Neon resource creation
- No production PostgreSQL database creation
- No package dependency
- No SQL execution
- No migration execution
- No Firebase configuration change
- No deploy action

## 26B Scaffold Status

- Local backend scaffold exists under `backend/`.
- Backend dependencies are isolated to `backend/package.json`.
- Phase 1 route tests exist and use mocks only.
- Phase 1 route contract exists in `docs/BACKEND_PHASE1_ROUTE_CONTRACT.md`.
- Local runtime QA exists in `docs/BACKEND_LOCAL_RUNTIME_QA.md`.
- No provider resources are created.
- No production DB connection is configured.
- No Firebase Auth integration is configured.

## Next Step Recommendation

Before implementation starts:

1. Choose Cloud SQL or Neon.
2. Confirm Firebase Auth login methods.
3. Confirm backend API framework and DB library.
4. Confirm where server-side secrets will live.
5. Confirm `/api/**` rewrite strategy.
6. Create a backend implementation plan with tests before writing code.

## 32A Admin Full Editable Planning

- Admin full editable planning has started and is documented in `docs/ADMIN_FULL_EDITABLE_SCOPE.md`.
- Write candidates are documented in `docs/ADMIN_WRITE_API_CANDIDATES.md`.
- Implementation remains blocked until write safety gates and schema/status strategy are approved.
- 32A is documentation-only and does not add backend routes, frontend admin routes, SQL, Auth, DB, Firebase rewrite, dependencies, or deploy changes.

## 32B Admin Write Schema Impact

- Admin write schema impact review is documented in `docs/ADMIN_WRITE_SCHEMA_IMPACT_REVIEW.md`.
- Implementation still requires explicit approval, Auth, DB, transaction helper, and audit design.
- Inquiry `admin_memo` is the recommended first write candidate later, but no write implementation is approved yet.

## 32C Admin Write API Contract

- Admin write API contract planning is documented in `docs/ADMIN_WRITE_API_CONTRACT.md`.
- First implementation candidate would be inquiry `admin_memo` only after explicit approval.
- Backend/Auth/DB/transaction/audit readiness is still required before any write route is implemented.

## 32D Admin Backend Skeleton Approval

- Admin backend skeleton approval plan is documented in `docs/ADMIN_BACKEND_SKELETON_APPROVAL_PLAN.md`.
- 32E may implement a mock-only skeleton if explicitly approved.
- Real Auth, real DB, SQL, Firebase `/api` rewrite, and deploy remain blocked.

## 32E Admin Mock-only Backend Skeleton

- Admin mock-only backend skeleton now exists under `/api/admin`.
- Local mock tests cover admin auth, read routes, inquiry detail validation, buyer/product filters, and the mock-only inquiry memo route.
- Next step should be local route QA only.
- Real Auth, real DB, SQL migration/execution, Firebase `/api` rewrite, and deploy remain blocked.

## 32F Admin Mock Backend Route QA

- Admin mock backend route QA is documented in `docs/ADMIN_MOCK_BACKEND_ROUTE_QA_REPORT.md`.
- The mock-only route/test coverage is Go.
- Next real step must still avoid production DB/Auth, Cloud resources, SQL execution, Firebase `/api` rewrite, and deploy.

## 32G Admin Memo Local Dry-run Plan

- Admin memo local dry-run planning is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_PLAN.md`.
- Real implementation still requires explicit approval and must be local-only first.
- Production DB/Auth, Cloud resources, SQL execution, Firebase `/api` rewrite, and deploy remain blocked.

## 32H Admin Memo Local Query Path

- Admin `admin_memo` local-only query path exists for a future local PostgreSQL dry-run.
- Fake-pool tests cover transaction, `audit_logs`, rollback, release, not-found, and parameterized query behavior.
- Next step is explicit local PostgreSQL dry-run only if approved.
- Production DB/Auth, Cloud resources, SQL execution by Codex, Firebase `/api` rewrite, and deploy remain blocked.

## 32I Admin Memo Local Dry-run

- Local PostgreSQL `admin_memo` dry-run is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md`.
- The local-only transaction path updated one inquiry memo and inserted one `audit_logs` row.
- This confirms local query readiness for `admin_memo` only.
- Production Auth/DB decisions, Cloud resources, secret storage, Firebase `/api` rewrite, and deployment are still required before rollout.
- Existing frontend source changes were not staged or committed by 32I.

## 32J-0 Admin Memo Production Readiness Gate

- Production readiness gate is documented in `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`.
- Next implementation work must focus on backend runtime, Auth, DB, secret storage, Firebase rewrite, rollback, and QA decisions before production write rollout.
- Local dry-run success does not make production deployment ready.

## 32J-1 Production Infrastructure Decision

- Production infrastructure decision planning is documented in `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`.
- Next implementation still requires separate approval.
- Cloud/runtime, DB, Secret Manager, Firebase Auth, admin bootstrap, Firebase `/api` rewrite, and production QA remain unimplemented.

## 32J-2 Production Backend Runtime Plan

- Production backend runtime planning is documented in `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`.
- Next implementation still requires separate approval.
- No Dockerfile, Cloud Build, Cloud Run service, production DB/Auth integration, Secret Manager setup, Firebase `/api` rewrite, or deploy was added.

## 32J-3 Production DB Migration Plan

- Production DB and migration planning is documented in `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`.
- No SQL execution, schema/migration file change, DB/Auth integration, Secret Manager setup, Firebase `/api` rewrite, or deploy was added.
- Production admin memo rollout remains blocked.

## 32J-4 Production Secret Manager Plan

- Production secret management planning is documented in `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`.
- No secret creation, secret value recording, runtime injection, IAM change, DB/Auth integration, Firebase `/api` rewrite, or deploy was added.
- Production admin memo rollout remains blocked.

## 32J-5 Admin Firebase Auth Verification Plan

- Firebase Auth admin verification planning is documented in `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`.
- No Firebase Auth integration, Firebase Admin SDK installation, credential creation, package change, DB/Auth integration, Firebase `/api` rewrite, or deploy was added.
- Production admin memo rollout remains blocked.

## 32J-6 Admin Bootstrap Plan

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- No admin account, bootstrap script, protected bootstrap route, DB write, Firebase Auth integration, package change, Firebase `/api` rewrite, or deploy was added.
- Production admin memo rollout remains blocked until bootstrap, Auth, DB, secret, runtime, rewrite, rollback, and QA gates are approved.

## 32J-7 Admin Staging Memo Dry-run Plan

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- No staging DB, production-like clone, Auth integration, runtime implementation, secret creation, SQL execution, Firebase `/api` rewrite, or deploy was added.
- Production admin memo rollout remains blocked.

## 32J-8 Admin Firebase API Rewrite Plan

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- No firebase.json change, `.firebaserc` change, Firebase deploy, backend runtime URL connection, DB/Auth integration, SQL execution, package change, or source change was added.
- Production admin memo rollout remains blocked.

## 32J-9 Admin Production Rollout Checklist

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- Implementation still requires separate approval.
- No runtime, DB, secret, Auth, bootstrap, staging dry-run, Firebase config change, rewrite, deploy, package change, SQL execution, or source change was added.

## 32K-1 Backend Runtime Container Artifact

- Backend runtime container artifacts were added in `backend/Dockerfile` and `backend/.dockerignore`.
- Deployment still requires separate approval and a production runtime plan.
- Production env, secret storage, Firebase Auth, DB connection, Cloud Run/Cloud Build, Firebase `/api` rewrite, and deploy are not wired.

## 32K-2 Local Container Smoke

- Local container smoke report is documented in `docs/ADMIN_BACKEND_CONTAINER_LOCAL_SMOKE_REPORT.md`.
- Docker build/run was blocked because Docker CLI was unavailable in the current terminal session.
- Backend tests passed and root build passed.
- Cloud Run deploy still requires separate approval.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-2N Local Node Backend Smoke

- Local non-container Node smoke is documented in `docs/ADMIN_BACKEND_LOCAL_NODE_SMOKE_REPORT.md`.
- The local development server passed `/api/health` and admin no-token boundary checks without DB or Firebase credentials.
- This does not replace Docker/container validation.
- Cloud Run deploy still requires Docker/container validation and separate approval.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-3 Cloud Run Source Deploy Planning

- Cloud Run source deploy planning is documented in `docs/ADMIN_CLOUD_RUN_SOURCE_DEPLOY_PLAN.md`.
- Docker Desktop is not mandatory if the Cloud Run source deploy path is approved.
- Existing `backend/Dockerfile` remains the recommended build definition for now.
- Buildpacks remain an alternative path, not the current primary path.
- Local Docker smoke is optional but recommended when Docker CLI becomes available.
- Production write remains gated by runtime, Auth, DB, Secret Manager, Firebase rewrite, staging dry-run, rollback, and QA approval.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, Cloud Build, Cloud Run deploy, and production admin_memo rollout are still not wired.

## 32K-4 Cloud Run Deploy Approval Checklist

- Cloud Run deploy approval requirements are documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_APPROVAL_CHECKLIST.md`.
- 32K-4 does not change implementation readiness.
- Backend runtime deploy remains gated.
- Docker Desktop remains optional for this planning path.
- Cloud Run deploy approval checklist is now required before any deploy attempt.
- Production write remains gated by runtime, Auth, DB, Secret Manager, Firebase rewrite, staging dry-run, rollback, and QA approval.

## 32K-5 Cloud Run Deploy Values Decision

- Cloud Run deploy values decision is documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_VALUES_DECISION.md`.
- Implementation still requires explicit approval.
- Deploy values remain pending/proposed and placeholder-only.
- Startup/health policy remains pending.
- Production runtime deployment, DB/Auth/Secret integration, Firebase `/api` rewrite, and production admin_memo rollout remain blocked.

## 32K-6 Health-only Startup Implementation

- Backend health-only startup support is implemented with explicit `ALLOW_HEALTH_ONLY_STARTUP=true`.
- Default production config remains strict without the explicit flag.
- Backend tests verify `/api/health` works without DB/Auth secrets in health-only mode.
- Backend tests verify admin no-token access remains fail-closed.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.
- Deploy still requires approval.

## 32K-7 Health-only Entrypoint Smoke

- Health-only entrypoint smoke is documented in `docs/ADMIN_BACKEND_HEALTH_ONLY_ENTRYPOINT_SMOKE_REPORT.md`.
- Actual `npm start` path was verified locally with production health-only env.
- `/api/health` passed without DB/Auth secrets.
- Admin no-token access remained fail-closed.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-8 gcloud Preflight

- Read-only gcloud preflight is documented in `docs/ADMIN_CLOUD_RUN_GCLOUD_PREFLIGHT_REPORT.md`.
- gcloud CLI was unavailable in the current terminal session.
- Account, project, and required API readiness remain unknown.
- Implementation still requires explicit deploy approval and confirmed runtime values.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-8R3 gcloud Preflight Retry

- Read-only gcloud preflight retry is documented in `docs/ADMIN_CLOUD_RUN_GCLOUD_PREFLIGHT_REPORT.md`.
- gcloud CLI was available by full path.
- Active account and project were present, but real values were not recorded.
- Required Cloud Run deployment APIs were missing.
- Implementation still requires explicit deploy approval, API readiness, and confirmed runtime values.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-9 API Enablement Planning

- API enablement planning is documented in `docs/ADMIN_CLOUD_RUN_API_ENABLEMENT_PLAN.md`.
- No API enablement or deploy was performed.
- Implementation still requires explicit API enablement approval, deploy approval, and confirmed runtime values.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-10 API Enablement

- API enablement result is documented in `docs/ADMIN_CLOUD_RUN_API_ENABLEMENT_REPORT.md`.
- Required APIs are now Enabled.
- No Cloud Run deploy, Cloud Build execution, Secret Manager secret creation, Firebase rewrite, DB/Auth integration, or SQL execution was performed.
- Implementation still requires deploy approval and confirmed runtime values.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-11 Cloud Run Deploy Values Approval

- Deploy values approval planning is documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_VALUES_APPROVAL.md`.
- Implementation still requires explicit deploy approval.
- The non-secret service name candidate is proposed, while region, runtime service account, ingress, public access boundary, secret strategy, and rollback owner remain pending.
- No Cloud Run deploy, Cloud Build execution, Secret Manager secret creation, Firebase rewrite, DB/Auth integration, or SQL execution was performed.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-12 Health-only Deploy Approval

- First health-only deploy approval is documented in `docs/ADMIN_CLOUD_RUN_HEALTH_ONLY_DEPLOY_APPROVAL.md`.
- Implementation still requires explicit deploy approval.
- The future first deploy candidate is health-only, no-secret, and does not connect DB/Auth/Secret Manager or Firebase `/api` rewrite.
- No Cloud Run deploy, Cloud Build execution, Secret Manager secret creation, Firebase rewrite, DB/Auth integration, or SQL execution was performed.
- Production env, secret storage, Firebase Auth, DB connection, Firebase `/api` rewrite, and deploy are not wired.

## 32K-13 Health-only Cloud Run Deploy

- Health-only Cloud Run deploy result is documented in `docs/ADMIN_CLOUD_RUN_HEALTH_ONLY_DEPLOY_REPORT.md`.
- Runtime health-only smoke is Go.
- Cloud Build executed for the approved source deploy.
- Secret Manager, production DB, Firebase Auth, and Firebase `/api` rewrite are still required before production integration.
- Production admin_memo write remains No-Go.

## 32K-14 Health-only Operations Audit

- Health-only runtime operational audit is documented in `docs/ADMIN_CLOUD_RUN_HEALTH_ONLY_OPERATIONS_AUDIT.md`.
- Runtime service, IAM, env, smoke, and recent ERROR log checks are Go.
- Next implementation still requires explicit approval.
- Secret Manager, production DB, Firebase Auth, and Firebase `/api` rewrite remain required before production integration.
- Production admin_memo write remains No-Go.

## 32L Admin Real Integration Master Plan

- Admin real integration master plan is documented in `docs/ADMIN_REAL_INTEGRATION_MASTER_PLAN.md`.
- Secret Manager, staging PostgreSQL, and Firebase Auth are defined as required but separate integration roles.
- Cloud SQL PostgreSQL is the recommended primary DB path after resource-boundary approval.
- Actual Secret Manager creation, staging DB creation, Auth integration, Firebase rewrite, and production write remain blocked.

## 32L-6 Staging Cloud SQL Resource

- Staging Cloud SQL instance/database creation is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- Backend readiness now has a staging database resource available for later approved gates.
- DB user/password, schema migration, Secret Manager version addition, Cloud SQL Client IAM, Cloud Run DB update, Firebase Auth, Firebase `/api` rewrite, and production write remain blocked.

## 32L-7 Cloud SQL Client IAM

- Cloud SQL Client IAM grant is documented in `docs/ADMIN_CLOUD_SQL_CLIENT_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity is prepared for future Cloud SQL socket access.
- DB user/password, DB connection, schema migration, Secret Manager version addition, Cloud Run DB update, Firebase Auth, Firebase `/api` rewrite, and production write remain blocked.

## 32L-8 Staging DB User / Secret Handoff

- Staging DB user and secret handoff is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- Staging DB user exists, but no staging secret version exists yet.
- Password and DB URL were not recorded.
- Backend DB readiness remains blocked until recovery approval creates a usable staging secret version.
- DB connection, schema migration, Cloud Run DB update, Firebase Auth, Firebase `/api` rewrite, and production write remain blocked.

## 32L-8R Staging DB User Secret Recovery

- Recovery is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_RECOVERY_REPORT.md`.
- First staging database URL secret version exists for future approved runtime use.
- Password and DB URL were not recorded.
- Backend DB readiness still requires schema migration approval, runtime Secret IAM, and Cloud Run DB secret/socket update before any DB-backed runtime smoke.

## 32L-9 Staging Schema Migration Path Decision

- Migration path decision is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Recommended implementation path is a Cloud Run Job / one-off migration runner.
- DB connection, SQL execution, secret access, Runtime Secret IAM, Cloud Run DB update, and Firebase `/api` rewrite remain blocked.
- Next implementation gate is migration runner implementation, not migration execution.

## 32L-10 Staging Schema Migration Runner

- Backend schema migration runner and fake-pool tests were added.
- Runner is transaction-managed and guarded by `ALLOW_STAGING_SCHEMA_MIGRATION_RUNNER=true`.
- Actual DB connection, secret access, Cloud Run Job creation/execution, schema migration execution, Runtime Secret IAM, Cloud Run DB update, and Firebase `/api` rewrite remain blocked.

## 32L-11 Runtime Secret IAM

- Runtime secret IAM grant is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- The dedicated Noblesse runtime identity now has secret-level access to `noblesse-staging-database-url`.
- Secret value was not accessed/read, and secret version count remains 1.
- Backend runtime DB readiness still requires Cloud Run DB secret/socket update and controlled migration job packaging/execution approvals.
- Firebase `/api` rewrite and production write remain blocked.

## 32L-12 Cloud Run Migration Job Packaging

- Cloud Run migration job packaging is documented in `docs/ADMIN_CLOUD_RUN_MIGRATION_JOB_PACKAGING_REPORT.md`.
- A staging migration job resource exists for future approved execution.
- The job was not executed and schema migration was not executed.
- Backend readiness still requires explicit migration execution approval, DB smoke verification, Cloud Run app DB update approval, and Firebase `/api` rewrite approval.

## 32L-13 Migration Job Execution

- Migration job execution is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_EXECUTION_REPORT.md`.
- One approved execution was attempted, but it did not complete successfully.
- The migration runner start/commit logs were not present, so staging schema migration is No-Go.
- Backend readiness now requires a recovery approval before any DB read smoke, Cloud Run app DB update, Firebase `/api` rewrite, or production write.

## 32L-13R Recovery Diagnosis

- Recovery diagnosis is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_RECOVERY_DIAGNOSIS.md`.
- The failure is classified as IAM/permission before migration runner start.
- No backend source, tests, schema SQL, package files, Cloud Run Job, IAM, secret, or DB resource was changed.
- Backend readiness remains blocked until the IAM fix gate is approved and completed.

## N38-A4 RBAC Lifecycle Migration Idempotency

- Idempotency report: `docs/ADMIN_RBAC_MIGRATION_IDEMPOTENCY_REPORT.md`.
- Backend schema migration runner now uses `public.app_schema_migrations` as a transaction-managed ledger.
- The runner records a SHA-256 checksum and treats same-name/same-checksum reruns as already applied.
- Same-name checksum mismatch fails before schema SQL execution.
- N38 lifecycle SQL now preserves canonical `account_status`, `verification_status`, and existing admin roles on repeated runs.
- Backend fake-pool/static tests cover idempotency, rollback, checksum mismatch, packaged migration parity, and fresh-install schema parity.
- DB connection/psql executed: No.
- SQL/schema/migration execution: No.
- Cloud Run Job execution/redeploy: No.
- Firebase deploy or `/api` rewrite: No.

## N38-B1 RBAC Migration Job Repackage

- Repackage report: `docs/ADMIN_RBAC_MIGRATION_JOB_REPACKAGE_REPORT.md`.
- Cloud Build executed successfully from backend source.
- Existing staging migration Job updated with the N38-A4 idempotent runner and migration package.
- Job execution: No.
- Schema migration execution: No.
- DB connection/psql executed: No.
- Secret value access: No.
- Cloud Run application deploy: No.
- Firebase deploy or `/api` rewrite: No.
- Application DB runtime privilege hardening remains a separate No-Go gate.

## N38-B2 RBAC Migration Execution

- Execution report: `docs/ADMIN_STAGING_RBAC_MIGRATION_EXECUTION_REPORT.md`.
- Existing staging migration Job executed exactly once.
- Execution count before/after: 10/11.
- Migration committed: Yes.
- Already applied: No.
- Checksum mismatch: No.
- Local psql/direct operator DB connection: No.
- Secret value access/read: No.
- Cloud Run application deploy: No.
- Firebase deploy or `/api` rewrite: No.
- Production DB/write: No.
- Backend readiness next requires an idempotency recheck and separate schema/owner verification before application DB rollout.

## N38-B3 RBAC Migration Idempotency Recheck

- Idempotency recheck report: `docs/ADMIN_STAGING_RBAC_MIGRATION_IDEMPOTENCY_RECHECK_REPORT.md`.
- Same staging migration Job executed exactly once after the first committed run.
- Execution count before/after: 11/12.
- alreadyApplied: true.
- Schema migration committed again: No.
- Lifecycle schema SQL re-executed: No.
- Checksum mismatch: No.
- Local psql/direct operator DB connection: No.
- Secret value access/read: No.
- Cloud Run application deploy: No.
- Firebase deploy or `/api` rewrite: No.
- Production DB/write: No.
- Backend readiness next requires separate schema/owner verification before application DB rollout.

## N38-B4 RBAC Schema / Owner Verification

- Schema/owner verification report: `docs/ADMIN_STAGING_RBAC_SCHEMA_OWNER_VERIFICATION_REPORT.md`.
- A dedicated Cloud Run verification Job used read-only transaction checks against staging.
- Existing staging migration Job was not executed again.
- Ledger/checksum, schema contract, lifecycle counts, admin profile/owner coverage, and override invariants passed.
- Backend readiness next requires runtime DB privilege hardening before application DB rollout.

## N38-B5 Runtime DB Privilege Hardening

- Runtime privilege hardening report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING_REPORT.md`.
- Backend runtime privilege manifest, hardener, verifier, and fake-pool tests were added.
- Backend tests passed after implementation.
- Staging DB Job identity separation completed without re-running migration or RBAC verification Jobs.
- Runtime hardening Job execution failed with NonZeroExitCode.
- Runtime DB user, runtime DB secret, verifier Job, Cloud Run application deploy, Firebase deploy, and production rollout remain blocked.
- Backend readiness next requires `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS = YES`.

## N38-B5R Runtime Privilege Recovery Diagnosis

- Recovery diagnosis report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS.md`.
- Read-only diagnostic runner and tests were added.
- Diagnostic Job executed exactly once and succeeded.
- Classification: B - database/schema ownership or runtime role setup failure.
- Runtime group role exists: No.
- Expected runtime privilege checks missing: 36 of 36.
- Backend readiness next requires a hardener fix/rerun approval; application DB rollout remains blocked.

## N38-B5F Runtime Privilege Hardener Recovery

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_PRIVILEGE_HARDENER_RECOVERY_REPORT.md`.
- Ownership-aware hardener preflight and validation-before-commit were implemented.
- Hardening Job was updated and executed exactly once.
- Staging runtime privilege hardening: Go.
- Root lint remains blocked by an existing out-of-scope `src/pages/HomePage.jsx` hook-order dirty change.
- Backend readiness next requires runtime DB user/secret creation and runtime verifier approval; application DB rollout remains blocked.

## N38-B6 Runtime DB User Secret Handoff

- Runtime DB user/secret handoff report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_REPORT.md`.
- Runtime secret container exists with zero versions.
- Runtime DB login user was not created.
- Secret-level application accessor was not granted.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Backend readiness next requires runtime DB user/secret recovery approval before verifier or application DB rollout.

## N38-B6R Runtime DB User Secret Recovery

- Runtime DB user/secret recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_REPORT.md`.
- Runtime DB login user was created and has the expected custom role metadata.
- Explicit cloudsqlsuperuser assignment: No.
- Runtime secret version was not added.
- Secret-level application accessor was not granted.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Backend readiness next still requires runtime DB user/secret recovery before verifier or application DB rollout.

## N38-B6R2 Runtime DB User Secret Recovery Completion

- Runtime DB user/secret recovery completion report: `docs/ADMIN_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_COMPLETION_REPORT.md`.
- Password reset was attempted exactly once and failed.
- Runtime DB login user remains present with the expected custom role metadata.
- Runtime secret version was not added.
- Secret-level application accessor was not granted.
- No DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Backend readiness next requires runtime DB user/secret recovery diagnosis before verifier or application DB rollout.

## N38-B6D Runtime DB Password Reset Diagnosis

- Password reset diagnosis report: `docs/ADMIN_STAGING_RUNTIME_DB_PASSWORD_RESET_DIAGNOSIS.md`.
- Cloud SQL operation evidence indicates the prior reset likely succeeded server-side.
- Local wrapper failure blocked secret-version handoff.
- No password reset retry, secret version, IAM mutation, DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation occurred.
- Backend readiness next requires wrapper recovery approval before secret-version handoff and verifier.

## N38-B6R3 Runtime DB Password Wrapper Recovery

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_DB_PASSWORD_WRAPPER_RECOVERY_REPORT.md`.
- Password reset command executed exactly once.
- Cloud SQL server-side operation result: Success.
- Runtime secret version add result: Not completed; enabled version count remains 0.
- Runtime secret IAM grant: Not executed.
- No DB login/query, runtime verifier, Job execution, application deploy, Firebase deploy, or production mutation occurred.
- Backend readiness remains blocked pending `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.
