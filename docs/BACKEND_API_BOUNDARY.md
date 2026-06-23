# Backend API Boundary

## Purpose

This document defines the trusted backend API responsibilities between the Noblesse React frontend and the PostgreSQL business database.

The React frontend must not connect directly to PostgreSQL. Database credentials must exist only on the server side.

## Current Status

- Frontend mock preview
- Admin mock preview
- PostgreSQL scaffold local dry-run passed with `audit_logs`
- Provider/auth decision is documented in `docs/BACKEND_PROVIDER_AUTH_DECISION.md`
- Route priority and implementation readiness are tracked in `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- Stack decision gate must pass before writing route code.
- Human/operator approval is tracked in `docs/BACKEND_HUMAN_DECISION_RECORD.md`
- Candidate default: Cloud Run + Firebase Auth + PostgreSQL provider
- No production DB connection
- 26B local backend scaffold exists for Phase 1 only
- Phase 1 route skeletons exist for health, catalog products, catalog product detail, and buyer profile
- No production backend deployment yet

## Required Principles

- No `DATABASE_URL` in frontend code or frontend config.
- No direct browser-to-PostgreSQL access.
- All write operations go through a backend API.
- Server recalculates prices and totals.
- Server validates buyer/admin identity.
- Server validates agreement acceptance.
- Server validates market, currency, and MOQ.
- Server writes `audit_logs` for admin and sensitive operations.

## Candidate API Hosting Options

- Cloud Run behind Firebase Hosting rewrite
- Render/Railway API service
- Vercel serverless API
- Node.js Express/Fastify server
- Other controlled backend

## Public / Buyer API Boundaries

These are candidate endpoint boundaries only. They are not implemented in this step.

Backend API boundaries are not implementation approval. `docs/BACKEND_STACK_DECISION_GATE.md` must pass and `docs/BACKEND_HUMAN_DECISION_RECORD.md` must be approved before route code is written.

25B confirms Phase 1 as the first candidate scope after a separate scaffold plan: health check, catalog product reads, product detail read, and buyer profile read.

26A documents the Phase 1 scaffold plan in `docs/BACKEND_PHASE1_SCAFFOLD_PLAN.md`. It covers health/catalog/buyer-me only; write APIs remain future phases.

26B creates the local scaffold for those Phase 1 routes. Route code remains limited to read-only boundaries and mockable Auth/DB dependencies.

26C documents the Phase 1 route contract in `docs/BACKEND_PHASE1_ROUTE_CONTRACT.md` and adds mock QA for request IDs, validation, auth errors, and protected price exclusion. Write APIs remain future phases.

27A documents the future frontend API client strategy in `docs/FRONTEND_API_CLIENT_PLAN.md`. The frontend must use the backend API boundary only and must never connect directly to PostgreSQL.

31A documents Admin MVP scope in `docs/ADMIN_MVP_SCOPE.md`. Admin APIs require backend authentication, PostgreSQL role checks, server-side validation, and `audit_logs` for sensitive writes. Existing admin preview screens are not real admin security.

31B documents the Admin schema gap review in `docs/ADMIN_SCHEMA_GAP_REVIEW.md`. Admin read-only APIs may use the current schema, but Admin write APIs require status mapping/migration decisions, `audit_logs`, status event strategy, and transaction handling before implementation.

31C documents the Admin read-only API contract in `docs/ADMIN_READ_ONLY_API_CONTRACT.md`. Admin write APIs remain blocked and are not part of the read-only contract.

31D documents the Admin read-only backend scaffold plan in `docs/ADMIN_READ_ONLY_BACKEND_SCAFFOLD_PLAN.md`. It plans future `/api/admin` route, service, query, auth, validation, pagination, and mock test structure only. `/api/admin` write routes remain blocked.

32L-1 creates the Noblesse staging Secret Manager container only and documents it in `docs/ADMIN_STAGING_SECRET_CONTAINER_REPORT.md`. This does not add a secret value, runtime IAM, DB connection, Cloud Run update, Firebase `/api` rewrite, or production frontend API call.

32L-2 documents the staging Cloud SQL connection decision in `docs/ADMIN_STAGING_CLOUD_SQL_CONNECTION_DECISION.md`. The recommended DB path remains backend-only through Cloud Run native Cloud SQL connection and Secret Manager. The frontend still must not receive DB credentials or call PostgreSQL directly.

32L-3 enables Cloud SQL Admin API only and documents it in `docs/ADMIN_CLOUD_SQL_ADMIN_API_ENABLEMENT_REPORT.md`. This does not create a DB, add IAM, add a secret version, connect Cloud Run to DB, add Firebase `/api` rewrite, or allow frontend DB access.

32L-4 adds backend-only Cloud SQL socket pool configuration support. This remains server-side only: no frontend DB access, no `DATABASE_URL` in frontend, no Firebase `/api` rewrite, and no production admin write.

N38-B6 attempted the staging runtime DB credential handoff after runtime privilege hardening. It created only an empty dedicated runtime secret container, did not create a runtime DB login user, did not add a secret version, did not grant runtime secret access, and did not run a DB login/query or runtime verifier. Application DB rollout remains blocked pending `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

