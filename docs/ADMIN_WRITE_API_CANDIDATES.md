# Admin Write API Candidates

## Purpose

- List future write APIs for full editable admin.
- Separate safe early writes from high-risk later writes.
- Keep all write APIs blocked until safety gates are met.

## Early Write Candidates

### Inquiry status and memo

- `PATCH /api/admin/inquiries/:inquiryId/status`
- `PATCH /api/admin/inquiries/:inquiryId/memo`

Requires:

- admin auth
- status mapping or migration
- `inquiry_status_events`
- `audit_logs`
- transaction

### Buyer review

- `PATCH /api/admin/buyers/:buyerId/status`
- `PATCH /api/admin/buyers/:buyerId/profile`

Requires:

- admin auth
- buyer status decision
- `audit_logs`
- transaction
- agreement review if approval

### Product visibility and metadata

- `POST /api/admin/products`
- `PATCH /api/admin/products/:productId`
- `PATCH /api/admin/products/:productId/visibility`

Requires:

- admin auth
- validation
- `audit_logs`
- transaction
- image workflow decision

## Later Write Candidates

### Product prices

- `POST /api/admin/product-prices`
- `PATCH /api/admin/product-prices/:priceId`

### Quotes

- `POST /api/admin/quotes`
- `PATCH /api/admin/quotes/:quoteId`
- `POST /api/admin/quotes/:quoteId/send`
- `PATCH /api/admin/quotes/:quoteId/status`

### Categories

- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:categoryId`
- `PATCH /api/admin/categories/:categoryId/visibility`

### Banners / Catalog files

- `POST /api/admin/banners`
- `PATCH /api/admin/banners/:bannerId`
- `POST /api/admin/catalog-files`
- `PATCH /api/admin/catalog-files/:fileId`

## Explicitly Blocked For Now

- `DELETE` hard delete APIs
- payment APIs
- checkout APIs
- automatic order APIs
- public admin signup
- frontend-only admin writes
- direct React-to-PostgreSQL writes
