# Admin Staging Memo Dry-run Plan

## Purpose

- Plan a staging or production-like admin_memo dry-run before production rollout.
- Define staging DB, staging secret, safe bootstrap, safe data, Auth strategy, audit verification, rollback validation, and promotion gates.
- Keep actual staging DB creation, SQL execution, Auth integration, Secret Manager creation, Cloud Run deployment, Firebase rewrite, and production rollout blocked.
- This step is docs-only.

## Current Decision Status

- Staging dry-run planning: Go
- Staging DB creation: No-Go
- Staging secret creation: No-Go
- Auth integration: No-Go
- Admin bootstrap execution: No-Go
- DB write execution: No-Go
- Firebase Hosting `/api` rewrite: No-Go
- Production admin_memo rollout: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- `docs/ADMIN_BOOTSTRAP_PLAN.md`
- `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`
- `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`
- `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`
- `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`
- `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`
- `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`
- `docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md`
- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- `supabase/VALIDATION_NOTES.md`

## Staging Dry-run Architecture

Future target:

```text
safe admin identity
-> Firebase Auth or approved staging auth strategy
-> backend runtime or local/staging backend
-> staging/prod-like PostgreSQL
-> PATCH /api/admin/inquiries/:inquiryId/memo
-> update inquiries.admin_memo
-> insert audit_logs
-> verify rollback/disable behavior
```

Important:

- staging is not production
- production customer data must not be used unless explicitly approved and sanitized
- production DB must not be written
- frontend must not write directly to DB
- secret values must not be recorded

Current status:

- architecture planned only
- no staging runtime or DB created

## Staging DB Requirements

Required:

- staging or disposable production-like PostgreSQL
- same schema as intended production target
- `inquiries.admin_memo` column exists
- `audit_logs` table and required fields exist
- `users.auth_uid` exists
- safe sample data only
- backup/restore or disposable reset path
- no production write

Required sample data:

- one safe approved admin candidate
- one safe buyer/trade account
- one safe inquiry
- `audit_logs` initially measurable
- no real customer secrets

Current status:

- planning only
- staging DB not created

No-Go:

- do not create staging DB in 32J-7
- do not run SQL in 32J-7
- do not use production DB

## Staging Secret Requirements

Required:

- staging `DATABASE_URL` separate from production `DATABASE_URL`
- secret stored in Secret Manager or equivalent
- no secret in frontend
- no secret in docs/GitHub/chat
- no secret in Firebase Hosting config
- local dry-run DB URL must not be promoted to staging/production

Required checks:

- staging secret name selected
- runtime service account access planned
- secret rotation/disable path planned
- no-leak search before and after dry-run

Current status:

- planning only
- no staging secret created

No-Go:

- do not create Secret Manager secret in 32J-7
- do not write secret values

## Safe Admin Bootstrap For Staging

Required:

- safe staging Firebase uid or approved mock/staging auth identity
- PostgreSQL `users.auth_uid` mapped to staging uid
- `users.role = admin`
- `users.status = approved`
- owner/reviewer recorded
- disable path available
- no public admin signup

Rules:

- do not use production admin identity unless explicitly approved
- do not expose uid/token/credential in docs
- do not allow frontend role assignment
- do not create public bootstrap endpoint

Current status:

- planning only
- no bootstrap executed

## Staging Auth Strategy

Options:

- real Firebase ID token verification in staging
- mock/staging verifier if explicitly approved
- local backend with injected admin viewer only for non-production verification

Recommended:

- For production-like staging, prefer real Firebase ID token verification with safe staging user.
- For earlier dry-run, a mock/staging verifier can validate backend behavior but cannot replace final Auth QA.

Required before promotion:

- missing token -> `UNAUTHORIZED`
- invalid token -> `UNAUTHORIZED`
- non-admin -> `FORBIDDEN`
- pending/blocked admin -> `FORBIDDEN`
- approved admin -> allowed
- requestId present
- no raw token log

Current status:

- planning only
- auth not connected

## Safe Sample Data Plan

Allowed:

- synthetic buyer
- synthetic inquiry
- generic admin memo text
- safe product/category references if required

Forbidden:

- real customer personal data
- real buyer trade secrets
- real production inquiry contents
- real DB credentials
- raw Firebase token
- raw `auth_uid` if unnecessary