N38-B6R recovered the runtime DB login user creation but did not add the runtime secret version or grant secret access. It did not run a DB login/query, runtime verifier, application deploy, Firebase deploy, or production mutation. Application DB rollout remains blocked pending `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

N38-B6R2 attempted the approved password reset exactly once and failed before secret version creation. It did not add a secret version, grant runtime secret access, run a DB login/query, execute any Job, deploy the application, or mutate production. Application DB rollout remains blocked pending `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY_DIAGNOSIS = YES`.

N38-B6D diagnosed the failed password reset as a local wrapper failure with server-side Cloud SQL operation success evidence. It did not retry password reset, add a secret version, change IAM, run a DB login/query, execute Jobs, deploy the application, or mutate production. Application DB rollout remains blocked pending `APPROVE_STAGING_RUNTIME_DB_PASSWORD_RESET_WRAPPER_RECOVERY = YES`.

N38-B6R3 executed the approved staging runtime DB password reset exactly once and confirmed Cloud SQL server-side operation success, but the matching runtime DATABASE_URL secret version was not created. It did not grant runtime secret access, run a DB login/query, execute any Cloud Run Job, deploy the application, deploy Firebase, or mutate production. Application DB rollout remains blocked pending `APPROVE_STAGING_RUNTIME_DB_USER_SECRET_RECOVERY = YES`.

32L-5 attempted staging Cloud SQL resource creation and was blocked before any usable DB resource was created. Backend API boundaries remain unchanged: no DB connection, no Cloud Run DB update, no Firebase `/api` rewrite, and no production admin write.

32L-5R documents revised staging DB tier candidates only. It does not create a DB, connect backend APIs to DB, add a Firebase rewrite, or change frontend access boundaries.

### `GET /api/catalog/products`

- Returns public visible product metadata.
- Does not return protected buyer prices for guest or pending users.

### `GET /api/catalog/products/:productCode`

- Returns public product detail.
- Price visibility depends on approved buyer status.

### `POST /api/buyer/register`

- Creates user/buyer application.
- Validates required agreements.
- Stores `buyer_agreements`.
- Does not automatically approve the buyer.

### `GET /api/buyer/me`

- Returns current buyer profile and approval status.

### `POST /api/inquiries`

- Creates Request Quote.
- Reloads `product_prices` server-side.
- Validates approved buyer status.
- Validates MOQ and minimum amount.
- Recalculates `price_snapshot`, subtotal, and estimated total.
- Inserts `inquiries` and `inquiry_items` in one transaction.

### `GET /api/inquiries`

- Buyer sees own inquiries only.

### `GET /api/inquiries/:id`

- Buyer sees own inquiry and quote status only.

## Admin API Boundaries

These are candidate endpoint boundaries only. They are not implemented in this step.

### `GET /api/admin/dashboard`

- Admin only.
- Returns summary cards and analytics signals.

### `GET /api/admin/buyers`

- Admin only.
- Returns buyer approval list.

### `POST /api/admin/buyers/:buyerId/approve`

- Admin only.
- Validates required agreements.
- Sets market, currency, discount, and minimum amount.
- Writes `audit_logs`.

### `POST /api/admin/buyers/:buyerId/block`

- Admin only.
- Writes `audit_logs`.

### `POST /api/admin/products/:productId`

- Admin only.
- Updates product metadata.
- Writes `audit_logs`.

### `POST /api/admin/product-prices/:priceId`

- Admin only.
- Validates market, currency, MOQ, and price.
- Writes `audit_logs`.

### `POST /api/admin/inquiries/:inquiryId/review`

- Admin only.
- Enforces valid status transition.
- Writes `audit_logs`.

### `POST /api/admin/quotes`

- Admin only.
- Transaction-safe `createAdminQuote`.
- Reloads `product_prices` server-side.
- Validates MOQ.
- Recalculates confirmed totals.
- Inserts `admin_quotes` and `admin_quote_items`.
- Updates inquiry status.
- Writes `audit_logs`.

### `POST /api/admin/quotes/:quoteId/send`

- Admin only.
- Marks quote as sent.
- Creates future notification job.
- Writes `audit_logs`.

### `GET /api/admin/analytics`

- Admin only.
- Reads SQL views.

## Transaction Requirements

- Request Quote creation inserts `inquiries` and `inquiry_items` atomically.
- Admin Quote creation inserts `admin_quotes` and `admin_quote_items` and updates inquiry status atomically.
- Product price update and audit log should be committed in the same transaction.
- Buyer approval and audit log should be committed in the same transaction.

## Not Implemented In This Step

- No production backend server
- No real auth provider connection
- No production DB connection
- No write API route code
- No production migration

## 32A Admin Full Editable Planning

- Admin full editable target is documented in `docs/ADMIN_FULL_EDITABLE_SCOPE.md`.
- Future write candidates are documented in `docs/ADMIN_WRITE_API_CANDIDATES.md`.
- Admin write APIs require `docs/ADMIN_WRITE_SAFETY_GATES.md` before implementation.
- No backend route, frontend admin route, SQL, Auth, DB, Firebase rewrite, or deploy change is made by 32A.

## 32B Admin Write Schema Impact

- Admin write API boundaries are still planning only.
- First write candidate is inquiry `admin_memo`, but implementation remains blocked.
- Inquiry status writes remain blocked until `admin_status`/status strategy and `inquiry_status_events` are approved.

## 32C Admin Write API Contract

- Admin write API contract is documented in `docs/ADMIN_WRITE_API_CONTRACT.md`.
- Write implementation remains blocked.
- No backend route, frontend admin route, SQL, Auth, DB, Firebase rewrite, or deploy change is made by 32C.

## 32D Admin Backend Skeleton Approval

- Next code step may add `/api/admin` mock-only backend skeleton if explicitly approved.
- Production `/api` rewrite remains absent.
- Real DB/Auth integration and real admin writes remain blocked.

## 32E Admin Mock-only Backend Skeleton

- `/api/admin` mock-only skeleton exists in the backend for local/mock testing.
- Production frontend does not call these routes.
- Firebase Hosting still has no `/api` rewrite.
- Real DB/Auth integration and real admin writes remain blocked.

## 32F Admin Mock Route QA

- `/api/admin` route QA is documented in `docs/ADMIN_MOCK_BACKEND_ROUTE_QA_REPORT.md`.
- The skeleton exists only in the backend and is not exposed through Firebase Hosting.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend does not call the admin skeleton.

## 32G Admin Memo Local Dry-run Plan

- Future local memo dry-run planning is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_PLAN.md`.
- A local dry-run does not imply production Firebase Hosting `/api` rewrite.
- Production frontend still does not call the admin API.
- Direct React-to-PostgreSQL access remains prohibited.

