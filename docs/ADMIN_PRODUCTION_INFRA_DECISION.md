# Admin Production Infrastructure Decision

## Purpose

- Decide the production infrastructure direction before enabling admin_memo write.
- Convert 32J-0 readiness gates into explicit implementation decisions.
- Keep production rollout blocked until the selected runtime, DB, secrets, Auth, admin bootstrap, rewrite, rollback, and QA gates are approved.
- This step is docs-only.

## Current Decision Status

- Local admin_memo dry-run: Go
- Production admin_memo rollout: No-Go
- Production DB/Auth integration: No-Go
- Firebase Hosting /api rewrite: No-Go
- Deploy: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md
- docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md
- docs/ADMIN_WRITE_API_CONTRACT.md
- docs/ADMIN_WRITE_SAFETY_GATES.md
- docs/BACKEND_API_BOUNDARY.md
- docs/BACKEND_IMPLEMENTATION_READINESS.md
- supabase/VALIDATION_NOTES.md

## 1. Production Backend Runtime Decision

Options:

- Cloud Run
- Other equivalent backend runtime
- Firebase Functions later only if explicitly chosen

Recommended direction:

- Cloud Run or equivalent container/runtime for the existing Express backend.

Reason:

- backend already exists as a separate Express app
- Firebase Hosting is static frontend only
- admin write APIs require server-side auth, DB transaction, and secret access
- frontend direct DB access is prohibited

Required before implementation:

- Docker/build/runtime plan
- health route verification
- environment variables from Secret Manager
- service account permission review
- no public unauthenticated write route

Current status:

- Decision planning only
- Not implemented

No-Go:

- Do not deploy backend in 32J-1
- Do not add Firebase rewrite in 32J-1

## 2. Production PostgreSQL Provider Decision

Options:

- Cloud SQL PostgreSQL
- Approved managed PostgreSQL fallback
- Local PostgreSQL is not production
- Frontend Supabase client is not allowed for Noblesse admin writes

Recommended direction:

- Use one approved production PostgreSQL provider only.
- Prefer provider that can be connected safely from backend runtime and managed through approved secret storage.

Required before implementation:

- production DB provider selected
- schema migration process selected
- backup/restore plan
- staging or production-like clone plan
- no manual untracked schema drift
- no connection string in repo/docs/chat

Current status:

- Decision planning only
- Not implemented

No-Go:

- Do not create or connect production DB in 32J-1
- Do not run SQL in 32J-1
- Do not modify supabase/schema.sql in 32J-1

## 3. Secret Storage Decision

Required:

- DATABASE_URL must be stored in Secret Manager or equivalent
- runtime service account must read DB secret
- no DB secret in frontend
- no DB secret in GitHub
- no DB secret in docs
- no DB secret in chat
- no DB secret in Firebase Hosting config

Recommended direction:

- Use Google Secret Manager or equivalent.
- Inject secrets only into backend runtime.
- Keep Vite/frontend environment free of DB secrets.

Current status:

- Decision planning only
- Not implemented

No-Go:

- Do not create secrets in 32J-1
- Do not record secret values
- Do not add DATABASE_URL to frontend env

## 4. Admin Auth Decision

Production target:

- Firebase Auth ID token verification in backend
- PostgreSQL users.auth_uid lookup
- users.role = admin
- users.status = approved
- frontend viewerState is not trusted
- no public admin signup

Required before implementation:

- Firebase Admin SDK/runtime credential strategy
- service account handling
- admin bootstrap strategy
- auth failure QA
- auth success QA
- pending/blocked admin behavior
- requestId propagation

Current status:

- Decision planning only
- Not implemented

No-Go:

- Do not connect Firebase Auth in 32J-1
- Do not create production admin accounts in 32J-1
- Do not trust frontend role state

## 5. Admin Bootstrap Decision

Required:

- controlled way to create first approved admin user
- auth_uid mapped to PostgreSQL users.auth_uid
- role = admin
- status = approved
- bootstrap actor/owner recorded
- disable/rollback path documented
- no public admin signup

Candidate approaches:

- manual migration-time insertion
- controlled one-time script run locally/staging
- protected internal bootstrap endpoint only if explicitly approved later

Recommended:

- Start with manual/controlled bootstrap plan.
- Avoid public bootstrap endpoint.

Current status:

- Decision planning only
- Not implemented

No-Go:

- Do not create admin bootstrap script in 32J-1
- Do not create public admin signup

## 6. Firebase Hosting /api Rewrite Decision

Production target:

