# Admin Read-only Backend Scaffold Plan

## Purpose

- Plan backend scaffold for Admin read-only APIs before implementation.
- Keep Admin Phase 1 read-only.
- Keep status, product, and buyer writes blocked.
- Define route, service, query, auth, and test structure.
- No backend source implementation in this step.
- No DB execution in this step.

## Inputs Reviewed

- `docs/ADMIN_MVP_SCOPE.md`
- `docs/ADMIN_SCHEMA_GAP_REVIEW.md`
- `docs/ADMIN_READ_ONLY_API_CONTRACT.md`
- `docs/BACKEND_API_BOUNDARY.md`
- Current `backend/src` scaffold shape, for future integration boundaries only

## Current Decision

- Admin read-only backend scaffold planning: Go.
- Admin write API scaffold: No-Go.
- Real DB/Auth integration: No-Go.
- Production rollout: No-Go.

## Proposed Backend File Structure

Future files only. Do not create them in this step.

```text
backend/src/
  routes/
    adminRoutes.js
  services/
    adminDashboardService.js
    adminInquiryService.js
    adminBuyerService.js
    adminProductService.js
  db/
    queries/
      adminDashboardQueries.js
      adminInquiryQueries.js
      adminBuyerQueries.js
      adminProductQueries.js
  auth/
    requireAdmin.js
  utils/
    pagination.js
    validators.js

backend/tests/
  adminDashboard.test.js
  adminInquiries.test.js
  adminInquiryDetail.test.js
  adminBuyers.test.js
  adminProducts.test.js
  adminAuth.test.js
```

Notes:

- Current backend app should eventually mount `/api/admin`.
- No source files are created in 31D.
- No dependency is added in 31D.

## Route Mounting Plan

Future implementation:

`backend/src/app.js`:

- Mount admin routes at `/api/admin`.
- Use the existing `createApp` dependency injection pattern.
- Inject services and auth verifier for tests.
- Keep existing health, catalog, and buyer routes unchanged.

`adminRoutes.js` future routes:

- `GET /dashboard`
- `GET /inquiries`
- `GET /inquiries/:inquiryId`
- `GET /buyers`
- `GET /products`

Excluded:

- `PATCH /inquiries/:inquiryId/status`
- `PATCH /buyers/:buyerId/status`
- `PATCH /products/:productId`
- `POST /quotes`
- Price writes
- Analytics
- Audit logs route

Reason:

- Write APIs are blocked until status mapping, event history, audit logging, and transaction strategy are decided.

## Admin Auth Middleware Plan

Future file:

- `backend/src/auth/requireAdmin.js`

Future behavior:

1. Read `Authorization: Bearer <token>`.
2. Verify Firebase ID token through an injected verifier.
3. Load user by decoded UID from PostgreSQL `users.auth_uid`.
4. Require:
   - `users.role = admin`
   - `users.status = approved`
5. Attach admin viewer context:
   - `userId`
   - `authUid`
   - `email`
   - `role`
   - `status`
   - `requestId`
6. Call `next()`.

Error behavior:

- Missing token -> `UNAUTHORIZED`
- Invalid token -> `UNAUTHORIZED`
- User not found -> choose `FORBIDDEN` or `UNAUTHORIZED` explicitly before implementation
- Non-admin role -> `FORBIDDEN`
- Blocked or pending admin user -> `FORBIDDEN`
- DB error -> `INTERNAL_ERROR` with safe message

Testing:

- Mock verifier.
- Mock user loader.
- No real Firebase Admin SDK call in first scaffold tests.
- No real DB in first scaffold tests.

Security rules:

- Frontend `viewerState` is not trusted.
- No admin role comes from the client.
- No admin secret belongs in the frontend.
- No `DATABASE_URL` belongs in the frontend.

## Query and Service Responsibilities

### Query layer

Future query files:

- `adminDashboardQueries.js`
- `adminInquiryQueries.js`
- `adminBuyerQueries.js`
- `adminProductQueries.js`

Rules:

- SQL lives in the query layer.
- Parameterized SQL only.
- No string interpolation for filters.
- Snake_case DB fields are mapped later in the service layer or response adapter.
- List endpoints use a limit/cursor or offset strategy.
- Raw internal DB errors are not exposed.

### Service layer

Future service files:

- `adminDashboardService.js`
- `adminInquiryService.js`
- `adminBuyerService.js`
- `adminProductService.js`

Rules:

- Validate route and query params.
- Call query layer.
- Map DB rows to API camelCase response.
- Enforce read-only behavior.
- No status mutation.
- No product mutation.
- No buyer mutation.
- No quote creation.

## Query Shape Plan

### Dashboard

Inputs:

- Admin viewer context

Queries:

- Count inquiries by status.
- Count buyers by `users.status`.
- Count visible and hidden products.