Sample data rules:

- must be removable/resettable
- must not be used for production analytics
- must be clearly labeled as staging/dry-run
- must not trigger customer-facing emails/messages

Current status:

- planning only
- no seed inserted

## Planned Staging Dry-run Sequence

Future sequence:

1. Confirm staging DB and schema.
2. Confirm staging secret is available only to backend runtime.
3. Confirm safe admin bootstrap exists.
4. Confirm safe inquiry exists.
5. Confirm backend runtime health.
6. Confirm auth failure cases.
7. Confirm approved admin auth success.
8. Capture `audit_logs` count before.
9. PATCH `admin_memo`.
10. Verify response includes inquiry, auditLogId, requestId.
11. Verify `inquiries.admin_memo` changed.
12. Verify `audit_logs` count increased.
13. Verify latest action = `admin.inquiry.memo.update`.
14. Verify rollback/disable behavior.
15. Record sanitized report.
16. Do not promote automatically to production.

Current status:

- planned only
- not executed

## Rollback / Disable Validation

Required:

- admin_memo write can be disabled by feature flag or route gate
- blocked admin receives `FORBIDDEN`
- previous backend revision can be restored
- staging secret access can be revoked
- `audit_logs` remain preserved
- sample inquiry can be reset
- no hard delete required

Validation cases:

- `ADMIN_MEMO_WRITE_ENABLED=false` blocks write
- `users.status=blocked` blocks admin
- invalid DB secret fails safely
- malformed request returns `VALIDATION_ERROR`
- no raw SQL error leak

Current status:

- planning only
- not executed

## Future Staging Dry-run Report Template

Future report should include:

- environment: staging or production-like clone
- DB source: staging secret, no value recorded
- backend runtime: staging URL, no secret recorded
- auth mode: real Firebase or approved staging verifier
- admin candidate: Yes/No, no raw uid
- inquiry candidate: Yes/No, no raw id if unnecessary
- audit count before/after
- latest audit action
- requestId present
- rollback/disable result
- frontend src untouched
- production write: No
- promotion recommendation: Go/No-Go

Forbidden in report:

- connection string
- password
- raw token
- service account JSON
- raw customer data
- raw production DB identifier

## Promotion Gate

Staging dry-run success is required but not sufficient.

Before production:

- backend runtime ready
- production DB provider selected
- production secret created safely
- Firebase Auth verification implemented
- admin bootstrap completed
- staging/prod-like dry-run passed
- Firebase `/api` rewrite plan approved
- rollback/disable plan approved
- production QA checklist approved

No-Go:

- do not enable production admin_memo write from staging result alone
- do not enable status/buyer/product/price/quote writes

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-7 Judgment |
| --- | --- | --- | --- |
| Staging DB | Production-like safe clone | Not created | Plan only |
| Staging secret | Separate from production | Not created | Plan only |
| Safe admin bootstrap | Safe staging uid / controlled admin | Not executed | Plan only |
| Auth strategy | Real Firebase staging preferred | Not implemented | Plan only |
| Safe inquiry data | Synthetic data only | Not seeded | Plan only |
| admin_memo dry-run | Required before production | Not executed | Plan only |
| Rollback/disable validation | Required | Not executed | Plan only |
| Production admin_memo write | Requires staging + gates | Blocked | No-Go |

## Recommended Next Phases

### 32J-8

Firebase Hosting `/api` rewrite plan:

- backend URL
- hosting target check
- rollback
- no POS/default site touch

### 32J-9

Production rollout checklist:

- runtime
- DB
- secret
- auth
- bootstrap
- staging dry-run
- rewrite
- QA
- rollback

### 32K

Actual implementation phase, only after explicit approval:

- backend runtime implementation
- Firebase Auth integration
- production DB/staging setup
- Secret Manager setup
- admin UI integration

Important:

- Do not implement staging dry-run before Auth/DB/Secret/Runtime decisions are approved.
- Do not skip staging and jump to production.

## 32J-8 Admin Firebase API Rewrite Plan Follow-up

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Staging/prod-like dry-run remains required before a production rewrite can support admin_memo rollout.
- No Firebase config change, rewrite, deploy, backend runtime connection, DB/Auth integration, or secret creation was added in 32J-8.
