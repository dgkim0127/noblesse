# Admin Memo Local Dry-run Plan

## Purpose

- Plan the first real-write local dry-run for Admin inquiry `admin_memo`.
- Keep production DB/Auth/Cloud/Firebase Hosting rewrite blocked.
- Define how to test inquiry `admin_memo` write safely on local PostgreSQL only.
- Preserve mock-only backend skeleton separation until explicitly approved.
- No DB execution in this step.
- No SQL change in this step.
- No backend implementation in this step.

## Inputs Reviewed

- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `docs/ADMIN_WRITE_SCHEMA_IMPACT_REVIEW.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/ADMIN_MOCK_BACKEND_ROUTE_QA_REPORT.md`
- `docs/ADMIN_BACKEND_SKELETON_APPROVAL_PLAN.md`
- `supabase/schema.sql`
- `supabase/VALIDATION_NOTES.md`

## Current Decision

- Admin memo local dry-run planning: Go
- Admin memo real local implementation: No-Go until explicitly approved
- Production DB/Auth/rollout: No-Go

## Why inquiry admin_memo Is First

Reasons:

- `inquiries.admin_memo` already exists in current schema.
- It is lower risk than status, buyer, product, price, or quote writes.
- It is operationally useful for manual follow-up.
- It does not require new `admin_status` or `inquiry_status_events`.
- It still requires admin auth, transaction, and `audit_logs` before real implementation.

Not first:

- inquiry status/admin_status write
- buyer approval/block
- product visibility
- product price
- quote send
- hard delete

Reason:

- These require additional schema, transition rules, public catalog QA, price validation, or quote workflow.

## Local Dry-run Architecture

Dry-run target:

- local PostgreSQL only
- never production DB
- never Cloud SQL
- never Neon production
- never Firebase production Auth

Recommended local flow later:

1. Use existing local PostgreSQL dev database or create a new dry-run database.
2. Apply existing schema and seed data manually.
3. Use a local backend process.
4. Use mock admin auth or a local-only injected admin viewer.
5. Perform `admin_memo` write against local DB only.
6. Verify inquiry row update.
7. Verify `audit_logs` row is inserted in the same transaction.
8. Roll back or use disposable dry-run DB.

Important:

- No secrets in GitHub, docs, or chat.
- `DATABASE_URL` must be provided only in local terminal session when actual local implementation is approved.
- Do not write production credentials anywhere.
- Do not deploy.

## Required Transaction Behavior

For future real local implementation:

`PATCH /api/admin/inquiries/:inquiryId/memo` must:

1. Start DB transaction.
2. Load existing inquiry row.
3. Capture `before_snapshot`.
4. Update `inquiries.admin_memo`.
5. Capture `after_snapshot`.
6. Insert `audit_logs` with:
   - `actor_user_id`
   - `actor_role`
   - `action = admin.inquiry.memo.update`
   - `target_table = inquiries`
   - `target_id = inquiryId`
   - `before_snapshot`
   - `after_snapshot`
   - `request_id`
   - `ip_address`
   - `user_agent`
7. Commit transaction.
8. On failure, rollback transaction.
9. Return safe response with `requestId` and `auditLogId`.

Rules:

- No memo write without `audit_logs`.
- No `audit_logs` without memo write.
- No partial commit.
- No raw SQL error leak.
- No frontend direct DB write.

## Local Dry-run Data Requirements

Required local data:

- at least one admin user candidate in `users`
- at least one buyer
- at least one inquiry
- `audit_logs` table exists
- inquiry has known `id`
- inquiry has initial `admin_memo` value or null

Recommended local query checks later:

Before write:

- `select inquiry id, inquiry_number, admin_memo from public.inquiries limit 5;`
- `select count(*) from public.audit_logs;`

After write:

- `select admin_memo from public.inquiries where id = '<inquiry_id>';`
- `select action, target_table, target_id from public.audit_logs order by created_at desc limit 5;`

Do not execute these queries in 32G.
They are for later dry-run only.

## Auth Boundary For Local Dry-run

Production target later:

- Firebase Auth ID token verification
- PostgreSQL `users.auth_uid` lookup
- `users.role = admin`
- `users.status = approved`

Local dry-run option:

- use injected mock admin auth for local backend route test
- or manually seed a local admin user and use a local-only token verifier
- no real Firebase Admin credential required for first local DB dry-run

Rules:

- frontend `viewerState` is not trusted
- no public admin signup
- no Firebase Admin credential in repo
- no admin secret in frontend
- no production token required for local dry-run

Recommendation:

- First local DB write dry-run may use injected mock admin auth plus local PostgreSQL.
- Real Firebase Auth can remain later.

## Dry-run Verification Checklist

Before running actual future dry-run:

- confirm branch
- confirm no production DB env
- confirm local DB name
- confirm no secrets in docs/GitHub/chat
- confirm backend tests pass
- confirm root build passes
- confirm `/api` rewrite absent
- confirm no deploy

During future dry-run:

- start backend locally
- call `PATCH /api/admin/inquiries/:inquiryId/memo` locally
- use mock admin token or local-only auth
- verify response includes:
  - inquiry
  - auditLogId
  - requestId
- verify DB row changed
- verify `audit_logs` inserted
- verify rollback behavior if possible

After future dry-run:

- record only success/failure
- record row count and audit count
- never record credentials
- never record `DATABASE_URL`
- never record passwords
- do not deploy

## Go / No-Go

Go:

- Plan local PostgreSQL inquiry `admin_memo` dry-run
- Keep first real write limited to `admin_memo`
- Use local DB only when later approved
- Use mock admin auth for first local DB dry-run if explicitly approved

No-Go:

- Production DB write
- Cloud SQL/Neon production write
- Firebase production Auth integration
- inquiry status/admin_status write
- buyer approval/block write
- product write
- price write
- quote write
- Firebase Hosting `/api` rewrite
- deploy

Next recommended step:

- 32H: implement local-only `admin_memo` write path behind explicit local DB dry-run approval
- or 32H-alt: clean remaining Register/frontend source changes first if user wants a clean tree

## 32H Implementation Follow-up

- Local-only transaction-capable query path has been implemented for `updateInquiryMemo`.
- Fake pool tests verify transaction start, `select ... for update`, memo update, `audit_logs` insert, commit, rollback, release, not-found handling, and parameterized query usage.
- Route-level memo tests still use injected mock dependencies.
- No real PostgreSQL connection was opened in 32H.
- No local or production DB dry-run was executed in 32H.
- No SQL file, schema, migration, Firebase Auth, Firebase `/api` rewrite, or deploy change was made.

Next recommended step:

- Run an explicitly approved local PostgreSQL dry-run only after the operator confirms the local DB environment and secret handling rules.

## 32I Local Dry-run Follow-up

- Local PostgreSQL `admin_memo` dry-run result is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_REPORT.md`.
- The dry-run used the backend `updateInquiryMemo` query path, updated one local inquiry memo, and inserted one `audit_logs` row.
- Connection string, password, username, host, port, and exact database name were not recorded.
- Existing frontend source changes were not staged or committed by 32I.
- Production DB/Auth, Firebase `/api` rewrite, SQL file changes, and deploy remain No-Go.
