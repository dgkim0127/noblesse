# Admin Schema Gap Review

## Purpose

- Compare the current PostgreSQL scaffold against the Admin MVP scope.
- Identify what can be used for read-only admin planning without schema changes.
- Identify gaps that block admin write APIs, especially inquiry status changes.
- Keep this review documentation-only: no SQL change, no SQL execution, no backend/API implementation, and no deployment.

## Inputs Reviewed

- `docs/ADMIN_MVP_SCOPE.md`
- `docs/POSTGRES_SCHEMA_PLAN.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `supabase/schema.sql`

## Current Schema Inventory

### `users`

- Admin MVP use: stores account identity, role, and status for backend admin role checks.
- Read-only admin sufficiency: sufficient for listing or validating admin/buyer account state.
- Status/write sufficiency: role is limited to `buyer` and `admin`; status is limited to `pending`, `approved`, and `blocked`.
- Gaps: production admin bootstrap and role verification still require backend/Auth integration. No public admin signup should be added.

### `buyers`

- Admin MVP use: buyer/trade inquiry review, company/contact details, market/currency assignment, approval metadata.
- Read-only admin sufficiency: mostly sufficient for buyer review screens.
- Status/write sufficiency: buyer status is inherited from `users.status`; buyer-specific approval fields exist.
- Gaps: buyer review decisions need transaction rules and `audit_logs` before writes. Rejection is not a first-class status; it would need mapping or schema review.

### `categories`

- Admin MVP use: product catalog review and category labels.
- Read-only admin sufficiency: sufficient for category display and visibility review.
- Status/write sufficiency: `is_visible` and `sort_order` support later catalog management.
- Gaps: write APIs need audit logging and validation, but no immediate read-only gap.

### `products`

- Admin MVP use: product catalog review with code, localized names, material, options, MOQ, visibility, image metadata, and descriptions.
- Read-only admin sufficiency: sufficient for product review screens.
- Status/write sufficiency: visibility and featured flags exist.
- Gaps: product writes require audit logging, transaction strategy, image workflow rules, and server-side validation.

### `product_prices`

- Admin MVP use: future price review and protected buyer price management.
- Read-only admin sufficiency: sufficient for admin-only price review if backend authorization exists.
- Status/write sufficiency: market/currency/MOQ checks exist.
- Gaps: price writes are explicitly later phase and require admin authorization, validation, and `audit_logs`.

### `collections`

- Admin MVP use: future catalog merchandising review.
- Read-only admin sufficiency: sufficient for future read-only collection review.
- Status/write sufficiency: visibility and sort fields exist.
- Gaps: not required for Admin Phase 1.

### `product_collections`

- Admin MVP use: future collection-product membership review.
- Read-only admin sufficiency: sufficient for future read-only collection membership review.
- Status/write sufficiency: sort order exists.
- Gaps: not required for Admin Phase 1.

### `inquiries`

- Admin MVP use: dashboard counts, inquiry list, inquiry detail, current status, admin memo, market/currency totals.
- Read-only admin sufficiency: sufficient for read-only Admin Phase 1 against current status values.
- Status/write sufficiency: current status values are `requested`, `checking`, `quoted`, `confirmed`, and `cancelled`.
- Gaps: Admin MVP wants `new`, `reviewing`, `contacted`, `quoted`, `closed`, and `spam`. There is no status event/history table, so status writes are blocked until mapping or migration is decided.

### `inquiry_items`

- Admin MVP use: inquiry detail product interest, requested options, quantities, MOQ, and item snapshots.
- Read-only admin sufficiency: sufficient for inquiry detail and product interest review.
- Status/write sufficiency: not a status table.
- Gaps: no immediate read-only gap. Any item mutation is out of scope for Admin Phase 1.

### `admin_quotes`

- Admin MVP use: future admin quote workflow and conversion reporting.
- Read-only admin sufficiency: sufficient for quote preview/read planning.
- Status/write sufficiency: quote status values are `draft`, `sent`, `accepted`, and `cancelled`.
- Gaps: Admin Quote automation is deferred. Writes require transaction safety, price reload, total recalculation, and `audit_logs`.

### `admin_quote_items`

- Admin MVP use: future confirmed quote item detail.
- Read-only admin sufficiency: sufficient for future quote preview/read planning.
- Status/write sufficiency: not a status table.
- Gaps: deferred with Admin Quote automation.

### `banners`

- Admin MVP use: future public banner review.
- Read-only admin sufficiency: sufficient for future review.
- Status/write sufficiency: visibility and date windows exist.
- Gaps: not required for Admin Phase 1.

### `catalog_files`

- Admin MVP use: future downloadable catalog review.
- Read-only admin sufficiency: sufficient for future review.
- Status/write sufficiency: visibility rules exist through `visible_to`.
- Gaps: not required for Admin Phase 1.

### `terms_versions`

- Admin MVP use: buyer/trade inquiry review context for accepted agreement versions.
- Read-only admin sufficiency: sufficient for active agreement lookup.
- Status/write sufficiency: active/version fields exist.
- Gaps: agreement version writes are not part of Admin Phase 1.

### `buyer_agreements`

- Admin MVP use: buyer approval review and consent audit context.
- Read-only admin sufficiency: sufficient for checking buyer agreement history if a buyer exists.
- Status/write sufficiency: not a status table.
- Gaps: registration persistence and pre-buyer application storage remain later API design work.

### `audit_logs`

- Admin MVP use: required for sensitive admin writes.
- Read-only admin sufficiency: sufficient for future audit-log review.
- Status/write sufficiency: table exists for append-only action history.
- Gaps: backend transaction helpers and database permission design must enforce append-only behavior before production writes.

## Fit / Gap Table

| Admin Requirement | Current Schema Fit | Gap | Future Action |
| --- | --- | --- | --- |
| Dashboard inquiry count | `inquiries` has status, market, currency, totals, and timestamps. | Admin MVP "new" count does not directly match current `requested` status terminology. | Use current status labels for read-only planning, or map `requested` to "new" at display time. |
| Inquiry list | `inquiries`, `buyers`, and `inquiry_items` can support list rows and product interest summary. | Company/contact data depends on linked `buyers`; anonymous/manual contact inquiry storage is not separate. | Start with buyer-linked reads; review separate contact-inquiry table only if needed. |
| Inquiry detail | `inquiries` and `inquiry_items` cover buyer, memo, item snapshots, and totals. | No status event timeline. | Add `inquiry_status_events` before or alongside real status writes. |
| Inquiry status update | `inquiries.status` exists. | Current status enum does not match Admin MVP desired values, and no history table exists. | Decide display mapping or migrate status values before implementing writes. |
| Buyer/trade inquiry review | `users`, `buyers`, `terms_versions`, and `buyer_agreements` cover approval review basics. | Rejected status is not represented; registration persistence path is not finalized. | Keep read-only review first; decide blocked/rejected mapping before writes. |
| Product catalog review | `products`, `categories`, `product_prices`, and image metadata fields support review. | Product write/image workflow rules are not finalized. | Keep read-only review first; require validation and `audit_logs` before writes. |
| Audit log for admin writes | `audit_logs` exists with actor, action, target, snapshots, request ID, and timestamp. | Append-only enforcement and transaction helpers are not implemented. | Make all admin writes transaction-safe and write `audit_logs` in the same transaction. |
| Inquiry status history | No current table. | Missing `inquiry_status_events`. | Add table before or with status write implementation. |
| Admin role check | `users.role = 'admin'` exists. | Real Auth-to-PostgreSQL mapping is not implemented. | Backend must verify Firebase token, load `users.auth_uid`, and trust PostgreSQL role only. |
| Admin Quote | `admin_quotes` and `admin_quote_items` exist. | Admin Quote automation is deferred; transaction and recalculation rules are not implemented. | Keep deferred until price reload, total recalculation, audit logging, and send workflow are designed. |

## Inquiry Status Mapping

Current schema values:

- `requested`
- `checking`
- `quoted`
- `confirmed`
- `cancelled`

Admin MVP desired values:

- `new`
- `reviewing`
- `contacted`
- `quoted`
- `closed`
- `spam`

### Option A. Display Mapping Without Schema Migration

- `new` -> `requested`
- `reviewing` -> `checking`
- `contacted` -> `checking` with internal note
- `quoted` -> `quoted`
- `closed` -> `confirmed` or `cancelled` depending result
- `spam` -> `cancelled` with internal note

Pros:

- No immediate schema change.
- Admin read-only planning can proceed.
- Lower risk while Catalog MVP remains the launch priority.

Cons:

- `contacted` and `spam` are not first-class statuses.
- Reporting can become ambiguous.
- Status writes would rely on notes unless a history/event table is added.

### Option B. Migrate Schema To Admin MVP Status Values

Pros:

- Admin UI status labels match database values.
- Reporting and filtering are clearer.
- `contacted` and `spam` become first-class workflow states.

Cons:

- Requires SQL migration and seed/update review.
- Existing analytics views and status conversion logic must be updated.
- Production migration must wait for backend/API and rollback planning.

### Recommendation

- For read-only Admin Phase 1, do not migrate the schema.
- Use current `inquiries.status` values for display, with a lightweight label mapping if needed.
- Before any status write implementation, decide whether to keep the mapping or migrate status values.
- Do not implement status writes until this decision is made and `inquiry_status_events` or an equivalent history strategy is in place.

## Recommended Next Path

1. Keep current schema unchanged for now.
2. Build Admin read-only API/UI against current schema first.
3. Use current `inquiries.status` labels for display.
4. Do not implement status writes until status mapping/migration is decided.
5. Add `inquiry_status_events` before or alongside real status writes.
6. Require `audit_logs` for admin writes.
7. Keep Admin Quote deferred.

## Go / No-Go

- Admin read-only planning: Go
- Admin status write implementation: No-Go until status mapping and audit/event strategy are decided
- Production admin rollout: No-Go

## Non-Implementation Confirmation

- No SQL file was changed.
- No SQL was executed.
- No database connection was opened.
- No backend/API/Auth implementation was added.
- No Firebase configuration was changed.
- No deploy was run.
