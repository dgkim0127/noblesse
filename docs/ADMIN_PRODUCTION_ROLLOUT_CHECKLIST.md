# Admin Production Rollout Checklist

## Purpose

- Combine runtime, DB, secret, Auth, bootstrap, staging dry-run, Firebase rewrite, QA, and rollback gates into one production rollout checklist.
- Define what must be true before admin_memo can be enabled in production.
- Keep implementation, Firebase config changes, production DB/Auth integration, Cloud Run deployment, Secret Manager creation, and production rollout blocked.
- This step is docs-only.

## Current Decision Status

- Production rollout checklist: Go
- Production rollout execution: No-Go
- Cloud Run deployment: No-Go
- Production DB creation/connection: No-Go
- Secret creation/runtime injection: No-Go
- Firebase Auth integration: No-Go
- Admin bootstrap execution: No-Go
- Staging dry-run execution: No-Go
- Firebase Hosting `/api` rewrite: No-Go
- Production admin_memo write: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`
- `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`
- `docs/ADMIN_BOOTSTRAP_PLAN.md`
- `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`
- `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`
- `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`
- `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`
- `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`
- `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`
- `docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md`
- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- `supabase/VALIDATION_NOTES.md`
- `firebase.json`
- `.firebaserc`

## Executive Go / No-Go Summary

Current status:

- Local admin_memo proof: Go
- Production rollout readiness: No-Go
- Production admin_memo write: No-Go
- All other writes: No-Go

Reason:

- Runtime is not deployed.
- Production DB is not selected or created.
- Secret Manager is not provisioned.
- Firebase Auth verification is not implemented for production.
- Admin bootstrap is not executed.
- Staging/prod-like dry-run is not executed.
- Firebase `/api` rewrite is absent.
- Production QA is not executed.
- Rollback is planned but not tested.

Conclusion:

- Do not enable production admin_memo.
- Do not add Firebase `/api` rewrite.
- Do not deploy backend runtime.
- Do not connect production DB/Auth/Secret yet.

## Gate 1. Backend Runtime

Required before production:

- Cloud Run or equivalent backend runtime selected
- Docker/build/runtime implementation approved
- backend starts independently from frontend
- `GET /api/health` works on backend runtime URL
- logs include requestId where applicable
- no public unauthenticated admin write route
- runtime rollback path available

Current status:

- Planned only
- `backend/Dockerfile` exists.
- Local Node backend smoke: Go.
- Local Docker smoke: No-Go / optional, because Docker CLI is unavailable in the current terminal session.
- Cloud Run source deploy plan: documented by 32K-3 in `docs/ADMIN_CLOUD_RUN_SOURCE_DEPLOY_PLAN.md`.
- Production runtime deploy: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`

## Gate 2. Production DB / Migration

Required before production:

- production PostgreSQL provider selected
- production DB created through approved process
- schema migration process approved
- backup/restore plan implemented
- staging or production-like clone available
- runtime DB role created with least privilege
- migration role separated from runtime role
- `audit_logs` verified
- `inquiries.admin_memo` verified

Current status:

- Planned only
- Provider not selected
- DB not created
- SQL not executed

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`

## Gate 3. Secret Management

Required before production:

- production `DATABASE_URL` stored in Secret Manager or equivalent
- staging `DATABASE_URL` separate from production
- runtime service account can read only required secrets
- no DB secret in frontend
- no DB secret in Firebase Hosting config
- no DB secret in Dockerfile/cloudbuild
- no DB secret in repo/docs/chat
- secret rotation/disable path documented
- no-leak search passed

Current status:

- Planned only
- No secret created
- No IAM grant
- No runtime injection

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`

## Gate 4. Firebase Auth / Admin Authorization

Required before production:

- Firebase ID token verification implemented in backend
- Authorization Bearer token required
- decoded uid mapped to `users.auth_uid`
- `users.role = admin` required
- `users.status = approved` required
- missing/invalid/expired token returns `UNAUTHORIZED`
- non-admin/pending/blocked returns `FORBIDDEN`
- frontend viewerState not trusted
- raw token not logged
- requestId preserved

Current status:

- Planned only
- Production Firebase Auth verification not connected
- Production auth lookup not connected

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`

## Gate 5. Admin Bootstrap

Required before production:

- first admin creation method approved
- Firebase uid known and verified
- `users.auth_uid` set
- `users.role = admin`
- `users.status = approved`
- owner/reviewer recorded
- no public admin signup
- disable/rollback path documented
- audit trail planned or implemented

Current status:

- Planned only
- No admin user created
- No bootstrap script
- No bootstrap endpoint

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_BOOTSTRAP_PLAN.md`

