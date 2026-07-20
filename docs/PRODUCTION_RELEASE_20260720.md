# Noblesse Production Release - 2026-07-20

## Decision

`PRODUCTION_RELEASED_ADMIN_QUOTE_E2E_VERIFIED`

The admin operations redesign, product option model, structured product-detail content, quote snapshot v2 support, and visual editor release from PR #7 are live on the production backend and Firebase Hosting. Backend hotfix PR #9 is also live and fixes numeric parameter typing when an administrator saves a quote draft.

The public storefront, public APIs, locale routes, responsive layouts, and hidden-product policy passed production checks. An authenticated owner session then verified the existing buyer inquiry in the admin list and detail, created exactly one quote draft, issued immutable document version 1, and downloaded its PDF. Buyer accept/reject remains pending a separate approved-buyer session. No password, token, cookie, local storage, or secret value was read.

## Release Baseline

| Item | Value |
| --- | --- |
| Repository | `D:\noblesse-current-main-quote` |
| Pull request | `#7` |
| Merge commit | `54e520c0a1d2ee2a44f1f77ab4629584ac8cf9cc` |
| Backend hotfix pull request | `#9` |
| Backend hotfix merge commit | `c99f2e8e76a1f4350f4ee462bde3e86f9f859d8d` |
| Production URL | `https://noblesse.web.app` |
| GCP project | `pors-piercing-pos` |
| Region | `asia-northeast3` |

## Database

- Pre-release on-demand backup: `1784507477114` (`SUCCESSFUL`)
- Cloud SQL backups, point-in-time recovery, and deletion protection were confirmed enabled before mutation.
- The following additive migrations completed successfully in isolated Cloud Run Job executions:
  - `20260713_admin_operations_redesign.sql`
  - `20260714_home_showcase_management.sql`
  - `20260714_quote_status_trend_index.sql`
  - `20260716_home_layout_editor.sql`
  - `20260716_product_options_and_quote_snapshots.sql`
- The temporary migration Job was deleted after completion.
- No direct SQL console, DB console, or secret-value read was used.

## Backend

| Item | Value |
| --- | --- |
| Image tag | `release-c99f2e8` |
| Image digest | `sha256:fa07d8125a65ef5ddeb3ed021212f8152e29abf279f81d0d5caf6ed9b3870140` |
| Previous revision | `noblesse-backend-00023-gah` |
| Active revision | `noblesse-backend-00025-tuv` |
| Traffic | `100%` to active revision |

The hotfix candidate passed health, seed-product, hidden-canary, home-layout, and home-showcase probes before traffic promotion. The live quote-issue request returned `201` on revision `noblesse-backend-00025-tuv`.

## Authenticated Admin Quote E2E

- The existing inquiry appeared in the admin inquiry list and detail.
- Exactly one official quote draft was created from that inquiry.
- Draft conditions were saved with quantity `1`, KRW unit price `1,800`, a valid-until date, lead time, shipping terms, and a customer-facing note.
- The first issue attempt exposed a missing Storage permission before any document row or object was created.
- Bucket IAM was corrected with one conditional `roles/storage.objectAdmin` binding for the production runtime service account, restricted to the `quotes/` object prefix. Existing bucket bindings were unchanged.
- The controlled retry issued quote document version `1` with a server-calculated total of KRW `1,800`.
- The authenticated PDF endpoint downloaded one valid `%PDF-` file of `6,198,401` bytes. Storage contains one object for this quote revision.
- The admin page showed `발행됨`, the immutable version row, and the issued status-history event. Browser console errors and horizontal overflow were both `0`.

No additional inquiry, quote draft, document revision, product, price, buyer approval, order, payment, or cart mutation was created during the retry.

## Hosting And Public QA

- Firebase Hosting target `noblesse` deployed successfully.
- `GET /api/health`: healthy.
- Seed product detail/API: `200`.
- Hidden canary detail: `404`; no public exposure observed.
- Home layout and showcase APIs: `200`.
- Product gallery rendered six distinct gallery entries for the seed product.
- `/kr`, `/en`, `/jp`, and `/zh-TW` rendered; legacy `/cn` canonicalized to `/zh-TW`.
- Browser console errors: `0` in the checked public routes.
- Document horizontal overflow: `0` at 1440, 1024, and 390 CSS-pixel widths.

## Validation

| Check | Result |
| --- | --- |
| Frontend tests | Pass, 188/188 |
| Lint | Pass |
| Production build | Pass |
| Performance budget | Pass (`js=227.92KB`, `css=43.37KB`) |
| Candidate API probes | Pass |
| Post-promotion API probes | Pass |
| Public browser QA | Pass |
| Authenticated admin inquiry/quote/PDF E2E | Pass |
| Approved-buyer inquiry submit | Pass from the existing N77 canary |
| Approved-buyer accept/reject | Pending separate approved-buyer session |

The production build reported a large-entry-chunk warning, but the repository performance budget passed. Bundle splitting remains a post-release optimization item.

## Safety

- Product or price mutation during release QA: No.
- Buyer approval mutation: No.
- Additional inquiry creation: No.
- Order, payment, cart, FX Job, or Scheduler execution: No.
- IAM mutation: One bucket-level conditional object binding restricted to the `quotes/` prefix for the production runtime service account.
- Secret value access: No.
- `.firebase/` staged or committed: No.
- Seed product API checks: `200`; two post-operation reads matched SHA-256 `ff621c331f05bb91678d504f492fbe35f539c8ca7a8ae54b15acee54af19162a`.
- Hidden canary: detail `404`; absent from the public list.

## Rollback Reference

- Backend traffic rollback target: `noblesse-backend-00023-gah`.
- Hosting rollback source: the previous release in Firebase Hosting release history.
- Database rollback is not the default: the release migrations are additive and should remain in place during a code rollback.
- Pre-release recovery point: Cloud SQL backup `1784507477114`, if an approved database recovery is ever required.

## Next Gate

Use a dedicated approved-buyer session for the remaining controlled E2E covering:

1. Approved buyer option combinations such as Gold + 6mm and Pink + 8mm as separate inquiry items.
2. PDF option labels for those structured combinations.
3. Buyer accept/reject ownership and stale-document checks.
4. Admin product option and structured-detail canary using a dedicated hidden product, not the public seed product.

Do not add checkout, payment, order creation, inventory deduction, or option surcharges.
