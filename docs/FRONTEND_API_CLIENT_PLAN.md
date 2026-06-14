# Frontend API Client Plan

## Purpose

- Define how the Noblesse frontend should call the backend Phase 1 API before implementation.
- Fix the local development and production API base URL strategy.
- Map current mock data shape to backend response shape.
- Keep frontend integration blocked until a later approved step.

This step does not add frontend API client code, `VITE_API_BASE_URL`, Firebase Hosting rewrites, backend/provider connections, database connections, or Firebase Auth integration.

## API Base URL Strategy

### Production Candidate

After Firebase Hosting rewrite exists, the frontend should call relative paths:

- `/api/health`
- `/api/catalog/products`
- `/api/catalog/products/:productCode`
- `/api/buyer/me`

Reason:

- Avoids CORS complexity.
- Keeps frontend and backend under the same public origin.
- Matches the planned Firebase Hosting `/api/**` rewrite to Cloud Run.

### Local Development Candidate

Option A:

- Frontend uses `VITE_API_BASE_URL=http://localhost:8080`.
- Local only.
- Not added yet.

Option B:

- Vite dev proxy to backend.
- Requires Vite config later.
- Not added yet.

Recommendation:

- Start with an API client wrapper supporting base URL injection.
- Use relative `/api` paths in production.
- Use `VITE_API_BASE_URL` only in local dev when frontend integration begins.
- Do not add the env var in this step.

## Phase 1 Endpoint Mapping

| Frontend Use | Backend Endpoint | Auth | Status |
| --- | --- | --- | --- |
| Health smoke | `GET /api/health` | None | Backend runtime passed |
| Catalog list | `GET /api/catalog/products` | Optional later | Mock contract tested |
| Product detail | `GET /api/catalog/products/:productCode` | Optional later | Mock contract tested |
| Current buyer profile | `GET /api/buyer/me` | Firebase bearer token | Mock auth tested |

Notes:

- Catalog runtime DB-backed QA is still pending.
- `buyer/me` real Firebase token QA is still pending.
- No write APIs are included in Phase 1 frontend integration.

## Mock Data To Backend Response Mapping

Current frontend mock products include fields that should map directly:

- `code`
- `nameKo`
- `nameEn`
- `nameJa`
- `categoryId`
- `material`
- `colors`
- `sizes`
- `moqDefault`
- `leadTime`
- `origin`
- `imageSet`
- `imageAlt`
- `isNew`
- `isBest`
- `descriptionKo`
- `descriptionEn`
- `descriptionJa`

Current frontend mock products include fields that need adapter decisions:

- `productId`: backend response uses `id` for database UUID and `code` for the product code.
- `collectionIds`: backend Phase 1 product response does not currently include collection IDs.
- `isVisible`: backend only returns visible products.
- `isExportAvailable`: backend Phase 1 response does not currently expose this flag.
- `sortOrder`, `createdAt`, `updatedAt`, `tone`: frontend-only or admin/internal display fields unless explicitly exposed later.

Backend product response fields:

- `id`
- `code`
- `nameKo`
- `nameEn`
- `nameJa`
- `categoryId`
- `categoryNameKo`
- `categoryNameEn`
- `material`
- `colors`
- `sizes`
- `moqDefault`
- `leadTime`
- `origin`
- `imageSet`
- `imageAlt`
- `isNew`
- `isBest`
- `descriptionKo`
- `descriptionEn`
- `descriptionJa`

Protected price rules:

- Protected price fields must not be assumed.
- `price`, `wholesalePrice`, and `priceSnapshot` should not be present for guest or pending public reads.
- Frontend should tolerate missing protected prices.
- Inquiry List pricing must remain disabled or reference-only until approved buyer flow is implemented.

## Future API Client Module Shape

Candidate files:

- `src/api/client.js`
- `src/api/catalogApi.js`
- `src/api/buyerApi.js`
- `src/api/errors.js`

Candidate functions:

- `apiFetch(path, options)`
- `getCatalogProducts()`
- `getCatalogProduct(productCode)`
- `getCurrentBuyerProfile(token)`

Rules:

- No direct DB access.
- No `DATABASE_URL`.
- No service secrets.
- No backend admin key.
- Bearer token only for authenticated endpoints.
- Handle the standard backend error shape.
- Surface `requestId` for support/debugging.

This step does not create these files.

## Frontend Integration Phases

### Phase A

- Add API client wrapper only.
- Keep mock fallback.
- No production backend dependency.

### Phase B

- Connect health route for diagnostics.

### Phase C

- Connect catalog list/detail reads.
- Keep mock fallback.
- Do not expose protected prices.

### Phase D

- Connect `buyer/me` after Firebase Auth integration.
- Show approval status from backend.
- No write APIs yet.

Excluded:

- Request Quote write
- Buyer registration write
- Admin write
- Price update
- Admin Quote write

## Frontend Error Handling Strategy

Backend error shape:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "...",
    "requestId": "..."
  }
}
```

Frontend behavior:

- `UNAUTHORIZED`: show login required or session expired.
- `FORBIDDEN`: show approval/admin permission required.
- `NOT_FOUND`: show product not found.
- `VALIDATION_ERROR`: show a safe validation message.
- `INTERNAL_ERROR`: show a generic retry/support message and keep `requestId` available.

Rules:

- Do not show raw DB/internal errors.
- `requestId` can be shown in a support/error detail area.

## Not Implemented In 27A

- No frontend API client code.
- No `VITE_API_BASE_URL`.
- No frontend `fetch` calls.
- No backend code changes.
- No DB connection.
- No Firebase Auth connection.
- No Firebase Hosting rewrite.
- No deploy.

## 27B API Client Wrapper Status

- API client wrapper files are created under `src/api/`.
- `src/api/client.js` supports injected `baseUrl` and injected `fetchImpl`.
- Default base URL remains `/api`.
- `src/api/catalogApi.js` and `src/api/buyerApi.js` are created.
- `src/api/errors.js` normalizes backend error shape and request IDs.
- `tests/apiClient.test.mjs` covers wrapper behavior with mock fetch only.
- UI integration is still not implemented.
- Mock fallback remains the active frontend data path.
- `VITE_API_BASE_URL` is still not added.
- Firebase Hosting rewrite is still not added.

## 28A Catalog-first Deferral

- Frontend API integration is deferred until catalog-first MVP QA is complete.
- Mock fallback remains the primary data path for the current catalog MVP.
- The current priority is product catalog clarity, domestic/international B2B inquiry copy, and manual follow-up flow.
- No additional API wiring is required for the current launch priority.