Uses:

- `inquiries`
- `buyers`
- `users`
- `products`

No analytics views are required for Phase 1.

### Inquiry list

Inputs:

- `status`
- `market`
- `q`
- `limit`
- `cursor`

Queries:

- `inquiries` left join `buyers`
- `buyers` left join `users` for email
- Aggregate `inquiry_items` count and quantity if needed

Notes:

- Use current statuses: `requested`, `checking`, `quoted`, `confirmed`, and `cancelled`.
- Email may be `null`.

### Inquiry detail

Inputs:

- `inquiryId` UUID

Queries:

- Inquiry by ID.
- Buyer plus user email.
- Inquiry items.
- Optional `admin_quotes` later, read-only only.

Notes:

- No status event timeline exists until `inquiry_status_events` exists.

### Buyer list

Inputs:

- `status`
- `market`
- `country`
- `q`
- `limit`
- `cursor`

Queries:

- `buyers` join `users`.
- Optional agreement summary later.

Notes:

- Status values: `pending`, `approved`, and `blocked`.
- `rejected` is not first-class yet.

### Product list

Inputs:

- `visible`
- `category`
- `q`
- `market` later
- `limit`
- `cursor`

Queries:

- `products` left join `categories`.
- Optional `product_prices` later for admin-only price review after real auth exists.

Notes:

- CN names are not first-class in the current schema.
- Image workflow remains future work.

## Validation Plan

Common validation:

- UUID path params.
- Status query only allows current schema values.
- Market query only allows `KR`, `JP`, `US`, or `GLOBAL`.
- Country query length is limited.
- `q` query length is limited.
- `limit` has a max cap.
- Cursor format is validated if used.

Route-specific validation:

- `inquiryId` must be UUID.
- `visible` must be boolean-like if used.
- `category` should be slug or ID depending on the implementation decision.

No writes:

- Reject unexpected methods.
- Do not add `PATCH` or `POST` admin routes in the read-only scaffold.

## Pagination Plan

Recommended for first implementation:

- Default `limit`: 20
- Max `limit`: 100
- Cursor-based pagination preferred later.
- Offset pagination acceptable for first local read-only scaffold if documented.

Response meta:

```json
{
  "limit": 20,
  "nextCursor": null,
  "requestId": "..."
}
```

Decision before implementation:

- Choose cursor vs offset.
- Keep API contract stable if changed later.

Recommendation:

- Use limit plus offset for first mock/local scaffold only if simpler.
- Prefer cursor before production admin rollout.

## Mock Testing Plan

Future tests should use Node built-in test runner.

Required tests:

- Admin auth missing token -> `UNAUTHORIZED`
- Admin auth invalid token -> `UNAUTHORIZED`
- Non-admin user -> `FORBIDDEN`
- Pending or blocked admin -> `FORBIDDEN`
- Dashboard success with mock admin
- Inquiry list success with mock rows
- Inquiry detail success
- Inquiry detail invalid UUID -> `VALIDATION_ERROR`
- Inquiry detail not found -> `NOT_FOUND`
- Buyer list success
- Product list success
- Query/service errors return `INTERNAL_ERROR` without leaking DB details

No real dependencies:

- No real Firebase Admin verification.
- No real PostgreSQL connection.
- No production DB.
- No Cloud Run.
- No Firebase Hosting rewrite.

## Future Implementation Sequence

31E candidate:

- Create admin route, service, query, and auth skeleton.
- Use mock services/tests only.
- Do not connect real DB.
- Do not connect real Firebase Auth.
- Do not add write routes.

31F candidate:

- Plan local read-only API with mock DB or local PostgreSQL.
- Still no production DB.

31G candidate:

- Local PostgreSQL read-only QA.
- User enters local DB credentials manually in terminal only.
- No secrets in docs, GitHub, or chat.

Blocked until later:

- Status writes.
- Buyer approval writes.
- Product writes.
- Quote writes.
- Production rollout.

## Implementation Risks

- Admin status labels do not yet match the current `inquiries.status` values.
- `inquiry_status_events` does not exist yet.
- Rejected buyer status is not first-class.
- Real admin access depends on Firebase token verification plus PostgreSQL role lookup.
- Production rollout requires Cloud Run, production PostgreSQL, Google Secret Manager, and Firebase Hosting rewrite planning.
- Any write route must be transaction-safe and must write `audit_logs`.

## Non-Implementation Confirmation

- No backend route file is created by this plan.
- No backend source file is modified by this plan.
- No frontend admin route is implemented by this plan.
- No SQL file is changed by this plan.
- No SQL is executed by this plan.
- No DB connection is opened by this plan.
- No Firebase Auth integration is added by this plan.
- No Firebase `/api` rewrite is added by this plan.
- No deploy is run by this plan.
