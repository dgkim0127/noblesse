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