## Gate 6. Staging / Production-like Dry-run

Required before production:

- staging/prod-like DB available
- staging secret separate from production
- safe admin bootstrap available
- safe inquiry data available
- backend runtime health verified
- auth failure cases verified
- approved admin success case verified
- `audit_logs` count before/after verified
- latest action = `admin.inquiry.memo.update`
- rollback/disable validation passed
- sanitized staging dry-run report completed

Current status:

- Planned only
- Not executed

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`
- `docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md`

## Gate 7. Firebase Hosting /api Rewrite

Required before production:

- backend runtime URL approved
- backend `/api/health` verified
- Firebase target confirmed as `noblesse`
- public directory remains `dist`
- `/api` rewrite syntax reviewed
- deploy command scoped to `hosting:noblesse`
- POS/default site protected
- rollback plan reviewed
- Firebase deploy log QA checklist ready

Current status:

- Planned only
- `/api` rewrite absent
- firebase.json unchanged
- `.firebaserc` unchanged
- no deploy

Rollout judgment:

- No-Go

Evidence:

- `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`

## Gate 8. Production QA

Required before production write enablement:

- `/` route loads
- `/products/NB-001` loads
- `/register` loads
- `/api/health` returns backend health through Hosting
- missing token -> `UNAUTHORIZED`
- invalid token -> `UNAUTHORIZED`
- non-admin -> `FORBIDDEN`
- pending/blocked admin -> `FORBIDDEN`
- approved admin can update admin_memo only when feature flag enabled
- `audit_logs` inserted
- requestId present
- no raw SQL/Auth/secret leak
- POS/default site unaffected
- rollback smoke test passed

Current status:

- Not executed

Rollout judgment:

- No-Go

## Gate 9. Rollback / Disable

Required before production:

- feature flag or equivalent can disable admin_memo write
- backend revision rollback path available
- Firebase `/api` rewrite rollback path available
- runtime secret access can be revoked
- admin can be blocked through `users.status`
- `audit_logs` preserved
- static catalog frontend remains available
- incident owner/contact path known

Current status:

- Planned only
- Not executed

Rollout judgment:

- No-Go

## Required Rollout Sequence

1. Approve backend runtime implementation.
2. Implement runtime/container only after approval.
3. Select production DB provider.
4. Approve migration process.
5. Create staging/prod-like DB first.
6. Create approved secrets.
7. Implement Firebase Auth verification.
8. Complete controlled admin bootstrap.
9. Run staging/prod-like admin_memo dry-run.
10. Review staging report.
11. Approve Firebase `/api` rewrite.
12. Deploy `hosting:noblesse` only.
13. Run production smoke QA.
14. Enable admin_memo write only if feature flag/gates approve.
15. Keep status/buyer/product/price/quote writes disabled.

No-Go:

- Do not skip staging.
- Do not deploy rewrite before backend/Auth/DB/Secret gates.
- Do not enable write before rollback path exists.
- Do not broaden to other writes.

## Rollout Approval Table

| Gate | Required Evidence | Current Status | Rollout Judgment |
| --- | --- | --- | --- |
| Runtime | container artifact plus backend health URL | Container artifact added; local Node smoke Go; local Docker smoke No-Go / optional; Cloud Run source deploy plan documented; production health URL missing | No-Go |
| Production DB | provider + migrated schema | Missing | No-Go |
| Secret | Secret Manager + runtime access | Missing | No-Go |
| Auth | Firebase token + users role/status | Missing | No-Go |
| Bootstrap | first approved admin | Missing | No-Go |
| Staging dry-run | sanitized report | Missing | No-Go |
| Firebase rewrite | reviewed config + rollback | Missing | No-Go |
| Production QA | smoke + auth + audit | Missing | No-Go |
| Rollback | disable + revert path | Missing | No-Go |
| admin_memo production write | all gates pass | Blocked | No-Go |

## Explicitly Blocked Until Separate Approval

Still blocked:

- Cloud Run deployment
- Cloud Build execution
- Dockerfile/cloudbuild creation
- production DB creation
- production DB connection
- SQL execution
- schema/migration file changes
- Secret Manager secret creation
- IAM changes
- Firebase Auth integration
- Firebase Admin SDK dependency changes
- service account credential creation
- admin bootstrap execution
- Firebase `/api` rewrite
- Firebase deploy
- frontend admin integration
- production admin_memo write
- status/buyer/product/price/quote writes
- hard delete
- payment/checkout/order routes
- frontend direct DB write

## 32K Implementation Boundary

32K may begin only after explicit approval.

Candidate 32K phases:

- 32K-0 source dirty cleanup or isolation
- 32K-1 backend runtime implementation plan to code
- 32K-2 Firebase Auth mock-to-real implementation plan
- 32K-3 staging DB setup plan
- 32K-4 Secret Manager setup plan
- 32K-5 admin_memo feature flag implementation
- 32K-6 staging dry-run execution
- 32K-7 Firebase `/api` rewrite implementation
- 32K-8 production rollout

Required before 32K:

- user approval
- branch/status check
- no broad git add
- secret handling plan
- rollback plan
- POS/default site protection

## 32K-1 Runtime Artifact Follow-up

- Container artifact added: Yes, `backend/Dockerfile` and `backend/.dockerignore`.
- Backend runtime deployment: No-Go.
- Backend health URL: Missing.
- Docker build/run: Not run.
- Cloud Build/Cloud Run deploy: Not run.
- Secret, Auth, DB, Firebase rewrite, and production rollout remain blocked.

## 32K-2 Local Container Smoke Follow-up

- Local container smoke: No-Go, Docker CLI unavailable in current terminal session.
- Backend runtime deployment: No-Go.
- Backend production health URL: Missing.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo rollout remains blocked.

## 32K-2N Local Node Smoke Follow-up

- Local Node backend smoke: Pass.
- Local container smoke: No-Go until Docker is available.
- Backend runtime deployment: No-Go.
- Backend production health URL: Missing.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo rollout remains blocked.

## 32K-3 Cloud Run Source Deploy Plan Follow-up

- Cloud Run source deploy planning is documented in `docs/ADMIN_CLOUD_RUN_SOURCE_DEPLOY_PLAN.md`.
- Recommended build path: existing `backend/Dockerfile` via Cloud Build after separate approval.
- Buildpacks are documented as an alternative, not the current recommendation.
- Docker Desktop is not mandatory for 32K progression.
- Local Node smoke: Go.
- Local Docker smoke: No-Go / optional.
- Production runtime deploy: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.
- No Cloud Build, Cloud Run service, Firebase deploy, DB/Auth/Secret connection, SQL execution, or frontend source staging was performed.

## 32K-4 Cloud Run Deploy Approval Checklist Follow-up

- Cloud Run deploy approval checklist is documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_APPROVAL_CHECKLIST.md`.
- Local Node smoke: Go.
- Local Docker smoke: No-Go / optional.
- Cloud Run source deploy plan: documented by 32K-3.
- Cloud Run deploy approval checklist: documented by 32K-4.
- Production runtime deploy: No-Go.
- Secret Manager integration: No-Go.
- Firebase Auth backend integration: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.

