# Admin Memo Production Readiness Gate

## Purpose

- Record what is required before admin_memo write can be enabled in production.
- Preserve the result of 32I local dry-run.
- Keep production write rollout blocked until Auth, DB, secrets, backend hosting, Firebase rewrite, admin bootstrap, rollback, and QA gates are satisfied.
- This step is docs-only.

## Current Decision

- Local admin_memo dry-run: Go
- Production admin_memo rollout: No-Go
- Status/buyer/product/price/quote writes: No-Go
- Production DB/Auth integration: No-Go

## 32I Evidence

- Local DB write updated one inquiry admin_memo.
- audit_logs insert was verified.
- audit action: admin.inquiry.memo.update
- connection string/password was not recorded in repo/docs.
- frontend src changes were not staged or committed by 32I.

## Required Before Production Rollout

### 1. Production backend runtime

Required:

- Cloud Run or equivalent backend runtime
- Express backend deployed separately from Firebase Hosting static frontend
- health route verified
- admin route not publicly writable without auth

Status:

- Not implemented

### 2. Production PostgreSQL provider

Required:

- Cloud SQL or approved fallback
- production database created
- schema applied through approved migration process
- no manual untracked schema drift
- backup/restore plan

Status:

- Not implemented

### 3. Secret storage

Required:

- DATABASE_URL stored in Google Secret Manager or equivalent
- no DB secret in frontend
- no DB secret in GitHub/docs/chat
- runtime service account allowed to read secret

Status:

- Not implemented

### 4. Firebase Auth / Admin auth

Required:

- Firebase ID token verification in backend
- users.auth_uid lookup
- users.role = admin
- users.status = approved
- no frontend viewerState trust
- no public admin signup

Status:

- Not implemented

### 5. Admin bootstrap

Required:

- manual approved admin user insertion during production migration or controlled bootstrap
- bootstrap owner recorded
- rollback/disable path recorded

Status:

- Not implemented

### 6. Transaction and audit

Already proven locally:

- update admin_memo
- insert audit_logs
- same transaction behavior path

Required before production:

- verify against production-like staging/local clone
- verify rollback behavior
- verify requestId propagation
- verify no raw SQL leak

Status:

- Partially proven locally only

### 7. Firebase Hosting /api rewrite

Required:

- add /api/** rewrite to Cloud Run only after backend is production-ready
- verify existing Noblesse hosting target remains noblesse
- POS/default site must not be touched

Status:

- Not implemented

### 8. Production QA

Required:

- GET /api/health
- admin auth failure cases
- admin auth success case
- PATCH /api/admin/inquiries/:inquiryId/memo
- audit_logs verification
- production URL smoke test
- rollback test

Status:

- Not executed

## Recommended Rollout Sequence

1. Production backend runtime plan
2. Production PostgreSQL migration plan
3. Secret Manager setup plan
4. Firebase Auth admin verification plan
5. Admin bootstrap plan
6. Staging or production-like dry-run
7. Firebase Hosting /api rewrite plan
8. Production deployment
9. Production admin_memo QA
10. Rollback/disable verification

Important:

- Do not enable write route in production until steps 1-6 are complete.
- Do not add Firebase /api rewrite before backend runtime is ready.
- Do not expose admin frontend until backend auth is ready.

## Explicit No-Go Items

Still blocked:

- production DB write
- production Firebase Auth integration
- Firebase /api rewrite
- Cloud Run deployment
- status/admin_status write
- buyer approval/block write
- product write
- product price write
- quote write
- hard delete
- payment/checkout/order routes
- frontend direct DB write

## 32J-1 Production Infrastructure Decision Follow-up

- Production infrastructure direction is refined in `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`.
- 32J-1 is decision planning only and does not unlock production rollout.
- Runtime, production DB, secret storage, Auth/admin verification, admin bootstrap, Firebase `/api` rewrite, rollback, and production QA remain required.

## 32J-2 Production Backend Runtime Plan Follow-up

- Production backend runtime planning is documented in `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`.
- Runtime remains unimplemented.
- Admin memo production rollout remains blocked until runtime, Auth, DB, secret, rewrite, rollback, and QA gates are satisfied.

## 32J-3 Production DB Migration Plan Follow-up

- Production DB and migration planning is documented in `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`.
- Production DB readiness remains No-Go until provider, migration, backup, staging/clone, and DB role gates are approved.
- Local dry-run proof still does not unlock production DB writes.

## 32J-4 Production Secret Manager Plan Follow-up

- Production secret management planning is documented in `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`.
- The production secret gate remains unsatisfied until approved secret storage and runtime access are implemented.
- No secret creation, IAM grant, runtime injection, DB/Auth integration, rewrite, or deploy was performed.
