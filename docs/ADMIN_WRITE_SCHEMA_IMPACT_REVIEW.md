# Admin Write Schema Impact Review

## Purpose

- Review current PostgreSQL schema impact for full editable admin writes.
- Decide which write features can use current schema and which require future migration.
- Review inquiry status strategy, `inquiry_status_events`, `audit_logs`, transaction requirements, and write-safe schema gaps.
- No SQL changes in this step.
- No DB execution in this step.
- No backend/frontend implementation in this step.

## Inputs Reviewed

- `docs/ADMIN_FULL_EDITABLE_SCOPE.md`
- `docs/ADMIN_WRITE_API_CANDIDATES.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/ADMIN_SCHEMA_GAP_REVIEW.md`
- `supabase/schema.sql`
- `docs/BACKEND_API_BOUNDARY.md`

## Current Decision

- Admin write planning: Go
- Admin write implementation: No-Go
- Production admin rollout: No-Go

## Current Schema Write Fit / Gap Summary

Reviewed against `supabase/schema.sql`.

### users

Existing fit:

- `role` supports buyer/admin
- `status` supports pending/approved/blocked
- `auth_uid` exists for future Firebase Auth mapping

Write gaps:

- rejected buyer/admin state is not first-class
- admin bootstrap process not implemented
- no fine-grained admin permissions

Impact:

- buyer approve/block can map to `users.status`
- buyer reject requires blocked mapping or migration

### buyers

Existing fit:

- company/contact/country/market/currency fields exist
- `approved_at` and `approved_by` exist

Write gaps:

- buyer-specific status does not exist
- metadata edit requires `audit_logs`
- `discount_rate`/`min_order_amount` are high-risk

Impact:

- buyer profile edit possible later with audit transaction
- approval requires users + buyers transaction

### inquiries

Existing fit:

- `status` exists
- `request_memo` and `admin_memo` exist
- totals and market/currency exist

Write gaps:

- status values do not match full editable target
- no status history table
- no contacted/spam/new first-class status

Impact:

- status write requires status strategy before implementation
- memo write may be first safe write if `audit_logs` transaction is ready

### inquiry_items

Existing fit:

- product snapshots, option, quantity, MOQ, price snapshot exist

Write gaps:

- item mutation is not in first admin write phase

Impact:

- read-only initially
- item edits should wait for quote workflow

### products

Existing fit:

- code, localized names, material, colors, sizes, MOQ, lead_time, origin, image metadata, visibility, new/best, sort_order exist

Write gaps:

- no first-class CN fields
- image upload/workflow not defined
- hard delete policy not defined

Impact:

- product visibility/metadata writes possible later with validation/audit
- image handling requires separate decision

### categories

Existing fit:

- localized labels, slug, visibility, sort_order exist

Write gaps:

- no CN label field
- cover image workflow not finalized

Impact:

- category visibility/sort can be future safe write
- create/edit requires validation/audit

### product_prices

Existing fit:

- market/currency/wholesale_price/retail_price/MOQ/min_order_amount exist

Write gaps:

- price writes are high-risk
- no price change history table
- no separate price manager role

Impact:

- price writes should be later phase
- require `audit_logs` and maybe `price_change_history`

### admin_quotes / admin_quote_items

Existing fit:

- quote draft/sent/accepted/cancelled status exists
- quote item confirmed values exist

Write gaps:

- quote recalculation rules not defined
- quote send workflow not defined
- no quote event table

Impact:

- quote management remains later phase

### banners / catalog_files

Existing fit:

- visibility fields exist
- catalog file visibility supports public/approved_only

Write gaps:

- file upload/storage workflow not defined

Impact:

- metadata edits possible later
- actual upload needs storage decision

### terms_versions / buyer_agreements

Existing fit:

- versioning and buyer agreements exist

Write gaps:

- legal review required
- terms activation/deactivation needs strict audit

Impact:

- not first write phase

### audit_logs

Existing fit:

- actor/action/target/snapshots/request metadata fields exist

Write gaps:

- append-only enforcement not implemented
- transaction helper not implemented

Impact:

- usable as required write audit base
- every write API must write `audit_logs` in same transaction

## Inquiry Status Strategy Review

Current schema status values:

- requested
- checking
- quoted
- confirmed
- cancelled

Full editable admin desired operational states:

- new
- reviewing
- contacted
- quoted
- closed
- spam

### Option A. UI Mapping Only

Map admin labels to current status:

- new -> requested
- reviewing -> checking
- contacted -> checking + admin_memo
- quoted -> quoted
- closed -> confirmed/cancelled
- spam -> cancelled + admin_memo

