# Admin Production Backend Runtime Plan

## Purpose

- Plan the production backend runtime required before enabling admin_memo write.
- Convert the 32J-1 runtime decision into a deployable architecture plan.
- Keep implementation, Cloud Run creation, Secret Manager creation, Firebase rewrite, and production deploy blocked.
- This step is docs-only.

## Current Decision Status

- Runtime planning: Go
- Runtime implementation: No-Go
- Cloud Run deployment: No-Go
- Production DB/Auth integration: No-Go
- Firebase Hosting /api rewrite: No-Go
- Production admin_memo rollout: No-Go

## Inputs Reviewed

- docs/ADMIN_PRODUCTION_INFRA_DECISION.md
- docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md
- docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md
- docs/ADMIN_WRITE_API_CONTRACT.md
- docs/ADMIN_WRITE_SAFETY_GATES.md
- docs/BACKEND_API_BOUNDARY.md
- docs/BACKEND_IMPLEMENTATION_READINESS.md
- backend/src/app.js
- backend/src/server.js
- backend/package.json

## Runtime Architecture

Recommended target:

Firebase Hosting static frontend
-> future /api/** rewrite
-> Cloud Run or equivalent backend runtime
-> Express backend
-> production PostgreSQL through server-side secret
-> Firebase Auth token verification in backend
-> audit_logs transaction for admin writes

Important:

- Firebase Hosting currently serves only static frontend.
- /api rewrite remains absent.
- Production frontend does not call admin API yet.
- Existing Express backend is the runtime candidate.
- Direct React-to-PostgreSQL access remains prohibited.

Current status:

- architecture planned only
- no runtime deployed

## Runtime Candidate

Recommended:

- Cloud Run or equivalent container/runtime.

Reason:

- Existing backend is an Express app.
- Admin write APIs require server-side validation.
- Admin write APIs require server-side Firebase token verification.
- Admin write APIs require PostgreSQL transaction control.
- Admin write APIs require server-only secret access.
- Firebase Hosting alone is not sufficient for backend writes.

Not selected in this step:

- Firebase Functions
- frontend-only admin writes
- direct PostgreSQL from React
- Supabase client from frontend for admin writes

Current status:

- candidate selected for planning
- not deployed

## Future Build / Container Plan

Future candidate files:

- backend/Dockerfile
- backend/.dockerignore
- cloudbuild.yaml or equivalent only if approved later

Required future Docker/runtime properties:

- Node runtime
- install backend dependencies from backend/package.json
- start backend server from backend entrypoint
- listen on runtime PORT
- expose health route
- no frontend build inside backend container unless explicitly chosen
- no secrets baked into image
- no DATABASE_URL in Dockerfile
- no Firebase credential file baked into image

Current status:

- no Dockerfile created in 32J-2
- no image built in 32J-2
- no Cloud Build in 32J-2

No-Go:

- Do not create Dockerfile in 32J-2
- Do not run docker build in 32J-2
- Do not run gcloud deploy in 32J-2

## Runtime Environment Variables

Future runtime env candidates:

- NODE_ENV=production
- PORT provided by runtime
- DATABASE_URL from Secret Manager only
- FIREBASE_PROJECT_ID or equivalent non-secret config
- ADMIN_WRITE_ENABLED or equivalent feature flag candidate
- CORS/allowed origin config if required

Rules:

- DATABASE_URL must be server-side only.
- No DB secret in frontend.
- No DB secret in Firebase Hosting config.
- No DB secret in repo/docs/chat.
- No service account JSON in repo.
- No production credential in .env.example unless placeholder only.

Current status:

- env planning only
- no secret created
- no env added

## Service Account / Permission Plan

Future runtime service account needs:

- read approved DB secret from Secret Manager or equivalent
- connect to production PostgreSQL provider if Cloud SQL or equivalent is selected
- write application logs
- no broad owner/admin permissions
- least privilege review before deploy

Required before implementation:

- service account name decision
- permission list review
- secret access scope review
- production DB network access decision
- rollback/disable permissions

Current status:

- planning only
- no service account created
- no IAM change

No-Go:

- Do not create service account in 32J-2
- Do not modify IAM in 32J-2

## Health / Readiness Plan

Existing:

- GET /api/health exists in backend scaffold.

Future required:

- Cloud Run health smoke test
- backend can start without frontend
- requestId exists in responses where applicable
- DB-dependent readiness must not expose secret/error details
- admin write route remains protected

Recommended:

- Keep /api/health no-auth and safe.
- Add DB readiness only if it does not leak internals.
- Do not expose DB connection string or raw SQL errors.

Current status:

- health route exists locally
- production runtime health not executed

## Origin / CORS Boundary

Future production frontend:

- https://noblesse.web.app or approved custom domain

Future backend:

- Cloud Run or equivalent backend URL

Plan:

- Prefer Firebase Hosting /api rewrite so browser calls same-origin /api.
- Avoid exposing backend CORS widely.
- If direct backend origin is temporarily used, restrict allowed origins.

Current status:

- no /api rewrite
- production frontend does not call admin API
- no CORS production config added

No-Go:

- Do not add CORS package or config in 32J-2
- Do not expose wildcard admin write CORS

## Feature Flag / Disable Plan

Recommended future feature flags:

- ADMIN_API_ENABLED
- ADMIN_MEMO_WRITE_ENABLED

Purpose:

- disable admin writes without removing runtime
- keep read routes separate from write routes
- allow emergency rollback/disable

Rules:

- default should be disabled until rollout approval
- admin_memo is the only first production write candidate
- status/buyer/product/price/quote writes remain disabled

Current status:

- feature flag planning only
- no code implemented

## Runtime Rollout Sequence

Recommended sequence:

1. Approve backend runtime plan.
2. Create container/Docker plan.
3. Create Secret Manager plan.
4. Create production DB plan.
5. Create Firebase Auth/admin verification plan.
6. Create admin bootstrap plan.
7. Implement runtime configuration locally/staging.
8. Deploy backend runtime to staging or production-like environment.
9. Verify GET /api/health on backend URL.
10. Verify admin auth failure cases.
11. Verify admin_memo write in staging/production-like environment.
12. Only then plan Firebase Hosting /api rewrite.

No-Go:

- Do not add Firebase /api rewrite before backend runtime health and auth are verified.
- Do not expose production admin write before admin auth and DB secret gates are satisfied.

## Runtime Rollback Plan

Required future rollback:

- previous backend revision available
- feature flag can disable admin_memo write
- Firebase /api rewrite can be reverted or disabled
- Secret access can be revoked
- admin bootstrap account can be blocked
- audit_logs preserved

Current status:

- rollback planning only
- not executed

No-Go:

- no production rollback action in 32J-2

## Runtime QA Plan

Required before enabling production write:

- backend starts successfully
- GET /api/health returns 200
- requestId available
- missing admin token -> UNAUTHORIZED
- invalid admin token -> UNAUTHORIZED
- non-admin -> FORBIDDEN
- approved admin can call memo route
- admin_memo write inserts audit_logs
- raw SQL errors are not exposed
- feature flag disable path works
- rollback path works

Current status:

- planning only
- no runtime QA executed

## Go / No-Go

Go:

- production backend runtime planning
- Cloud Run/equivalent as candidate runtime
- future container plan
- future Secret Manager integration plan
- future health/runtime QA plan

No-Go:

- Cloud Run deployment
- Dockerfile creation
- Cloud Build execution
- production DB connection
- Secret Manager creation
- Firebase Auth integration
- Firebase Hosting /api rewrite
- Firebase deploy
- production admin_memo write
- status/buyer/product/price/quote writes

Next recommended step:

- 32J-3: Production DB and migration plan
- or 32J-2A: backend Docker/runtime implementation plan if runtime plan needs more detail before DB planning

## 32J-3 Production DB Migration Plan Follow-up

- Production DB and migration planning is documented in `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`.
- Runtime remains unimplemented.
- Backend runtime deployment still waits for approved DB, secret, Auth, staging/clone, rewrite, and QA gates.

## 32J-4 Production Secret Manager Plan Follow-up

- Production secret management planning is documented in `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`.
- Runtime remains unimplemented.
- No secret was created, injected, or granted to a runtime service account in 32J-4.

## 32J-5 Admin Firebase Auth Verification Plan Follow-up

- Firebase Auth admin verification planning is documented in `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`.
- Runtime remains unimplemented.
- Production admin auth still requires approved runtime credentials, DB mapping, admin bootstrap, and QA.

## 32J-6 Admin Bootstrap Plan Follow-up

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- Backend runtime still waits for approved admin bootstrap, Auth, DB, secret, rollback, and QA gates.
- No bootstrap route, script, runtime config, Firebase Auth integration, DB connection, rewrite, or deploy was added in 32J-6.

## 32J-7 Admin Staging Memo Dry-run Plan Follow-up

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- Staging dry-run requires runtime health and auth failure/success checks before production promotion.
- Runtime remains unimplemented.

## 32J-8 Admin Firebase API Rewrite Plan Follow-up

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Backend URL must belong to an approved production runtime before rewrite is added.
- Runtime remains unimplemented and no backend URL was connected in 32J-8.

## 32J-9 Admin Production Rollout Checklist Follow-up

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- The backend runtime gate remains No-Go in the rollout checklist.
- No runtime implementation, Cloud Run service, Cloud Build action, backend URL connection, rewrite, or deploy was added in 32J-9.

## 32K-1 Backend Container Artifact Follow-up

- `backend/Dockerfile` and `backend/.dockerignore` were added as local backend runtime container artifacts.
- The container artifact is backend-only and does not copy the frontend `dist` output.
- No Docker build, Docker run, Cloud Build, Cloud Run deploy, Secret Manager setup, Firebase rewrite, Firebase deploy, DB/Auth integration, or production runtime QA was run.
- No secret value is baked into the image; production runtime configuration remains external and blocked until separate approval.
- Runtime implementation remains a local artifact only.

## 32K-2 Local Container Smoke Follow-up

- Local container smoke result is documented in `docs/ADMIN_BACKEND_CONTAINER_LOCAL_SMOKE_REPORT.md`.
- Docker build/run was blocked because Docker CLI was unavailable in the current terminal session.
- Backend tests passed before the blocked smoke step.
- Production runtime deployment remains No-Go.
- No Cloud Run, Cloud Build, gcloud, Secret Manager, Firebase rewrite, Firebase deploy, DB/Auth integration, SQL execution, or secret handling was performed.

## 32K-2N Local Node Smoke Follow-up

- Local non-container Node backend smoke is documented in `docs/ADMIN_BACKEND_LOCAL_NODE_SMOKE_REPORT.md`.
- `/api/health` passed on a local development server without DB or Firebase credentials.
- `/api/admin/dashboard` without a token returned `UNAUTHORIZED`.
- Docker container smoke remains No-Go until Docker is available.
- Production runtime deployment remains No-Go.

## 32K-3 Cloud Run Source Deploy Planning Follow-up

- Cloud Run source deploy planning is documented in `docs/ADMIN_CLOUD_RUN_SOURCE_DEPLOY_PLAN.md`.
- Local Docker smoke remains No-Go because Docker CLI is unavailable in the current terminal session.
- Local Docker smoke is not an absolute blocker for 32K progression because Cloud Run source deploy can build remotely through Cloud Build after separate approval.
- The recommended path is Cloud Run source deploy using the existing `backend/Dockerfile` via Cloud Build.
- Buildpacks remain a fallback option only, not the current primary path.
- Actual Cloud Run deployment remains No-Go.
- No Cloud Build, Cloud Run service, Secret Manager setup, Firebase rewrite, Firebase deploy, DB/Auth integration, SQL execution, or secret handling was performed in 32K-3.

## 32K-4 Cloud Run Deploy Approval Checklist Follow-up

- Cloud Run pre-deploy checklist and placeholder runtime deploy spec are documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_APPROVAL_CHECKLIST.md`.
- Runtime deploy remains No-Go.
- Deploy requires confirmed project, region, service name, runtime service account, secret strategy, Auth strategy, staging dry-run plan, rollback plan, and POS/default site protection.
- Cloud Run runtime contract checks must be verified before deploy approval.
- No Cloud Build, Cloud Run service, Secret Manager setup, Firebase rewrite, Firebase deploy, DB/Auth integration, SQL execution, or secret handling was performed in 32K-4.