## 32H Admin Memo Local Query Path

- Backend now has a local-only admin memo query path for future dry-run.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call this admin API.
- Direct React-to-PostgreSQL access remains prohibited.

## 32I Admin Memo Local Dry-run

- Local PostgreSQL `admin_memo` dry-run is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md`.
- The local dry-run does not imply Firebase Hosting `/api` rewrite.
- Production frontend still does not call the admin API.
- Direct React-to-PostgreSQL access remains prohibited.
- Existing frontend source changes were not staged or committed by 32I.

## 32J-0 Admin Memo Production Readiness Gate

- Production readiness gate is documented in `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Admin memo production rollout remains blocked.

## 32J-1 Production Infrastructure Decision

- Production infrastructure decision planning is documented in `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32J-2 Production Backend Runtime Plan

- Production backend runtime planning is documented in `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Backend runtime planning does not change the frontend/API boundary.

## 32J-3 Production DB Migration Plan

- Production DB and migration planning is documented in `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`.
- DB planning does not change the API boundary.
- Frontend direct PostgreSQL access remains prohibited.
- Production frontend still does not call the admin API.

## 32J-4 Production Secret Manager Plan

- Production secret management planning is documented in `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`.
- Secret planning does not change the API boundary.
- Frontend direct DB access remains prohibited.
- Production frontend still does not call the admin API.

