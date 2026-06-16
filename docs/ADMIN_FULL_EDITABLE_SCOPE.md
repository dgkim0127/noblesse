# Admin Full Editable Scope

## Purpose

- Re-scope Admin MVP from read-only planning to full editable operations admin.
- Define all future admin-editable areas.
- Keep implementation blocked until write safety, Auth, DB, and audit requirements are satisfied.
- Preserve current Catalog MVP behavior while admin work proceeds.

## Decision

- Admin should eventually support full operations management.
- Read-only admin remains useful as the first implementation layer.
- Write-capable admin is the target state.
- No write implementation starts until safety gates are satisfied.

## Current Non-Implementation Status

- No backend write API exists.
- No Firebase Auth integration exists.
- No production DB connection exists.
- No `/api` rewrite exists.
- No SQL migration is executed in this step.
- Register/member signup source changes are intentionally out of scope for 32A.

## Editable Admin Modules

### 1. Dashboard

Editable:

- none initially

Admin can view:

- inquiry counts
- buyer status counts
- product visibility counts
- manual follow-up reminders

Later:

- dashboard settings optional

### 2. Inquiries

Admin can:

- view inquiry list
- view inquiry detail
- update inquiry status
- add/edit internal admin memo
- mark inquiry as spam
- close inquiry
- link inquiry to quote later

Status candidates:

- new
- reviewing
- contacted
- quoted
- closed
- spam

Important:

- current schema uses `requested` / `checking` / `quoted` / `confirmed` / `cancelled`
- mapping or migration decision required before implementation

### 3. Buyers / Trade Accounts

Admin can:

- view buyer/trade inquiry
- approve buyer
- reject buyer
- block buyer
- edit company/contact metadata
- assign market
- assign currency
- set discount rate later
- set min order amount later

Important:

- rejected is not first-class in current schema
- map rejected to blocked or add rejected via migration

### 4. Products

Admin can:

- create product
- edit product
- hide/show product
- update localized names
- update material
- update colors
- update sizes
- update MOQ
- update lead time
- update origin
- update image metadata
- mark new/best
- sort products

Important:

- prefer soft hide via `is_visible`
- hard delete should be blocked or admin-super-only
- image workflow is not finalized

### 5. Categories

Admin can:

- create category
- edit category
- hide/show category
- sort categories
- update localized labels
- update cover image later

### 6. Product Prices

Admin can:

- view product prices
- create/update market price later
- update MOQ per market later
- update min order amount later

Important:

- price writes are high-risk
- require `audit_logs`
- require validation
- require admin role
- maybe separate price manager permission later

### 7. Quotes

Admin can eventually:

- create quote from inquiry
- edit quote draft
- add/edit quote items
- send quote
- cancel quote
- mark accepted manually

Important:

- not first write phase
- requires transaction
- requires price recalculation
- requires `audit_logs`

### 8. Banners / Catalog Files

Admin can later:

- create/edit/hide banners
- update catalog file metadata
- change visibility public/approved_only

### 9. Terms / Agreements

Admin can later:

- view active terms
- create new version
- activate/deactivate version

Important:

- legal review required
- not first implementation phase

### 10. Audit Logs

Admin can:

- view audit logs later

Important:

- audit logs must be append-only
- no edit/delete audit logs

## Schema Impact Candidates

Likely future additions:

- `inquiry_status_events`
- `admin_notes` optional
- `product_change_history` optional
- `price_change_history` optional
- category visibility/sort already partially supported
- `name_cn` / `description_cn` optional
- product image workflow fields optional
- admin permissions table optional later if role needs more granularity

Existing tables likely reusable:

- `users`
- `buyers`
- `products`
- `categories`
- `product_prices`
- `inquiries`
- `inquiry_items`
- `admin_quotes`
- `admin_quote_items`
- `banners`
- `catalog_files`
- `terms_versions`
- `buyer_agreements`
- `audit_logs`

Do not change schema in 32A.

## Revised Admin Implementation Phases

Phase 32A:

- Full editable admin scope and write safety gates
- docs only

Phase 32B:

- Admin write schema impact review
- choose status mapping vs migration
- decide `inquiry_status_events`

Phase 32C:

- Admin write API contract
- no implementation yet

Phase 32D:

- Admin read-only backend skeleton or revise previous read-only skeleton plan
- mock auth/mock DB only

Phase 32E:

- Admin first write skeleton for inquiry status/memo only
- mock tests only
- no real DB/Auth

Phase 32F:

- Local PostgreSQL write dry-run
- `audit_logs` and transaction verification
- no production DB

Phase 32G:

- Admin frontend integration
- start with read-only
- then inquiry status/memo write

Phase 32H:

- Product/category management

Phase 32I:

- Quote management

Phase 32J:

- Production rollout after Cloud Run/Auth/DB/secrets/rewrite

Recommended:

- First real write should be inquiry status/memo only.
- Product price and quote writes must be later.

## 32B Write Schema Impact Review

- Admin write schema impact review is documented in `docs/ADMIN_WRITE_SCHEMA_IMPACT_REVIEW.md`.
- Option C, adding `admin_status` while preserving current `inquiries.status`, is recommended for future status writes unless later rejected.
- `inquiry_status_events` is recommended before real inquiry status writes.
- This does not unlock write implementation.

## 32C Write API Contract

- Admin write API contract exists in `docs/ADMIN_WRITE_API_CONTRACT.md`.
- Full editable target remains blocked until safety gates are approved.
- The first candidate contract is inquiry `admin_memo`, not status, price, or quote writes.