- Firebase Hosting serves frontend
- /api/** rewrites to production backend runtime only after backend runtime is ready
- Noblesse hosting target remains noblesse
- POS/default Firebase site must not be touched

Required before rewrite:

- backend production URL ready
- health route verified
- admin auth verified
- admin write QA in staging or production-like environment
- rollback plan
- Firebase target check

Current status:

- Decision planning only
- /api rewrite remains absent

No-Go:

- Do not add Firebase /api rewrite in 32J-1
- Do not deploy Firebase in 32J-1

## 7. Rollback / Disable Decision

Required:

- ability to disable admin write route
- rollback backend deployment
- remove or disable Firebase /api rewrite
- preserve audit_logs
- avoid hard delete
- production incident checklist
- safe operator contact path

Recommended:

- Add feature flag decision before production write route is enabled.
- Keep admin_memo as first and only production write candidate.

Current status:

- Decision planning only
- Not implemented

No-Go:

- No production rollback procedure executed in 32J-1

## 8. Production QA Decision

Required QA before production write enablement:

- GET /api/health
- missing admin token -> UNAUTHORIZED
- invalid admin token -> UNAUTHORIZED
- non-admin -> FORBIDDEN
- pending/blocked admin -> FORBIDDEN
- approved admin can PATCH admin_memo
- audit_logs row inserted
- requestId present
- no raw SQL error leak
- Firebase Hosting /api rewrite smoke test
- rollback/disable test

Current status:

- Planning only
- Not executed

No-Go:

- Do not run production QA in 32J-1

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-1 Judgment |
| --- | --- | --- | --- |
| Backend runtime | Cloud Run or equivalent | Not implemented | Plan only |
| Production PostgreSQL | Approved managed PostgreSQL | Not selected | Plan only |
| Secret storage | Secret Manager or equivalent | Not implemented | Plan only |
| Admin Auth | Firebase ID token + PostgreSQL role check | Not implemented | Plan only |
| Admin bootstrap | Controlled/manual bootstrap | Not implemented | Plan only |
| /api rewrite | Firebase Hosting to backend only after backend ready | Absent | No-Go |
| admin_memo production write | First write candidate only | Local proof only | No-Go |
| status/buyer/product/price/quote writes | Later phases | Blocked | No-Go |

## Recommended Next Phases

### 32J-2

Production backend runtime plan:

- Cloud Run build/deploy plan
- service account plan
- runtime env plan
- no deploy yet

### 32J-3

Production DB and migration plan:

- provider selection
- schema migration path
- backup/restore
- staging clone

### 32J-4

Secret Manager plan:

- secret names
- access policy
- local vs production separation

### 32J-5

Firebase Auth admin verification plan:

- ID token verification
- users.auth_uid mapping
- admin bootstrap

### 32J-6

Staging or production-like admin_memo dry-run plan

### 32J-7

Firebase Hosting /api rewrite plan

### 32J-8

Production rollout checklist

Important:

- Do not jump directly to deployment.
- Do not enable production write before Auth/DB/Secret/Runtime gates are satisfied.

## E-commerce Terms Guardrail

- Do not import or reuse unrelated commerce-heavy policy language as Noblesse wording.
- Noblesse remains a B2B catalog/inquiry site.
- Terms/legal review remains separate.
- No online order-completion flow is enabled by this document.

## 32J-2 Production Backend Runtime Plan Follow-up

- Production backend runtime planning is documented in `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`.
- 32J-2 refines the Cloud Run/equivalent runtime plan but does not deploy anything.
- Dockerfile, Cloud Build, Cloud Run, Secret Manager, production DB/Auth, Firebase `/api` rewrite, and deploy remain unimplemented.

## 32J-3 Production DB Migration Plan Follow-up

- Production DB and migration planning is documented in `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`.
- 32J-3 refines DB/provider/migration planning but does not create or connect a DB.
- SQL execution, schema/migration file changes, production DB/Auth integration, Secret Manager, Firebase `/api` rewrite, and deploy remain blocked.

## 32J-4 Production Secret Manager Plan Follow-up

- Production secret management planning is documented in `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`.
- 32J-4 refines secret storage, naming, access, separation, rotation, and no-leak checks but does not create secrets.
- Secret Manager provisioning, IAM changes, runtime injection, production DB/Auth integration, Firebase `/api` rewrite, and deploy remain blocked.

## 32J-5 Admin Firebase Auth Verification Plan Follow-up

- Firebase Auth admin verification planning is documented in `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`.
- 32J-5 refines ID token verification, PostgreSQL admin mapping, credential strategy, and auth QA planning but does not connect Firebase Auth.
- Firebase Admin SDK wiring, credentials, admin bootstrap, production DB/Auth integration, Firebase `/api` rewrite, and deploy remain blocked.

## 32J-6 Admin Bootstrap Plan Follow-up

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- Production rollout remains blocked until the first admin creation, disable/rollback, Auth, DB, secret, runtime, rewrite, and QA gates are approved.
- No admin account, bootstrap script, DB write, Firebase Auth integration, rewrite, or deploy was added in 32J-6.

## 32J-7 Admin Staging Memo Dry-run Plan Follow-up

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- Production rollout remains blocked until staging/prod-like dry-run, Auth, DB, secret, runtime, bootstrap, rewrite, rollback, and QA gates are approved.
- No staging DB, production-like clone, Auth integration, Secret Manager secret, rewrite, or deploy was added in 32J-7.

## 32J-8 Admin Firebase API Rewrite Plan Follow-up

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Production rollout remains blocked until backend runtime URL, Auth, DB, secret, bootstrap, staging dry-run, rewrite, rollback, and QA gates are approved.
- No Firebase config change, rewrite, deploy, Cloud Run connection, or POS/default site change was added in 32J-8.

## 32J-9 Admin Production Rollout Checklist Follow-up

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- Production rollout remains blocked because every production gate is currently No-Go.
- No implementation, Cloud action, DB/Auth/Secret integration, Firebase config change, rewrite, or deploy was added in 32J-9.