## 32J-5 Admin Firebase Auth Verification Plan

- Firebase Auth admin verification planning is documented in `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`.
- Auth planning does not change the API boundary.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.

## 32J-6 Admin Bootstrap Plan

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- Bootstrap planning does not change the API boundary and does not authorize a public bootstrap endpoint.
- The frontend still must not assign admin role/status or write directly to PostgreSQL.
- No backend route, DB write, Firebase Auth integration, `/api` rewrite, or deploy was added.

## 32J-7 Admin Staging Memo Dry-run Plan

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- Staging planning does not change the API boundary.
- Firebase Hosting `/api` rewrite remains absent and the production frontend still does not call the admin API.

## 32J-8 Admin Firebase API Rewrite Plan

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Rewrite planning does not change the current API boundary.
- `/api` rewrite remains absent, and the production frontend still does not call the admin API.
- Future rewrite must still rely on backend Auth/DB checks and must not allow frontend direct DB access.

## 32J-9 Admin Production Rollout Checklist

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- The rollout checklist does not change the API boundary.
- `/api` rewrite remains absent, and the production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-1 Backend Runtime Container Artifact

- Backend runtime container artifacts do not change the current API boundary.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-2 Local Container Smoke

- Local container smoke reporting does not change the current API boundary.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-2N Local Node Backend Smoke

- Local Node smoke reporting does not change the current API boundary.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.
- Container smoke remains a separate requirement before production runtime rollout.

## 32K-3 Cloud Run Source Deploy Planning

- Cloud Run source deploy planning does not change the API boundary.
- 32K-3 does not change write scope, auth boundary, endpoint behavior, or API contracts.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Production deploy and production admin_memo write remain No-Go.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-4 Cloud Run Deploy Approval Checklist

- 32K-4 does not change API endpoints, write scope, auth boundary, or production gate.
- It only documents runtime deploy approval requirements in `docs/ADMIN_CLOUD_RUN_DEPLOY_APPROVAL_CHECKLIST.md`.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-5 Cloud Run Deploy Values Decision

- 32K-5 does not change API endpoints, write scope, auth boundary, or production gate.
- It only documents deploy value decisions in `docs/ADMIN_CLOUD_RUN_DEPLOY_VALUES_DECISION.md`.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-6 Health-only Startup Implementation

- Health-only startup does not change API endpoints, write scope, auth boundary, or production gate.
- Admin routes remain protected and fail closed without token.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-7 Health-only Entrypoint Smoke

- Health-only entrypoint smoke does not change API endpoints, write scope, auth boundary, or production gate.
- The smoke only verifies local backend startup and no-token admin failure behavior.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-8 gcloud Preflight

- Read-only gcloud preflight does not change API endpoints, write scope, auth boundary, or production gate.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-8R3 gcloud Preflight Retry

- Read-only gcloud preflight retry does not change API endpoints, write scope, auth boundary, or production gate.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-9 API Enablement Planning

