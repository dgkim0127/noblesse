# Noblesse B2B Catalog Roadmap

Date: 2026-07-08

Purpose: convert the current production catalog into an operations-ready B2B wholesale catalog while preserving the quote-request model.

## Principles

- Keep the product flow image-first and premium.
- Keep prices and MOQ gated by buyer approval.
- Keep direct settlement out of the public site.
- Make admin operations explicit instead of relying on hard-coded or fallback content.
- Prefer additive schema and API changes.
- Never expose private runtime configuration in frontend builds.

## Phase 1 - Stabilize Current Production

| Workstream | Goal | Status |
| --- | --- | --- |
| Public route QA | Keep home, product list, detail, register, account, admin routes rendering | In progress |
| Product detail typography | Make KR/EN/JP/TW long copy balanced and readable | Needed |
| Registration locale parity | Match Korean terms/table structure in EN/JP/TW | Needed |
| Header session UX | Keep login state stable across logo/home navigation | Needs regression watch |
| Remove temporary UI | Remove helper/test labels from production UI | Needed |

## Phase 2 - Catalog Data Completeness

| Workstream | Goal | Notes |
| --- | --- | --- |
| Attribute detail editor | Admin can enter material, shape, structure, color, size, and detail copy cleanly | Next recommended task |
| Product images | Keep object metadata in DB and binary assets in storage | Existing image path present |
| Product option structure | Normalize finish, size, color, and variant attributes | Required before richer inquiry flows |
| Category and taxonomy editor | Manage category, material, shape, and filter labels from admin | Needed |
| Empty section behavior | Disable or hide empty home sections until assigned content exists | Needed |

## Phase 3 - Home Editorial Operations

| Home area | Admin capability |
| --- | --- |
| Snap / hero cards | Upload/select image, title, label, link, sort, visible state |
| New arrivals | Assign products or auto from recent products, with enable/disable |
| Weekly pick | Assign products, editorial text, enable/disable |
| Buyer selection | Assign products/collections for buyer-specific editorial blocks |
| Piercing | Map taxonomy-driven product groups |
| Steady selection | Curate steady-selling products |

Recommended model:

```mermaid
erDiagram
  HOME_SECTION ||--o{ HOME_SECTION_ITEM : contains
  HOME_SECTION {
    string key
    string locale
    boolean enabled
    integer sort_order
  }
  HOME_SECTION_ITEM {
    string section_key
    string product_id
    string image_key
    integer sort_order
    boolean visible
  }
```

## Phase 4 - Buyer and Admin Operations

| Workstream | Goal |
| --- | --- |
| Buyer management UX | One card per member with buyer state, account state, discount class, and operator actions |
| Operator role assignment | Owner can appoint operators and assign permissions safely |
| Inquiry management | Admin can review buyer inquiries and change workflow states |
| Quote management | Admin can create/send quote responses from inquiry data |
| Audit clarity | Important admin changes are visible in audit logs |

Buyer lifecycle should separate:

| Dimension | Values |
| --- | --- |
| Account state | Active, withdrawn, removed |
| Buyer review state | Draft, pending, approved, rejected, suspended, blocked |
| Admin role | Owner, operator, none |

## Phase 5 - Inquiry and Quote MVP

```mermaid
flowchart TD
  A["Approved buyer"] --> B["Add product to inquiry list"]
  B --> C["Request quote"]
  C --> D["Admin review"]
  D --> E["Quote response"]
  E --> F["Buyer reviews quote"]
  F --> G["Offline trade follow-up"]
```

Needed:

| Feature | Notes |
| --- | --- |
| Single-product inquiry | Verified with the existing approved-buyer canary and confirmed in the production admin list/detail |
| Multi-product inquiry | Existing Inquiry List remains the source |
| Quantity and option capture | Keep product option data structured |
| Admin quote response | Production-verified through draft save, server total calculation, immutable document version 1, and authenticated PDF download |
| Buyer history | Buyer-side inquiry visibility is verified; issued-quote visibility and accept/reject remain the next controlled gate |
| Status labels | Quote Requested, Under Review, Quote Sent, Closed, Cancelled |

## Phase 6 - FX and Pricing Operations

| Workstream | Goal |
| --- | --- |
| FX provider reliability | Provider auth, scheduled checks, and observability are already underway |
| Draft review | Admin can inspect auto-generated multi-currency drafts |
| Publish flow | Price publish requires admin approval |
| Precision rules | KRW/JPY integer, USD/CNY decimal precision |
| Market visibility | Buyer sees only allowed market/currency data |

