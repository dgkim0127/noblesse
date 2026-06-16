# Admin Read-only API Contract

## Purpose

- Define read-only Admin API contracts before implementation.
- Keep Admin Phase 1 limited to dashboard, inquiry, buyer, and product reads.
- Avoid write APIs until status mapping, `audit_logs`, and transaction strategy are decided.
- No backend implementation in this step.
- No DB execution in this step.

## Inputs Reviewed

- `docs/ADMIN_MVP_SCOPE.md`
- `docs/ADMIN_SCHEMA_GAP_REVIEW.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `supabase/schema.sql`

## Current Decision

- Admin read-only planning: Go.
- Admin status writes: No-Go.
- Production admin rollout: No-Go.

## Phase 1 Read-only Admin Routes

Included:

- `GET /api/admin/dashboard`
- `GET /api/admin/inquiries`
- `GET /api/admin/inquiries/:inquiryId`
- `GET /api/admin/buyers`
- `GET /api/admin/products`

Excluded:

- `PATCH /api/admin/inquiries/:inquiryId/status`
- `PATCH /api/admin/buyers/:buyerId/status`
- `PATCH /api/admin/products/:productId`
- `POST /api/admin/quotes`
- `PATCH /api/admin/product-prices/:priceId`
- `GET /api/admin/analytics`
- `GET /api/admin/audit-logs`

Reason:

- Status writes require status mapping or migration decision.
- Writes require `audit_logs` and transaction strategy.
- Production admin rollout requires Auth, DB, Cloud Run, and secret setup.

## Common Auth and Security Contract

Future behavior:

- All `/api/admin/**` routes require `Authorization: Bearer <Firebase ID token>`.
- Backend verifies Firebase ID token with Firebase Admin SDK.
- Backend loads user from PostgreSQL `users.auth_uid`.
- Backend requires `users.role = admin`.
- Backend requires `users.status = approved`.
- Client `viewerState` is not trusted.
- No admin role is granted by frontend state.
- No `DATABASE_URL` or admin secret in frontend.
- No direct React-to-PostgreSQL access.

Current step:

- This is contract only.
- No Firebase Auth integration.
- No backend middleware implementation.
- No DB connection.

Error rules:

- Missing token -> `UNAUTHORIZED`
- Invalid token -> `UNAUTHORIZED`
- Non-admin user -> `FORBIDDEN`
- Blocked user -> `FORBIDDEN`
- DB unavailable -> `INTERNAL_ERROR` with safe message
- `requestId` must be included in error shape

## Common Response Shape

Success response should include:

- `data` object or list
- optional `meta` object
- `requestId` if practical

Example:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

## Common Error Shape

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required",
    "requestId": "..."
  }
}
```

Common error codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

Rules:

- Do not leak SQL errors.
- Do not expose stack traces.
- Preserve `requestId` for support/debugging.

## GET /api/admin/dashboard

Purpose:

- Admin dashboard read-only summary.

Auth:

- Admin required.

Current schema inputs:

- `inquiries`
- `buyers`
- `products`
- `admin_quotes` optional later

Response 200 example:

```json
{
  "data": {
    "inquiries": {
      "total": 0,
      "requested": 0,
      "checking": 0,
      "quoted": 0,
      "confirmed": 0,
      "cancelled": 0
    },
    "buyers": {
      "total": 0,
      "pending": 0,
      "approved": 0,
      "blocked": 0
    },
    "products": {
      "total": 0,
      "visible": 0,
      "hidden": 0
    },
    "manualFollowUp": {
      "label": "Manual follow-up required",
      "count": 0
    }
  },
  "meta": {
    "requestId": "..."
  }
}
```

Notes:

- Use current schema status values.
- Do not invent new/write status values.
- No analytics views required for Phase 1 dashboard.

## GET /api/admin/inquiries

Purpose:

- Admin inquiry list.

Auth:

- Admin required.

Query parameters:

- `status` optional
- `market` optional
- `q` optional
- `limit` optional
- `cursor` optional

Current schema inputs:

- `inquiries`
- `buyers`
- `users` for email via `buyers.user_id` if needed
- `inquiry_items` for item count/summary

Response 200 example:

```json
{
  "data": {
    "inquiries": [
      {
        "id": "...",
        "inquiryNumber": "INQ-...",
        "companyName": "...",
        "contactName": "...",
        "email": "...",
        "country": "JP",
        "market": "JP",
        "currency": "JPY",
        "status": "requested",
        "totalItems": 2,
        "totalQuantity": 60,
        "estimatedTotal": 72000,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": {
    "limit": 20,
    "nextCursor": null,
    "requestId": "..."
  }
}
```

Notes:

- Contact email may require join `users -> buyers`.
- If no user email exists, return `null`.
- Use existing `inquiries.status` values.
- Do not expose protected prices beyond admin role.

## GET /api/admin/inquiries/:inquiryId

Purpose:

- Admin inquiry detail.

Auth:

- Admin required.

Path params:

- `inquiryId` UUID

Current schema inputs:

- `inquiries`
- `inquiry_items`
- `buyers`
- `users`
- `admin_quotes` optional later

Response 200 example:

```json
{
  "data": {
    "inquiry": {
      "id": "...",
      "inquiryNumber": "INQ-...",
      "status": "requested",
      "market": "JP",
      "currency": "JPY",
      "requestMemo": "...",
      "adminMemo": "...",
      "totalItems": 2,
      "totalQuantity": 60,
      "estimatedTotal": 72000,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "buyer": {
      "id": "...",
      "companyName": "...",
      "contactName": "...",
      "email": "...",
      "country": "JP",
      "preferredLanguage": "jp",
      "assignedMarket": "JP",
      "status": "approved"
    },
    "items": [
      {
        "id": "...",
        "productCode": "NB-001",
        "productName": "...",
        "material": "...",
        "color": "Silver",
        "size": "6mm",
        "quantity": 40,
        "moq": 20,
        "priceSnapshot": 1100,
        "subtotal": 44000
      }
    ]
  },
  "meta": {
    "requestId": "..."
  }
}
```

Errors:

- Invalid `inquiryId` -> `VALIDATION_ERROR`
- Not found -> `NOT_FOUND`

Notes:

- Status event timeline is not available until `inquiry_status_events` exists.
- Read-only only.

## GET /api/admin/buyers

Purpose:

- Admin buyer/trade inquiry review list.

Auth:

- Admin required.

Query parameters:

- `status` optional
- `market` optional
- `country` optional
- `q` optional
- `limit` optional
- `cursor` optional

Current schema inputs:

- `buyers`
- `users`
- `buyer_agreements` optional
- `terms_versions` optional

Response 200 example:

```json
{
  "data": {
    "buyers": [
      {
        "id": "...",
        "userId": "...",
        "email": "...",
        "role": "buyer",
        "status": "pending",
        "companyName": "...",
        "contactName": "...",
        "country": "KR",
        "preferredLanguage": "kr",
        "assignedMarket": "KR",
        "currency": "KRW",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": {
    "limit": 20,
    "nextCursor": null,
    "requestId": "..."
  }
}
```

Notes:

- Rejected is not first-class yet.
- Use `pending`, `approved`, and `blocked` only until mapping or migration is decided.
- No buyer status writes in this phase.

## GET /api/admin/products

Purpose:

- Admin product catalog review.

Auth:

- Admin required.

Query parameters:

- `visible` optional
- `category` optional
- `q` optional
- `market` optional later
- `limit` optional
- `cursor` optional

Current schema inputs:

- `products`
- `categories`
- `product_prices` optional for admin-only price review later

Response 200 example:

```json
{
  "data": {
    "products": [
      {
        "id": "...",
        "code": "NB-001",
        "nameKo": "...",
        "nameEn": "...",
        "nameJa": "...",
        "categoryId": "...",
        "categoryNameKo": "...",
        "categoryNameEn": "...",
        "material": "...",
        "colors": [],
        "sizes": [],
        "moqDefault": 20,
        "leadTime": "...",
        "origin": "KR",
        "imageSet": {},
        "imageAlt": {},
        "isVisible": true,
        "isExportAvailable": true,
        "isNew": false,
        "isBest": false,
        "sortOrder": 10,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": {
    "limit": 20,
    "nextCursor": null,
    "requestId": "..."
  }
}
```

Notes:

- CN product names are not first-class in current schema.
- Image workflow is still future work.
- No product writes in this phase.

## Query Planning Notes

- Read-only API can use current schema.
- Use SQL joins, not client-side stitching.
- Map snake_case DB fields to camelCase API response.
- Use pagination for list endpoints.
- Avoid returning unnecessary fields.
- Do not expose service/internal fields.
- Admin price review is allowed only for admin routes after real auth exists.
- No writes in this contract.

Potential joins:

- `inquiries -> buyers -> users`
- `inquiry_items -> products/categories`
- `buyers -> users`
- `products -> categories`

## Mock Test Plan For Future Implementation

When implementing later, use Node built-in test runner and mock DB/auth.

Test cases:

- Missing token returns `UNAUTHORIZED`.
- Non-admin token returns `FORBIDDEN`.
- Admin token returns dashboard data.
- Inquiry list returns paginated list.
- Inquiry detail not found returns `NOT_FOUND`.
- Invalid `inquiryId` returns `VALIDATION_ERROR`.
- Products list does not require write permissions.
- No DB/internal errors leak in error response.

No real DB/Firebase test in first scaffold.

## 31D Backend Scaffold Plan

- Admin read-only backend scaffold planning is documented in `docs/ADMIN_READ_ONLY_BACKEND_SCAFFOLD_PLAN.md`.
- The scaffold plan remains read-only and covers future route, service, query, auth, validation, pagination, and mock test structure.
- Backend implementation is not started by the scaffold plan.
- Admin write APIs remain blocked.

## Non-Implementation Confirmation

- No backend route is implemented by this contract.
- No frontend admin route is connected by this contract.
- No SQL file is changed by this contract.
- No DB connection is opened by this contract.
- No Firebase Auth integration is added by this contract.
- No deploy is run by this contract.
