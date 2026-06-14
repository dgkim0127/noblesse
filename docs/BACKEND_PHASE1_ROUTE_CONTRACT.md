# Backend Phase 1 Route Contract

## Purpose

- Fix the request, response, and error contract for Phase 1 backend route QA.
- Keep the API boundary clear before any frontend API integration.
- Exclude write APIs from this contract.

## Routes

### GET `/api/health`

Auth:

- None

Response `200`:

```json
{
  "ok": true,
  "service": "noblesse-backend",
  "version": "phase1"
}
```

Headers:

- `x-request-id`

### GET `/api/catalog/products`

Auth:

- Optional later
- Phase 1 may run as a public metadata read

Response `200`:

```json
{
  "products": [
    {
      "id": "...",
      "code": "NB-001",
      "nameKo": "...",
      "nameEn": "...",
      "categoryId": "...",
      "material": "...",
      "colors": [],
      "sizes": [],
      "imageSet": {},
      "imageAlt": {},
      "isNew": false,
      "isBest": false
    }
  ]
}
```

Rules:

- Return public visible metadata only.
- Do not return protected member price unless approved buyer logic is explicitly added later.
- No write behavior.

### GET `/api/catalog/products/:productCode`

Auth:

- Optional later

Validation:

- `productCode` must match the allowed product code pattern.

Response `200`:

```json
{
  "product": {
    "id": "...",
    "code": "NB-001"
  }
}
```

Errors:

- Invalid code: `VALIDATION_ERROR`
- Unknown product: `NOT_FOUND`

### GET `/api/buyer/me`

Auth:

- Required

Header:

```http
Authorization: Bearer <Firebase ID token>
```

Response `200`:

```json
{
  "profile": {
    "userId": "...",
    "role": "buyer",
    "status": "approved",
    "buyerId": "...",
    "assignedMarket": "JP",
    "currency": "JPY"
  }
}
```

Errors:

- No token: `UNAUTHORIZED`
- Invalid token: `UNAUTHORIZED`
- No PostgreSQL user mapping: `UNAUTHORIZED`

Current behavior:

- A missing PostgreSQL user mapping returns `UNAUTHORIZED` with message `User profile not found`.
- Firebase Auth identity alone does not grant admin access or approved buyer access.
- PostgreSQL `users` and `buyers` remain the business authorization source.

## Error Shape

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

- Error responses include `requestId`.
- Responses include an `x-request-id` header.
- Internal DB details must not be exposed.

## Non-goals

- No `POST` APIs
- No Request Quote write
- No Admin write
- No price update
- No production DB
- No Firebase rewrite

## 26D Runtime QA Note

- Local `/api/health` runtime smoke passed without DB or Firebase credentials.
- DB-backed catalog runtime QA waits for a later local DB environment step.
- Without `DATABASE_URL`, catalog runtime returns an expected limitation response instead of a successful product list.

## 27A Frontend Client Planning Note

- Frontend API client planning is documented in `docs/FRONTEND_API_CLIENT_PLAN.md`.
- Frontend integration is not implemented yet.
- Route contracts remain the backend source for future frontend adapter work.
