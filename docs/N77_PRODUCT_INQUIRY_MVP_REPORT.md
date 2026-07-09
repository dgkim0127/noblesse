# N77 Product Inquiry MVP Report

Date: 2026-07-09

Scope: product-detail quote request MVP for the Noblesse B2B catalog.

## Decision

`PRODUCT_INQUIRY_MVP_READY_FOR_FRONTEND_RELEASE`

The existing inquiry backend model and API already support the required first product inquiry flow, so no database migration or backend code change was required.

## Reused Backend Contract

| Area | Existing route | Result |
| --- | --- | --- |
| Buyer inquiry create | `POST /buyer/inquiries` | Reused |
| Buyer inquiry history | `GET /buyer/inquiries` | Reused |
| Buyer inquiry detail | `GET /buyer/inquiries/:inquiryId` | Reused |
| Admin inquiry queue | `GET /admin/inquiries` | Reused |
| Admin inquiry detail | `GET /admin/inquiries/:inquiryId` | Reused |
| Admin status update | `PATCH /admin/inquiries/:inquiryId/status` | Reused |

The existing backend policy only allows approved buyers to create inquiries. That is stricter than a pending-buyer draft flow, so the frontend follows the current production policy and keeps guest/pending users on approval guidance.

## Frontend Change

Product detail now provides two approved-buyer actions:

| Action | Purpose |
| --- | --- |
| Add to Inquiry List | Continue the existing multi-product quote-request flow |
| Request quote for this product | Create a one-product inquiry from the current detail page selection |

The one-product request captures:

- product code from the existing product record
- selected color
- selected size
- quantity normalized to MOQ
- optional buyer note

## Protection

- Guest and pending users do not receive the product inquiry create control.
- Price and MOQ remain gated by the existing approved-buyer policy.
- Hidden products remain protected by the existing backend visible-product lookup.
- The hidden canary product was not targeted or mutated.
- No direct-settlement UI was introduced.

## Validation

| Check | Result |
| --- | --- |
| Frontend tests | Passed, 147 tests |
| Backend migration | Not required |
| Backend deploy | Not required |
| Production data mutation | Not performed during implementation |

## Remaining Operator Check

An authenticated approved-buyer browser session can be used for a live canary request after release. If no safe approved-buyer session is available, do not extract tokens or credentials to force the check.
