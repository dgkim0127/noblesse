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
