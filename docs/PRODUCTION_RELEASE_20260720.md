# Noblesse Production Release - 2026-07-20

## Decision

`PRODUCTION_RELEASED_WITH_AUTHENTICATED_E2E_PENDING`

The admin operations redesign, product option model, structured product-detail content, quote snapshot v2 support, and visual editor release from PR #7 are live on the production backend and Firebase Hosting.

The public storefront, public APIs, locale routes, responsive layouts, and hidden-product policy passed production checks. Authenticated admin and approved-buyer mutation E2E was not repeated after deployment because no prepared authenticated browser session or production UAT credential set was available. No password, token, cookie, local storage, or secret value was read.

## Release Baseline

| Item | Value |
| --- | --- |
| Repository | `D:\noblesse-current-main-quote` |
| Pull request | `#7` |
| Merge commit | `54e520c0a1d2ee2a44f1f77ab4629584ac8cf9cc` |
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
| Image tag | `release-54e520c` |
| Image digest | `sha256:9c82831f37c075764e740ab2fb37c6dfc09cfe0366cd9797565ef832d098f612` |
| Previous revision | `noblesse-backend-00022-s8c` |
| Active revision | `noblesse-backend-00023-gah` |
| Traffic | `100%` to active revision |

The candidate revision passed health, seed-product, hidden-canary, home-layout, and home-showcase probes before traffic promotion.

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
| Authenticated admin E2E | Pending authenticated session |
| Approved-buyer option/quote/PDF E2E | Pending authenticated session |

The production build reported a large-entry-chunk warning, but the repository performance budget passed. Bundle splitting remains a post-release optimization item.

## Safety

- Product or price mutation during release QA: No.
- Buyer approval mutation: No.
- Additional inquiry creation: No.
- Order, payment, cart, FX Job, or Scheduler execution: No.
- IAM mutation: No.
- Secret value access: No.
- `.firebase/` staged or committed: No.

## Rollback Reference

- Backend traffic rollback target: `noblesse-backend-00022-s8c`.
- Hosting rollback source: the previous release in Firebase Hosting release history.
- Database rollback is not the default: the release migrations are additive and should remain in place during a code rollback.
- Pre-release recovery point: Cloud SQL backup `1784507477114`, if an approved database recovery is ever required.

## Next Gate

Log in manually with dedicated production test accounts, then run one controlled E2E covering:

1. Admin product option and structured-detail edit without changing the seed product.
2. Approved buyer option combinations such as Gold + 6mm and Pink + 8mm as separate inquiry items.
3. Admin inquiry visibility and official quote issue.
4. PDF option labels and buyer accept/reject ownership checks.

Do not add checkout, payment, order creation, inventory deduction, or option surcharges.