- API enablement planning does not change API endpoints, write scope, auth boundary, or production gate.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-10 API Enablement

- API enablement does not change API endpoints, write scope, auth boundary, or production gate.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-11 Cloud Run Deploy Values Approval

- Deploy values planning does not change API endpoints, write scope, auth boundary, or production gate.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-12 Health-only Deploy Approval

- Health-only deploy planning does not change API endpoints, write scope, auth boundary, or production gate.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the admin API.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-13 Health-only Cloud Run Deploy

- A Cloud Run service exists for health-only runtime smoke.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the backend.
- The runtime is not connected to DB/Auth/Secret Manager.
- Frontend direct PostgreSQL access remains prohibited.

## 32K-14 Health-only Operations Audit

- Cloud Run URL remains separate from Firebase Hosting.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call the backend.
- The health-only runtime remains disconnected from DB/Auth/Secret Manager.
- Frontend direct PostgreSQL access remains prohibited.

## 32L Admin Real Integration Master Plan

- Real admin integration planning is documented in `docs/ADMIN_REAL_INTEGRATION_MASTER_PLAN.md`.
- The frontend still must call only the backend API after any future Firebase `/api` rewrite.
- Direct React-to-PostgreSQL access remains prohibited.
- Firebase Auth provides identity, PostgreSQL provides role/status authorization, and Secret Manager provides DB credentials.
- Firebase Hosting `/api` rewrite remains absent.

## 32L-6 Staging Cloud SQL Resource

- Staging Cloud SQL instance/database creation is documented in `docs/ADMIN_STAGING_CLOUD_SQL_RESOURCE_REPORT.md`.
- This does not change the public API boundary.
- Firebase Hosting `/api` rewrite remains absent.
- Production frontend still does not call admin APIs.
- Direct React-to-PostgreSQL access remains prohibited.

## 32L-7 Cloud SQL Client IAM

- Cloud SQL Client IAM grant is documented in `docs/ADMIN_CLOUD_SQL_CLIENT_IAM_REPORT.md`.
- This does not connect the public frontend to the backend or database.
- Firebase Hosting `/api` rewrite remains absent.
- Direct React-to-PostgreSQL access remains prohibited.

## 32L-8 Staging DB User / Secret Handoff

- Staging DB user and secret handoff is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_REPORT.md`.
- No backend route, Cloud Run runtime secret binding, Firebase rewrite, or frontend API path changed.
- Firebase Hosting `/api` rewrite remains absent.
- Direct React-to-PostgreSQL access remains prohibited.

## 32L-8R Staging DB User Secret Recovery

- Recovery is documented in `docs/ADMIN_STAGING_DB_USER_SECRET_RECOVERY_REPORT.md`.
- This does not change the public API boundary.
- Cloud Run has not been updated to consume the secret.
- Firebase Hosting `/api` rewrite remains absent.
- Direct React-to-PostgreSQL access remains prohibited.

## 32L-9 Staging Schema Migration Path Decision

- Migration path decision is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_PATH_DECISION.md`.
- Public migration endpoint is explicitly No-Go.
- The frontend still does not call admin APIs or PostgreSQL directly.
- Firebase Hosting `/api` rewrite remains absent.

## 32L-10 Staging Schema Migration Runner

- Backend migration runner exists for a future Cloud Run Job / one-off runner path.
- No public migration endpoint was added.
- No frontend API path, Firebase Hosting rewrite, or direct React-to-PostgreSQL access changed.
- Migration execution remains blocked.

## 32L-11 Runtime Secret IAM

- Runtime secret IAM grant is documented in `docs/ADMIN_RUNTIME_SECRET_IAM_REPORT.md`.
- This does not add a Firebase Hosting `/api` rewrite.
- This does not connect the production frontend to admin APIs or PostgreSQL.
- Cloud Run DB update, migration execution, and production admin writes remain blocked.

## 32L-12 Cloud Run Migration Job Packaging