Pros:

- no schema migration
- fastest to implement
- lowest DB risk

Cons:

- contacted/spam not first-class
- ambiguous analytics
- weak operations history
- admin_memo becomes overloaded

### Option B. Replace inquiries.status Values

Migrate `inquiries.status` check constraint to:

- new
- reviewing
- contacted
- quoted
- closed
- spam

Pros:

- simple admin UI mapping
- first-class workflow states

Cons:

- can break existing analytics/views/seed assumptions
- mixes operational workflow with quote lifecycle
- requires migration and rollback plan

### Option C. Add admin_status while preserving status

Keep current `inquiries.status` as business/quote lifecycle.

Add `admin_status` for operations workflow:

- new
- reviewing
- contacted
- quoted
- closed
- spam

Pros:

- preserves existing analytics and lifecycle status
- gives admin workflow first-class state
- safer migration path
- avoids overloading `admin_memo`

Cons:

- requires schema migration
- requires API contract update
- requires event/audit strategy

Recommendation:

- Recommend Option C for full editable admin target.
- Do not implement in 32B.
- Before any status write API, design migration to add `admin_status` and `inquiry_status_events`, or explicitly reject Option C in a later decision.
- Until then, status write implementation remains No-Go.

## inquiry_status_events Candidate

Recommended future table:

Fields:

- id uuid primary key
- inquiry_id uuid references inquiries(id)
- previous_status text
- next_status text
- previous_admin_status text optional if admin_status is added
- next_admin_status text optional if admin_status is added
- actor_user_id uuid references users(id)
- note text
- request_id text
- ip_address text
- user_agent text
- created_at timestamptz

Purpose:

- preserve status transition history
- support contacted/spam/closed operations tracking
- avoid overloading `admin_memo`
- support audit and operational review

Rules:

- insert-only
- written in same transaction as inquiry status/admin_status update
- paired with `audit_logs`
- no frontend direct write

Decision:

- Required before real inquiry status write implementation.

## First Write Candidate Decision

Candidates:

1. Inquiry admin memo
2. Inquiry status/admin_status
3. Buyer approval/block
4. Product visibility

### Inquiry admin memo

Pros:

- low business risk
- current schema has `admin_memo`
- useful to operator

Cons:

- still needs `audit_logs`
- still needs backend auth and transaction

### Inquiry status/admin_status

Pros:

- high operational value
- central admin workflow

Cons:

- blocked until status strategy and event table are decided

### Buyer approval/block

Pros:

- important for B2B process

Cons:

- touches users and buyers
- needs agreement review and admin bootstrap

### Product visibility

Pros:

- current schema has `is_visible`

Cons:

- public catalog impact
- wrong visibility can hide/show wrong product

Recommendation:

- First real write should be inquiry `admin_memo` only, then inquiry status/admin_status after event strategy.
- Product price and quote writes must remain later.
- Do not implement any write in 32B.

## Write Implementation Blocking Matrix

| Write Area | Current Schema Ready? | Required Before Implementation | 32B Judgment |
| --- | --- | --- | --- |
| Inquiry memo | Partially | admin auth, audit_logs transaction | Candidate first write later |
| Inquiry status | No | admin_status/status strategy, inquiry_status_events, audit_logs | No-Go |
| Buyer approval/block | Partially | users/buyers transaction, audit_logs, agreement review | Later |
| Product visibility | Partially | validation, audit_logs, public catalog QA | Later |
| Product metadata | Partially | field validation, image rules, audit_logs | Later |
| Product prices | No for safe ops | price history/audit/role strategy | No-Go |
| Quotes | No for safe ops | recalculation/send workflow/audit | No-Go |
| Categories | Partially | validation/audit/public QA | Later |
| Banners/catalog files | Partially | storage/upload policy/audit | Later |
| Terms/agreements | High risk | legal review/versioning/audit | No-Go |

## 32C Write API Contract Follow-up

- Admin write API contract is documented in `docs/ADMIN_WRITE_API_CONTRACT.md`.
- Option C remains recommended and the future status write contract assumes `admin_status`.
- Inquiry status writes remain blocked until schema migration/dry-run and `inquiry_status_events` are approved.

## 32G Admin Memo Local Dry-run Plan Follow-up

- Local dry-run planning for `inquiries.admin_memo` is documented in `docs/ADMIN_MEMO_LOCAL_DRY_RUN_PLAN.md`.
- The plan keeps `admin_memo` as the first future real-write candidate because it fits the current schema.
- Status/admin_status writes remain blocked until status strategy, migration, and event/audit strategy are approved.
