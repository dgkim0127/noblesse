# Admin Bootstrap Plan

## Purpose

- Plan how the first production admin user will be created and controlled.
- Define the boundary for mapping Firebase Auth uid to PostgreSQL users.auth_uid.
- Define role/status requirements, approval gates, rollback/disable paths, and no-public-signup guardrails.
- Keep actual admin creation, DB writes, scripts, Auth integration, Firebase rewrite, and deploy blocked.
- This step is docs-only.

## Current Decision Status

- Admin bootstrap planning: Go
- Admin bootstrap implementation: No-Go
- Admin user creation: No-Go
- DB insert/update: No-Go
- Firebase Auth integration: No-Go
- Firebase Hosting `/api` rewrite: No-Go
- Production admin_memo rollout: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`
- `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`
- `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`
- `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`
- `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`
- `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`
- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- `supabase/schema.sql`
- `supabase/VALIDATION_NOTES.md`

## Bootstrap Problem Statement

Production admin auth requires both:

1. Firebase Auth identity
2. PostgreSQL admin authorization record

Required PostgreSQL record:

- `users.auth_uid` = Firebase uid
- `users.role` = `admin`
- `users.status` = `approved`

Problem:

- If no approved admin exists, admin auth cannot succeed.
- If public admin signup exists, privilege escalation risk is high.
- If frontend can assign role/status, admin boundary is broken.
- If bootstrap is not auditable, production access cannot be trusted.

Current status:

- production admin bootstrap not implemented
- no admin user created in 32J-6

## Bootstrap Requirements

Required:

- controlled first admin creation
- Firebase uid known and verified
- PostgreSQL `users.auth_uid` mapped to Firebase uid
- `users.role = admin`
- `users.status = approved`
- bootstrap owner recorded
- reviewer/approver recorded
- execution environment recorded
- rollback/disable path documented
- no public admin signup
- no frontend role/status trust
- no direct frontend DB write

Required fields:

- `id`
- `auth_uid`
- `email` if available
- `role`
- `status`
- `created_at`
- `updated_at`

Recommended audit metadata:

- bootstrap request id
- bootstrap actor
- approval note
- execution timestamp
- rollback owner

Current status:

- planning only

## Bootstrap Approach Options

### Option A. Manual migration-time insertion

Description:

- During approved production migration, insert the first admin user record manually or through reviewed migration execution.

Pros:

- simple
- no public endpoint
- low app-code surface
- easy to block after execution

Cons:

- manual process risk
- requires strict review
- may be hard to repeat in staging

### Option B. Controlled one-time script

Description:

- A reviewed script runs once in local/staging/production-controlled environment to create the first admin record.

Pros:

- repeatable
- testable in staging
- can enforce validation

Cons:

- script must handle secrets carefully
- script must not be committed with real values
- script must be disabled/removed after use

### Option C. Protected internal bootstrap endpoint

Description:

- Backend exposes a protected internal-only bootstrap route.

Pros:

- operationally convenient

Cons:

- dangerous if exposed
- requires additional secret/auth boundary
- can become privilege escalation route
- not needed for first phase

Recommended:

- Use Option A or B first.
- Avoid Option C unless explicitly approved later.
- Do not create public bootstrap endpoint.

Current decision:

- Plan only.
- No bootstrap implementation in 32J-6.

## Recommended Bootstrap Direction

Recommended:

- Start with controlled manual or one-time script bootstrap.
- Execute only after:
  - production DB provider selected
  - migration process approved
  - Firebase Auth admin identity known
  - Secret Manager plan approved
  - runtime/Auth plan approved
  - rollback/disable path approved

First admin record:

- `auth_uid` must come from Firebase Auth uid
- role must be `admin`
- status must be `approved`
- no self-approval
- no frontend role assignment

No-Go:

- no bootstrap in 32J-6
- no admin user creation in 32J-6
- no script in 32J-6
- no public endpoint in 32J-6

## Bootstrap Execution Boundary

Future execution must:

- run in controlled environment
- use approved production DB connection only through approved secret handling
- verify Firebase uid source
- insert/update only intended admin row
- not grant broad DB privileges
- not create public signup path
- record execution result without secrets
- support rollback/disable

Execution must not:

- expose connection string
- expose service account credential
- expose Firebase token
- write from frontend
- bypass `users.role`/`users.status` checks
- create admin from arbitrary email without uid verification

Current status:

- planning only
- no execution

## Disable / Rollback Plan

Required future disable path:

- set `users.status = blocked`
- or remove admin role if approved
- preserve audit trail
- record rollback actor and reason
- verify blocked admin receives `FORBIDDEN`
- revoke frontend session if feasible
- rotate secrets if bootstrap credential leaked

Rollback must not:

- hard delete `audit_logs`
- silently delete admin record without trace
- leave public bootstrap path enabled

Current status:

- planning only

## Bootstrap Audit Plan

Future audit should record:

- bootstrap action
- target user id
- `auth_uid` presence without printing full uid if not needed
- actor/owner
- reviewer
- approval note
- timestamp
- requestId
- rollback/disable action if used

Possible audit action names:

- `admin.bootstrap.create`
- `admin.bootstrap.approve`
- `admin.bootstrap.disable`

Rules:

- do not record secrets
- do not record Firebase token
- do not record service account credential
- preserve audit trail

Current status:

- planning only
- audit event not implemented

## Bootstrap QA Plan

Required future QA:

- known approved admin can authenticate
- unknown Firebase uid -> `FORBIDDEN`
- buyer role -> `FORBIDDEN`
- pending admin -> `FORBIDDEN`
- blocked admin -> `FORBIDDEN`
- no public admin signup path exists
- frontend cannot assign admin role
- direct React-to-DB write impossible
- bootstrap disable path works
- audit trail exists
- requestId appears in failures

Current status:

- planning only
- not executed

## Seed / Staging Bootstrap Boundary

Staging bootstrap:

- may use safe test Firebase uid
- may use safe sample admin
- must not use production secrets unless explicitly approved
- must not use real customer data
- should verify auth mapping before production

Production bootstrap:

- must use real approved Firebase uid
- must use approved DB/secret path
- must be reviewed
- must be reversible

Current status:

- staging/production bootstrap not executed

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-6 Judgment |
| --- | --- | --- | --- |
| First admin creation | Manual or one-time controlled script | Not implemented | Plan only |
| Public admin signup | Forbidden | Not implemented | Keep blocked |
| Firebase uid mapping | `users.auth_uid` | Planned | Plan only |
| Admin role/status | `role=admin`, `status=approved` | Planned | Plan only |
| Bootstrap audit | Required | Not implemented | Plan only |
| Disable path | `users.status=blocked` or approved rollback | Not implemented | Plan only |
| Protected bootstrap endpoint | Avoid first phase | Not implemented | No-Go |
| Production admin_memo write | Requires bootstrap | Blocked | No-Go |

## Recommended Next Phases

### 32J-7

Staging or production-like admin_memo dry-run plan:

- staging DB
- staging secret
- safe admin bootstrap
- safe inquiry data
- auth strategy
- rollback validation

### 32J-8

Firebase Hosting `/api` rewrite plan:

- backend URL
- target check
- rollback
- no POS/default site touch

### 32J-9

Production rollout checklist:

- runtime
- DB
- secret
- auth
- bootstrap
- rewrite
- QA
- rollback

Important:

- Do not implement bootstrap before DB, secret, Auth, and runtime plans are approved.
- Do not enable production admin_memo write before bootstrap is complete and QA passes.

## 32J-7 Admin Staging Memo Dry-run Plan Follow-up

- Staging or production-like admin_memo dry-run planning is documented in `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`.
- Staging bootstrap remains planning only and was not executed.
- No staging DB, admin user, secret, Auth integration, SQL execution, rewrite, or deploy was added in 32J-7.

## 32J-8 Admin Firebase API Rewrite Plan Follow-up

- Firebase Hosting `/api/**` rewrite planning is documented in `docs/ADMIN_FIREBASE_API_REWRITE_PLAN.md`.
- Future rewrite must not be added before admin bootstrap is completed and reversible.
- Bootstrap remains planning only.

## 32J-9 Admin Production Rollout Checklist Follow-up

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- The bootstrap gate remains No-Go in the rollout checklist.
- No admin user, bootstrap script, protected endpoint, DB write, rewrite, or deploy was added in 32J-9.