- Cloud Run migration job packaging is documented in `docs/ADMIN_CLOUD_RUN_MIGRATION_JOB_PACKAGING_REPORT.md`.
- The job is an internal staging migration path and does not create a public migration endpoint.
- The job was not executed.
- Firebase Hosting `/api` rewrite remains absent, and production frontend still does not call admin APIs or PostgreSQL.

## 32L-13 Migration Job Execution

- Migration job execution is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_EXECUTION_REPORT.md`.
- This did not add a public migration endpoint.
- This did not add a Firebase Hosting `/api` rewrite.
- Production frontend still does not call admin APIs or PostgreSQL.
- Staging schema migration remains No-Go pending recovery.

## 32L-13R Recovery Diagnosis

- Recovery diagnosis is documented in `docs/ADMIN_STAGING_SCHEMA_MIGRATION_RECOVERY_DIAGNOSIS.md`.
- This did not add or change any API route.
- This did not add a Firebase Hosting `/api` rewrite.
- This did not connect the frontend to admin APIs or PostgreSQL.
- Staging schema migration remains No-Go pending IAM fix approval.

## N38-B2 RBAC Migration Execution

- RBAC migration execution is documented in `docs/ADMIN_STAGING_RBAC_MIGRATION_EXECUTION_REPORT.md`.
- The existing staging migration Job was executed exactly once and committed the lifecycle migration.
- This did not add or change public API routes.
- This did not add a Firebase Hosting `/api` rewrite.
- This did not deploy the Cloud Run application service.
- This did not connect the public frontend directly to PostgreSQL.
- Production migration/write remains No-Go.

## N38-B3 RBAC Migration Idempotency Recheck

- RBAC migration idempotency recheck is documented in `docs/ADMIN_STAGING_RBAC_MIGRATION_IDEMPOTENCY_RECHECK_REPORT.md`.
- The same staging migration Job was executed exactly once and returned already-applied behavior.
- Lifecycle schema SQL was not re-executed.
- This did not add or change public API routes.
- This did not add a Firebase Hosting `/api` rewrite.
- This did not deploy the Cloud Run application service.
- This did not connect the public frontend directly to PostgreSQL.
- Production migration/write remains No-Go.

## N38-B4 RBAC Schema / Owner Verification

- RBAC schema/owner verification is documented in `docs/ADMIN_STAGING_RBAC_SCHEMA_OWNER_VERIFICATION_REPORT.md`.
- The verification Job is internal and read-only; it does not add a public API route.
- Firebase Hosting `/api` rewrite and frontend direct PostgreSQL access remain unchanged.
- Cloud Run application service deploy and production migration/write remain No-Go.

## N38-B5 Runtime DB Privilege Hardening

- Runtime privilege hardening is documented in `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_HARDENING_REPORT.md`.
- The new hardening/verifier runners are internal Cloud Run Job entrypoints, not public HTTP routes.
- No Firebase Hosting `/api` rewrite was added.
- No frontend direct PostgreSQL access was added.
- Cloud Run application service deploy remains No-Go because the hardening execution failed.
- Runtime DB user/secret creation and role E2E remain blocked pending recovery diagnosis approval.

## N38-B5R Runtime Privilege Recovery Diagnosis

- Runtime privilege recovery diagnosis is documented in `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS.md`.
- The diagnostic runner is an internal Cloud Run Job entrypoint, not a public HTTP route.
- No Firebase Hosting `/api` rewrite was added.
- No frontend direct PostgreSQL access was added.
- No Cloud Run application service deploy happened.
- Runtime hardening retry, runtime DB user/secret creation, and role E2E remain blocked pending a separate fix/rerun approval.

## N38-B5F Runtime Privilege Hardener Recovery

- Runtime privilege hardener recovery is documented in `docs/ADMIN_STAGING_RUNTIME_PRIVILEGE_HARDENER_RECOVERY_REPORT.md`.
- The hardener remains an internal Cloud Run Job entrypoint, not a public HTTP route.
- No Firebase Hosting `/api` rewrite was added.
- No frontend direct PostgreSQL access was added.
- No Cloud Run application service deploy happened.
- Runtime DB user/secret creation and role E2E remain blocked pending a separate approval.
