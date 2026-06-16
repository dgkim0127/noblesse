# Admin Write API Contract

## Purpose

- Define future Admin write API contracts for full editable operations admin.
- Keep implementation blocked until safety gates, Auth, DB, transaction, audit, and schema strategy are approved.
- Keep current Register/member signup source changes out of scope.
- No backend implementation in this step.
- No SQL changes in this step.
- No DB execution in this step.

## Inputs Reviewed

- `docs/ADMIN_FULL_EDITABLE_SCOPE.md`
- `docs/ADMIN_WRITE_API_CANDIDATES.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/ADMIN_WRITE_SCHEMA_IMPACT_REVIEW.md`
- `docs/ADMIN_READ_ONLY_API_CONTRACT.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `supabase/schema.sql`

## Current Decision

- Admin write API contract planning: Go
- Admin write implementation: No-Go
- Production admin rollout: No-Go

## Common Write Auth and Security Contract

Future behavior:

- All `/api/admin/**` write routes require `Authorization: Bearer <Firebase ID token>`.
- Backend verifies Firebase ID token.
- Backend loads user from PostgreSQL `users.auth_uid`.
- Backend requires:
  - `users.role = admin`
  - `users.status = approved`
- Frontend `viewerState` is not trusted.
- No admin role is granted by client state.
- No direct React-to-PostgreSQL writes.
- No `DATABASE_URL` in frontend.
- No service/admin secret in frontend.

Current step:

- Contract only.
- No Firebase Auth integration.
- No backend middleware implementation.
- No DB connection.

Write error rules:

- missing token -> `UNAUTHORIZED`
- invalid token -> `UNAUTHORIZED`
- non-admin user -> `FORBIDDEN`
- pending/blocked admin -> `FORBIDDEN`
- validation failure -> `VALIDATION_ERROR`
- not found -> `NOT_FOUND`
- write conflict -> `CONFLICT`
- DB unavailable -> `INTERNAL_ERROR` with safe message
- requestId must be included in error shape

## Common Transaction and Audit Contract

Every admin write must:

- run server-side only
- validate request body
- load existing record before mutation
- write business change and `audit_logs` in the same DB transaction
- rollback on failure
- include `requestId`
- include actor admin user
- return safe response only

Required audit log fields:

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

Rules:

- no write without `audit_logs`
- no frontend-only write
- no direct DB write from React
- no hard delete in first write phase
- no stack trace or raw SQL error in response

## Common Write Response Shape

Success:

```json
{
  "data": {
    "updated": true
  },
  "meta": {
    "requestId": "..."
  }
}
```

For entity update:

```json
{
  "data": {
    "inquiry": {},
    "auditLogId": "..."
  },
  "meta": {
    "requestId": "..."
  }
}
```

## Common Write Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "requestId": "...",
    "details": []
  }
}
```

Common write error codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `INTERNAL_ERROR`

Rules:

- `details` must not expose raw SQL.
- `message` must be safe for admin UI.
- Preserve requestId.

## PATCH /api/admin/inquiries/:inquiryId/memo

Status:

- Candidate first write.
- Implementation remains No-Go until backend Auth, DB, transaction helper, and audit path are approved.

Purpose:

- Update internal admin memo on an inquiry.

Auth:

- admin required

Path params:

- `inquiryId` UUID

Request body:

```json
{
  "adminMemo": "Internal note for manual follow-up"
}
```

Validation:

- `inquiryId` must be UUID
- `adminMemo` string
- max length should be decided before implementation
- allow empty string only if clearing memo is permitted
- unknown fields rejected

Current schema fit:

- `inquiries.admin_memo` exists

Transaction:

1. load existing inquiry
2. update `inquiries.admin_memo`
3. insert `audit_logs`
4. commit

Audit action candidate:

- `admin.inquiry.memo.update`

Response 200 example:

```json
{
  "data": {
    "inquiry": {
      "id": "...",
      "inquiryNumber": "INQ-...",
      "adminMemo": "Internal note for manual follow-up",
      "updatedAt": "..."
    },
    "auditLogId": "..."
  },
  "meta": {
    "requestId": "..."
  }
}
```

Errors:

- invalid `inquiryId` -> `VALIDATION_ERROR`
- not found -> `NOT_FOUND`
- non-admin -> `FORBIDDEN`
- DB failure -> `INTERNAL_ERROR`

Notes:

- This is the recommended first real write candidate.
- Still not implemented in 32C.
- Requires `audit_logs` and transaction before implementation.

## PATCH /api/admin/inquiries/:inquiryId/status

Status:

- Future candidate.
- No-Go until status strategy, `admin_status`, `inquiry_status_events`, transaction, and audit design are approved.

Recommended future model:

- Preserve `inquiries.status` for business/quote lifecycle.
- Add future `inquiries.admin_status` for operations workflow.

Request body candidate:

```json
{
  "adminStatus": "reviewing",
  "note": "Started review"
}
```

Allowed future adminStatus values:

- new
- reviewing
- contacted
- quoted
- closed
- spam

Validation:

- `inquiryId` UUID
- `adminStatus` enum
- note optional string with max length
- unknown fields rejected
- allowed transition rules must be defined before implementation

Future transaction:

1. load existing inquiry
2. update `inquiries.admin_status`
3. insert `inquiry_status_events`
4. insert `audit_logs`
5. commit

Audit action candidate:

- `admin.inquiry.status.update`

Response 200 example:

```json
{
  "data": {
    "inquiry": {
      "id": "...",
      "adminStatus": "reviewing",
      "updatedAt": "..."
    },
    "statusEventId": "...",
    "auditLogId": "..."
  },
  "meta": {
    "requestId": "..."
  }
}
```

Blocked because:

- `admin_status` does not exist yet
- `inquiry_status_events` does not exist yet
- transition rules are not approved
- implementation must wait for schema migration/dry-run

## PATCH /api/admin/buyers/:buyerId/status

Status:

- Future candidate.
- No-Go until buyer status strategy and audit transaction are approved.

Request body candidate:

```json
{
  "status": "approved",
  "note": "Approved after manual review"
}
```

Allowed current values:

- pending
- approved
- blocked

Rejected handling:

- Current schema does not have `rejected`.
- Must choose:
  - map rejected -> blocked with note
  - or migrate to add rejected later

Transaction:

- update `users.status`
- update `buyers.approved_at` / `buyers.approved_by` when approving
- insert `audit_logs`
- commit

Audit action candidate:

- `admin.buyer.status.update`

## PATCH /api/admin/buyers/:buyerId/profile

Status:

- Future candidate.
- No-Go until field-level validation and audit strategy are approved.

Editable fields candidate:

- companyName
- contactName
- country
- preferredLanguage
- phone
- messengerType
- messengerId
- salesChannel
- businessNumber
- assignedMarket
- currency

High-risk fields:

- discountRate
- minOrderAmount

Rules:

- high-risk fields may require separate permission later
- every update must audit before/after snapshot

## POST /api/admin/products

Status:

- Future candidate.
- No-Go until validation, image workflow, and audit strategy are approved.

Request body candidate:

- code
- nameKo
- nameEn
- nameJa
- nameCn optional later
- categoryId
- material
- colors
- sizes
- moqDefault
- leadTime
- origin
- imageSet
- imageAlt
- isVisible
- isExportAvailable
- isNew
- isBest
- sortOrder
- descriptions

Rules:

- code unique
- hard delete not supported
- image upload not part of this route unless image workflow is approved
- audit required

## PATCH /api/admin/products/:productId

Status:

- Future candidate.
- No-Go until field-level validation and audit strategy are approved.

Rules:

- partial update allowed only for known fields
- unknown fields rejected
- before/after snapshot required
- price fields must not be updated here

## PATCH /api/admin/products/:productId/visibility

Status:

- Future candidate.
- Safer than full product edit, but still requires public catalog QA.

Request body candidate:

```json
{
  "isVisible": false,
  "note": "Temporarily hidden"
}
```

Rules:

- audit required
- public catalog QA required after production change

## Later Write Contracts

### Product prices

Routes:

- `POST /api/admin/product-prices`
- `PATCH /api/admin/product-prices/:priceId`

Status:

- High-risk later phase.

Requires:

- price validation
- price change history or `audit_logs`
- maybe separate price manager permission
- market/currency/MOQ validation
- no frontend price trust

### Quotes

Routes:

- `POST /api/admin/quotes`
- `PATCH /api/admin/quotes/:quoteId`
- `POST /api/admin/quotes/:quoteId/send`
- `PATCH /api/admin/quotes/:quoteId/status`

Status:

- Later phase.

Requires:

- price reload
- total recalculation
- quote item validation
- send workflow
- `audit_logs`
- transaction

### Categories

Routes:

- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:categoryId`
- `PATCH /api/admin/categories/:categoryId/visibility`

Status:

- Later phase.

Requires:

- slug validation
- localized label validation
- public catalog QA

### Banners / Catalog files

Routes:

- `POST /api/admin/banners`
- `PATCH /api/admin/banners/:bannerId`
- `POST /api/admin/catalog-files`
- `PATCH /api/admin/catalog-files/:fileId`

Status:

- Later phase.

Requires:

- file/storage workflow decision
- visibility validation
- `audit_logs`

## Explicitly Blocked Write Routes

Blocked:

- `DELETE` hard delete routes
- payment routes
- checkout routes
- automatic order routes
- public admin signup routes
- frontend-only admin write routes
- direct React-to-PostgreSQL writes
- product price writes before price strategy
- quote send before quote workflow

Reason:

- These violate current Catalog MVP positioning or write safety gates.

## Future Mock Test Plan

When implementation is approved later:

### Inquiry memo write tests

- missing token -> `UNAUTHORIZED`
- non-admin -> `FORBIDDEN`
- invalid `inquiryId` -> `VALIDATION_ERROR`
- unknown body field -> `VALIDATION_ERROR`
- inquiry not found -> `NOT_FOUND`
- successful memo update returns `auditLogId`
- query/service error does not leak DB details

### Status write tests

- blocked until schema strategy
- should not be implemented until `admin_status` and `inquiry_status_events` decision

### Product/buyer write tests

- blocked until later approval

No real Firebase/DB tests in first write scaffold.

## 32D Backend Skeleton Approval Follow-up

- Backend skeleton approval plan is documented in `docs/ADMIN_BACKEND_SKELETON_APPROVAL_PLAN.md`.
- The next code step may implement a mock-only inquiry memo skeleton, but no real write.
- Real DB/Auth integration, SQL changes, Firebase `/api` rewrite, and deploy remain blocked.

## 32E Mock-only Memo Skeleton Follow-up

- A backend mock-only skeleton now exists for `PATCH /api/admin/inquiries/:inquiryId/memo`.
- The route validates admin auth, UUID, unknown fields, and `adminMemo` through injected mock dependencies in tests.
- Real inquiry memo writes remain blocked until real Auth, DB, transaction, and `audit_logs` implementation are approved.
- No SQL change, DB execution, Firebase rewrite, or deploy was added in 32E.
