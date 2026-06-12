# Backend Phase 1 Scaffold Plan

## Purpose

This document defines the planned structure for the Phase 1 backend scaffold before any backend code is created.

It documents the candidate Express + `pg` direct + Firebase Auth verification structure, route boundaries, module boundaries, environment boundary, and test plan.

This is a plan only. It does not create a backend folder, install dependencies, connect Auth, connect to PostgreSQL, run SQL, create Cloud Run, create Cloud SQL, change Firebase configuration, add rewrites, or deploy.

## Phase 1 Scope

Included routes:

- `GET /api/health`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:productCode`
- `GET /api/buyer/me`

Excluded routes:

- `POST /api/buyer/register`
- `POST /api/inquiries`
- Admin approval/write APIs
- Admin Quote APIs
- Product price write APIs
- Any production migration
- Any Firebase rewrite/deploy change

Reason:

- Phase 1 validates backend hosting, auth token verification, DB read boundary, and product read API before sensitive writes.
- Write APIs require `audit_logs` and transaction helpers and must wait for later phases.

## Proposed Backend Folder Structure

Candidate structure:

```text
backend/
  package.json
  src/
    server.js
    app.js
    config/
      env.js
    db/
      pool.js
      queries/
        catalogQueries.js
        buyerQueries.js
    auth/
      firebaseAuth.js
      requireUser.js
    middleware/
      errorHandler.js
      requestId.js
    routes/
      healthRoutes.js
      catalogRoutes.js
      buyerRoutes.js
    services/
      catalogService.js
      buyerService.js
    utils/
      errors.js
  tests/
    health.test.js
    catalog.test.js
    buyerMe.test.js
```

Notes:

- This structure is documentation only in this step.
- Do not create the `backend/` directory until implementation is explicitly approved.
- Do not add backend package dependencies in this step.

## Environment Variable Plan

Server-only candidates:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ALLOWED_ORIGINS`
- `LOG_LEVEL`

Rules:

- Do not record actual values in this repository.
- Do not modify `.env.example` in this step.
- `DATABASE_URL` is server-side only.
- Firebase Admin credentials are server-side only.
- Production secrets should use Google Secret Manager.
- Cloud Run environment/secret injection method will be confirmed later.

## Auth Middleware Plan

- Frontend obtains Firebase ID token.
- Backend receives `Authorization: Bearer <token>`.
- Backend verifies Firebase ID token using Firebase Admin SDK.
- Backend maps decoded `uid` to PostgreSQL `users.auth_uid`.
- Backend loads `users.role` and `users.status`.
- Backend loads `buyers` record if the user is a buyer.
- Backend attaches viewer context:
  - `userId`
  - `role`
  - `status`
  - `buyerId`
  - `assignedMarket`
  - `currency`
- Firebase Auth identity alone does not grant admin or buyer price access.
- PostgreSQL status remains the business authorization source.

`GET /api/buyer/me`:

- Requires valid Firebase token.
- Returns profile/status from PostgreSQL.
- Does not write data.

Guest catalog reads:

- Product public metadata can be read without auth.
- Protected prices are not returned to guest or pending users.

## DB Access Plan

Use `pg` direct:

- `db/pool.js` owns PostgreSQL connection pool.
- Query files hold SQL.
- Services call query functions.
- Routes call services.
- No SQL in React frontend.
- No DB credentials in frontend.

Phase 1 queries:

`catalogQueries`:

- `listVisibleProducts()`
- `getVisibleProductByCode(productCode)`
- Optionally `getApprovedBuyerPrice(productId, market)` only after viewer status is approved

`buyerQueries`:

- `getUserByAuthUid(authUid)`
- `getBuyerByUserId(userId)`

Security:

- `product_prices` must not be returned unless backend confirms approved buyer status.
- `viewerState` from the current mock frontend is not trusted.

## Route Behavior

### `GET /api/health`

- No auth.
- Returns status ok, service name, and version placeholder.
- No DB required for first health endpoint, or optional DB ping later.

### `GET /api/catalog/products`

- Optional auth.
- Returns visible public product metadata.
- If approved buyer context exists, may include market price in later implementation.
- Phase 1 can start with public metadata only if needed.

### `GET /api/catalog/products/:productCode`

- Optional auth.
- Validates `productCode` format.
- Returns visible product detail.
- Does not return protected price unless approved buyer check passes.

### `GET /api/buyer/me`

- Auth required.
- Verifies Firebase token.
- Loads PostgreSQL user/buyer.
- Returns role/status/approval profile.
- No writes.

## Error Response Convention

Example:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "requestId": "..."
  }
}
```

Common codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

Rules:

- Internal DB errors should not leak details.
- `requestId` should be logged server-side.

## Testing Plan

Before real deploy:

- Unit tests for route handlers/services
- Mock Firebase token verification
- Mock PostgreSQL queries
- Integration test against local PostgreSQL later
- Health endpoint test
- Catalog list/detail test
- `buyer/me` auth-required test
- `buyer/me` pending/approved/admin variants

No production DB tests in Phase 1 scaffold.

## Local Development Plan

- Backend runs separately from Vite frontend.
- Local backend port candidate: `8080`.
- Frontend can use `VITE_API_BASE_URL` in local dev later, but do not add it yet.
- Production frontend should use `/api` relative path after Firebase rewrite.
- Local PostgreSQL can be reused for dev.
- No secrets committed.

This step does not add `VITE_API_BASE_URL`.

## Cloud Run / Firebase Hosting Plan

Future only:

- Create Cloud Run service after scaffold is approved.
- Configure `/api/**` rewrite in `firebase.json` after Cloud Run service exists.
- Deploy only `hosting:noblesse` when frontend rewrite changes.
- Backend deployment must be separate and controlled.
- No Firebase rewrite in this step.
