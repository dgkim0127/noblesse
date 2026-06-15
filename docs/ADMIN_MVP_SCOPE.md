# Admin MVP Scope

## Purpose

- Fix the real admin function scope after the Catalog MVP launch.
- Separate fake admin preview screens from real admin operations.
- Define the functions and security boundaries required before backend/Auth/DB implementation.
- Keep the current public catalog MVP stable while admin planning proceeds.

## Current State

- Public catalog MVP is live.
- Production URL: `https://noblesse.web.app`
- Contact email is `dgkim0127@gmail.com`.
- Current inquiry flow is manual follow-up by Noblesse.
- No production DB automation yet.
- No Firebase Auth integration yet.
- No backend API connection yet.
- Existing admin preview is not a real operations admin.
- No Firebase Hosting `/api` rewrite exists.

## Admin MVP Goal

- Let the Noblesse operator review B2B inquiries.
- Track inquiry status.
- Review buyer/trade inquiry details.
- Prepare product data management.
- Avoid checkout, payment, cart, or order-finalization behavior.
- Keep Quote as manual review, not automatic order.
- Preserve the Catalog MVP as a domestic and international B2B catalog / order inquiry site.

## Admin MVP Routes

Phase 1 candidate:

- `/admin`
- `/admin/inquiries`
- `/admin/inquiries/:inquiryId`
- `/admin/buyers`
- `/admin/products`

Later:

- `/admin/quotes`
- `/admin/product-prices`
- `/admin/analytics`
- `/admin/settings`
- `/admin/audit-logs`

## Admin MVP Functions

Phase 1:

1. Dashboard
   - inquiry count
   - new inquiry count
   - manual follow-up reminder
   - catalog status summary

2. Inquiry list
   - company name
   - contact name
   - country/region
   - email
   - interested products
   - submitted at
   - status

3. Inquiry detail
   - buyer/trade information
   - product interest
   - memo
   - contact email
   - current status
   - internal note

4. Inquiry status update
   - new
   - reviewing
   - contacted
   - quoted
   - closed
   - spam

5. Buyer/trade inquiry review
   - pending
   - approved
   - rejected
   - blocked

6. Product catalog review
   - product code
   - name
   - material
   - options
   - MOQ
   - visible status
   - image status

Not Phase 1:

- online payment
- cart
- automatic order
- automatic quote
- member price automation
- bulk upload
- real analytics
- email sending automation

## Admin Data Requirements

Required future tables or existing table mapping:

### `inquiries`

Need:

- `id`
- buyer/company fields
- contact email
- country/region
- interested products
- memo
- status
- `created_at`
- `updated_at`

### `inquiry_status_events`

Need:

- `id`
- `inquiry_id`
- `previous_status`
- `next_status`
- `actor_user_id`
- note
- `created_at`

### `buyers`

Need:

- `id`
- `company_name`
- `contact_name`
- email
- phone optional
- country
- `preferred_language`
- status
- `created_at`
- `updated_at`

### `products`

Need:

- product code
- localized names
- material
- colors
- sizes
- MOQ
- visible flag
- image fields

### `audit_logs`

Already scaffolded earlier.

Admin writes must write `audit_logs` later.

Notes:

- Do not change SQL in this step.
- Compare this scope against the current schema in a later step.
- No migration is executed in this step.

## Admin API Candidate

Future backend API:

- `GET /api/admin/dashboard`
- `GET /api/admin/inquiries`
- `GET /api/admin/inquiries/:inquiryId`
- `PATCH /api/admin/inquiries/:inquiryId/status`
- `GET /api/admin/buyers`
- `PATCH /api/admin/buyers/:buyerId/status`
- `GET /api/admin/products`
- `PATCH /api/admin/products/:productId`

Later:

- `POST /api/admin/quotes`
- `PATCH /api/admin/product-prices/:priceId`
- `GET /api/admin/analytics`
- `GET /api/admin/audit-logs`

Rules:

- Admin API requires authentication.
- Admin role must be loaded from PostgreSQL.
- Client `viewerState` is not trusted.
- Every write must be server-side validated.
- Every sensitive write must create `audit_logs`.
- No direct React-to-PostgreSQL access.

## Admin Auth and Security

Recommended:

- Firebase Auth identity.
- Backend verifies Firebase ID token.
- Backend loads user from PostgreSQL `users.auth_uid`.
- Admin role comes from PostgreSQL `users.role = admin`.
- No public admin signup.
- First admin is created manually during production migration.
- Admin session is controlled by Firebase Auth and backend checks.

Rules:

- Frontend-only admin state is not trusted.
- Admin preview must remain clearly mock if no backend auth exists.
- Production admin requires backend API.
- No admin secrets in frontend.
- No `DATABASE_URL` in frontend.
- No service role key in frontend.

## Admin Implementation Phases

### Phase A. Admin scope and data model review

- This step.
- Docs only.

### Phase B. Admin DB schema review

- Compare current schema to Admin MVP requirements.
- No production migration yet.

### Phase C. Backend admin API scaffold

- Express routes.
- Auth middleware.
- Mock tests first.

### Phase D. Local PostgreSQL admin read QA

- Local DB only.
- No production DB.

### Phase E. Admin frontend route integration

- Connect `/admin` screens to backend.
- No write until auth is proven.

### Phase F. Admin status update writes

- Requires `audit_logs`.
- Requires transaction handling.
- Local/staging first.

### Phase G. Production admin rollout

- Only after Cloud Run/Auth/DB/secret setup.

## Current Non-Implementation Status

- No admin route code is added in this step.
- No backend API route is added in this step.
- No Firebase Auth connection is added in this step.
- No DB connection is added in this step.
- No Firebase Hosting rewrite is added in this step.
- No deploy is run in this step.

## 31B Schema Gap Review

- Admin schema fit/gap review is documented in `docs/ADMIN_SCHEMA_GAP_REVIEW.md`.
- The current schema is enough for Admin read-only planning against existing inquiry, buyer, product, and quote tables.
- Inquiry status writes are blocked until the status mapping/migration choice and status event/audit strategy are decided.
- No SQL or backend implementation change is made by the 31B review.