## Phase 7 - Operations and Readiness

| Area | Needed |
| --- | --- |
| Monitoring | Uptime, backend 5xx, latency, DB/storage, FX schedule |
| Runbooks | Deployment, rollback, product seed, buyer approval, FX incident |
| QA checklist | Public, buyer, admin, API, locale, mobile |
| Content operations | Product photography, alt text, category naming, locale review |

## Out-of-Scope Until Explicitly Approved

- Public direct settlement
- Direct checkout
- Payment gateway
- Consumer coupon or point system
- Review-centered marketplace features
- Mobile app packaging

If a future back-office order or settlement workflow is needed, it should be designed as an internal B2B operations workflow after quote management is stable, not as a public instant-purchase flow.

## 2026-07-20 Production Release Status

PR #7 and quote draft hotfix PR #9 are live on backend revision `noblesse-backend-00025-tuv`; Firebase Hosting target `noblesse` remains live. The release includes the task-oriented admin redesign, visual home and product editors, structured product options, structured product-detail blocks, quote snapshot v2 support, and PDF option-label support. Public storefront and API checks passed across KR, EN, JP, Traditional Chinese, legacy CN, desktop, tablet, and mobile widths.

The authenticated admin and single-product buyer gates are now complete: the existing inquiry rendered in admin, one quote draft was saved, immutable document version 1 was issued, the authenticated PDF downloaded from both admin and buyer views, and the approved buyer accepted the quote exactly once. The decision created no checkout, payment, order, inventory, or option-surcharge behavior. The next controlled gate is narrower: verify Gold + 6mm and Pink + 8mm as two distinct structured-option inquiry items through the buyer list, admin quote, and PDF snapshot. Bundle splitting remains the main post-release performance optimization because the production build still reports a large entry chunk even though the enforced performance budget passes.

## Next Recommended Task

`Post-N74 product operations hardening`

N74 completed the first reliable product attribute/detail editor surface. The next product operations work should focus on real operator workflow testing and any remaining edit/update flows, not on adding public settlement.

Completed in N74:

| Area | Result |
| --- | --- |
| Admin catalog entry | Long-form product editor now includes Korean name, taxonomy, options/specs, detail copy, image metadata, pricing, placement, and review sections |
| Public detail page | Product detail copy and responsive typography were cleaned for KR/EN/JP/TW routes |
| Taxonomy labels | Public/admin labels were normalized for KR, EN, JP, and Traditional Chinese surfaces |
| Validation | Optional numeric spec fields reject invalid non-positive values while unknown real specs can stay blank |
| Save/load canary | Production editor can create hidden product and image records; owner-session retry verified the hidden canary KR price row reloads as `KRW 1800` while remaining absent from public product routes |

Remaining recommended follow-up:

| Area | Next step |
| --- | --- |
| Existing product edit | Confirm whether operators need a full edit screen for already-created products |
| Price writer permission | Owner recovery is complete and N74PX made the existing delegable `prices.write` permission visible. N74P5B used the active owner browser session to submit the hidden N74 canary KR price save exactly once and reload-verify `KRW 1800`; no permission grant was needed in that run |
| Field-level reload QA | Add or expose an edit/reopen path so taxonomy, specs, detail copy, images, placement, and price fields can be checked after save |
| Real catalog data | Fill only confirmed material, gauge, size, and decoration data supplied by the operator |
| Product inquiry MVP | Build the quote-request workflow after catalog data entry is stable |

N77Q status: price-pending quote request code has been deployed to backend revision `noblesse-backend-00021-r27` and Firebase Hosting target `noblesse`. The first E2E canary did not complete because the live approved buyer session returned `404` once and then became a guest session.

N77Q2 status: backend revision `noblesse-backend-00022-s8c` fixed the KRW numeric-scale POST404 path, and the approved buyer canary submitted successfully as `INQ-20260713-29833682`. Buyer-side visibility is verified. N78 remains blocked until admin-side visibility/detail is verified with an admin browser session.

N77Q5 status: admin-side inquiry visibility/detail, official quote issue, immutable PDF revision 1, and authenticated PDF download are verified in production. N78 admin quote issuance is unblocked. The remaining release gate is approved-buyer issued-quote visibility plus accept/reject and structured option-combination ownership checks.

N77Q6 status: the approved buyer found the issued quote, downloaded immutable PDF version 1, and accepted the quote exactly once. The UI and resulting state confirmed that no order or payment was created. The remaining release gate is the two-combination structured-option inquiry/admin/PDF E2E.
