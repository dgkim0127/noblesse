# Admin Write Safety Gates

## Purpose

- Define requirements before any admin write API is implemented.

## Required Before Any Write API

1. Real backend API

- Express backend route
- server-side validation
- no frontend direct DB

2. Admin Auth

- Firebase Auth identity
- backend verifies ID token
- PostgreSQL `users.auth_uid` lookup
- `users.role = admin`
- `users.status = approved`

3. Transaction strategy

- DB write and `audit_logs` write in same transaction
- rollback on failure
- requestId attached

4. `audit_logs`

- `actor_user_id`
- `actor_role`
- `action`
- `target_table`
- `target_id`
- `before_snapshot`
- `after_snapshot`
- `request_id`
- `ip_address`
- `user_agent`

5. Validation

- path params
- body fields
- enum values
- field length
- numeric ranges
- localized fields
- no unknown write fields

6. Status strategy

- choose mapping vs migration
- add `inquiry_status_events` if status writes are first-class
- define allowed status transitions

7. Rollback plan

- local dry-run
- staging or local PostgreSQL test
- documented rollback before production

8. Production infrastructure

- Cloud Run or equivalent
- production PostgreSQL provider
- Secret Manager
- Firebase Hosting `/api` rewrite
- admin bootstrap
- production QA

## Current Gate Status

- Read-only admin planning: Go
- Admin write planning: Go
- Admin write implementation: No-Go
- Production admin rollout: No-Go

## 32B Schema Impact Follow-up

- 32B recommends `inquiry_status_events` and likely `admin_status` for write-safe inquiry operations.
- Any write implementation remains No-Go until the status/event strategy, transaction helper, Auth, DB, and audit path are approved.
- Inquiry `admin_memo` may be the first write candidate later, but it still requires the same Auth, transaction, and `audit_logs` gates.

## 32C Write API Contract Follow-up

- Write contracts are documented in `docs/ADMIN_WRITE_API_CONTRACT.md`.
- The contracts describe future request/response/error boundaries only.
- They do not unlock implementation or relax any safety gate.

## 32D Backend Skeleton Approval Follow-up

- Mock-only backend skeleton scope is documented in `docs/ADMIN_BACKEND_SKELETON_APPROVAL_PLAN.md`.
- Mock-only skeleton does not satisfy real write safety gates.
- Real implementation remains No-Go until Auth, DB, transaction, audit, schema/status strategy, and rollout gates are approved.

## 32G Admin Memo Local Dry-run Plan Follow-up

- Local dry-run planning for the first `admin_memo` write candidate is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_PLAN.md`.
- Even local dry-run requires transaction behavior and same-transaction `audit_logs`.
- Production write gates remain unsatisfied.
- No production DB/Auth, Firebase `/api` rewrite, or deploy is unlocked by this plan.

## 32J-0 Admin Memo Production Readiness Follow-up

- 32I local dry-run satisfies only local transaction proof for `admin_memo`.
- Production gates remain unsatisfied and are documented in `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`.
- Production write rollout remains No-Go until Auth, DB, secret storage, backend runtime, Firebase rewrite, rollback, and QA gates are satisfied.