## 32K-5 Cloud Run Deploy Values Decision Follow-up

- Cloud Run deploy values decision is documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_VALUES_DECISION.md`.
- Runtime gate remains No-Go.
- Actual project, region, service name, runtime service account, secret strategy, startup policy, ingress policy, and rollback owner still require approval.
- Secret Manager integration: No-Go.
- Firebase Auth backend integration: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.

## 32K-6 Health-only Startup Follow-up

- Health-only startup support: implemented.
- Local backend tests include health-only production startup and admin no-token fail-closed checks.
- Production runtime deployment: No-Go.
- Production health URL: Missing.
- Secret Manager integration: No-Go.
- Firebase Auth backend integration: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.

## 32K-7 Health-only Entrypoint Smoke Follow-up

- Local Node smoke: Go.
- Health-only entrypoint smoke: Go.
- Health-only smoke report: `docs/ADMIN_BACKEND_HEALTH_ONLY_ENTRYPOINT_SMOKE_REPORT.md`.
- Local Docker smoke: No-Go until Docker is available.
- Production runtime deploy: No-Go.
- Secret Manager integration: No-Go.
- Firebase Auth backend integration: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.

## 32K-8 gcloud Preflight Follow-up

- Health-only entrypoint smoke: Go.
- gcloud preflight: No-Go because gcloud CLI is unavailable in the current terminal session.
- Required API readiness: Unknown.
- Cloud Run deploy: No-Go.
- Cloud Build execution: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo write: No-Go.
