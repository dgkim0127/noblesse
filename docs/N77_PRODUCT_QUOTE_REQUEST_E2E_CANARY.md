# N77 Product Quote Request E2E Canary

Date: 2026-07-13

## Scope

Task `N77Q` checked the approved-buyer product-detail quote request path for seed product `NB-4WAY-GREEN-CLOVER-BARBELL`.

Approved scope:

- Fix quote request gating when a buyer-visible product can be quoted but the exact price row is unavailable.
- Submit at most one successful quote request canary from an approved buyer session.
- Verify buyer/admin visibility after a successful canary.
- Keep product, price, hidden canary, order/payment/cart, FX, scheduler, Secret/IAM, SQL, and DB console changes out of scope.

## Baseline

| Item | Result |
| --- | --- |
| Branch | `main` |
| Starting HEAD | `78dc3d1ff18091d9d9ef3b578dfbfe85a8c7f07e` |
| Starting `origin/main` | `78dc3d1ff18091d9d9ef3b578dfbfe85a8c7f07e` |
| Starting worktree | Clean tracked tree; allowed untracked `.firebase/`, `operator-input/` |

## Cause Found

The product-detail submit payload was valid:

- `productCode`: `NB-4WAY-GREEN-CLOVER-BARBELL`
- `color`: `오알`
- `quantity`: `1`
- `requestMemo`: N77Q canary memo

The live backend still returned `404` for `POST /api/buyer/inquiries`. The existing backend write path required an exact active approved-only price row before creating an inquiry. That made quote creation fail when the price snapshot could not be resolved.

## Fix Applied

Backend:

- Added a visible-product fallback in `buyerInquiryQueries.createInquiry`.
- If the exact price row is unavailable but the product is still visible, the backend creates a requested inquiry with `price_snapshot = 0`, `subtotal = 0`, and `estimated_total = 0`.
- Hidden or unknown products still return `null` and do not insert an inquiry.

Frontend:

- Product detail now allows approved buyers to request a quote for a visible product even if exact price terms are unavailable.
- Inquiry List, Request Quote, My Inquiries, and admin inquiry/quote detail views render unavailable quote amounts as `가격 확인중` instead of showing `0` as a real price.

No DB migration was run.

## Validation

| Check | Result |
| --- | --- |
| Frontend focused tests | Pass |
| Backend tests | Pass |
| `npm.cmd run test:frontend` | Pass |
| `npm.cmd run lint` | Pass |
| `npm.cmd run build` | Pass |
| `npm.cmd run build:production` | Pass |
| Backend deploy | `noblesse-backend-00021-r27`, 100% traffic |
| Backend health | `200` |
| Firebase Hosting deploy | `hosting:noblesse`, success |

## Live E2E Result

Decision: `QUOTE_PRICE_GATE_FIXED_BUT_E2E_PARTIAL`

The approved buyer browser session initially rendered product detail quote controls and sent a valid payload, but the live `POST /api/buyer/inquiries` still returned `404` on backend revision `noblesse-backend-00021-r27`.

After browser/network recovery, the in-app browser session rendered `/kr/account` as `guest`. No password, token, cookie, localStorage, or Secret value was read. Because the approved buyer session was no longer available, no further canary submit was attempted.

| Item | Result |
| --- | --- |
| Successful quote canary submitted | No |
| Request ref/id | None |
| Buyer-side visibility | Not verified |
| Admin-side visibility | Not verified |
| Current blocker | Approved buyer session required for retry and response-body diagnosis |

## Safety

| Check | Result |
| --- | --- |
| Seed product before hash | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Seed product after hash | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Hidden canary detail | `404` |
| Hidden canary public list | Absent |
| Product mutation | No |
| Price mutation | No |
| Buyer approval mutation | No |
| Inquiry mutation | No successful canary created |
| Order/payment/cart | No |
| FX Job/Scheduler | No |
| Secret/IAM | No |
| Direct SQL/DB console | No |

## Next

Retry N77Q with a fresh approved buyer browser session:

1. Confirm `/kr/account` shows the approved buyer state.
2. Submit exactly one canary quote request.
3. If the POST still returns `404`, capture only the sanitized response body/status and do not read auth tokens.
4. Verify buyer-side `/kr/my-inquiries` or `/kr/inquiry-list`.
5. Verify admin-side `/kr/admin/quotes` or `/kr/admin/inquiries`.

Next planned workflow after successful canary:

`N78-ADMIN-INQUIRY-QUOTE-WORKFLOW`

## N77Q2 Route Fix And E2E Retry

Date: 2026-07-13

Decision: `QUOTE_ROUTE_FIXED_BUT_E2E_PARTIAL`

### POST 404 Diagnosis

`POST /api/buyer/inquiries` is the correct deployed route. An unauthenticated route smoke returned `401`, confirming the route exists and is protected by auth rather than missing.

The authenticated buyer submit returned `404` on backend revision `noblesse-backend-00021-r27` because KRW prices loaded from PostgreSQL numeric fields can arrive as strings such as `1800.00`. The backend money precision helper rejected that value for zero-minor-unit currencies, so `createInquiry` rolled back and the service returned `Product price not available`.

### Fix

Backend revision `noblesse-backend-00022-s8c` allows extra fractional digits only when they are all zero. Examples:

- `KRW 1800.00` is accepted as `1800`.
- `JPY 1200.0` is accepted as `1200`.
- non-zero fractional KRW/JPY values remain rejected.

No DB migration, Secret/IAM change, product mutation, or price mutation was performed.

Frontend Hosting was also updated after verification showed the admin-required gate linked to `/login` while the current storefront login UX uses the modal login. The admin gate now opens the same login modal in place. Firebase Hosting target `noblesse` was deployed once for this frontend fix.

### Canary Submit

Approved buyer session submitted exactly one successful canary after the backend fix:

| Item | Result |
| --- | --- |
| Product | `NB-4WAY-GREEN-CLOVER-BARBELL` |
| Color | `오알` |
| Quantity | `1` |
| Memo | N77Q2 canary memo |
| Request id | `8405661e-db9c-418d-bb9b-dfa39f663f0f` |
| Inquiry number | `INQ-20260713-29833682` |
| Status | `requested` |

Buyer-side detail rendered the product code, color `오알`, total quantity `1`, `Quote Requested`, and `₩1,800`. Internal admin/cost/supplier fields were not visible, and direct-purchase/payment wording was not present.

Admin-side verification is still pending because the active browser session is the approved buyer only. `/kr/admin/inquiries` correctly renders the admin-required gate for that buyer session, and the `관리자 로그인` button opens the login modal. The canary remains `requested`; no status change was performed.

### Safety

| Check | Result |
| --- | --- |
| Seed product before hash | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Seed product after hash | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Hidden canary detail | `404` |
| Hidden canary public list | Absent |
| Product mutation | No |
| Price mutation | No |
| Buyer approval mutation | No |
| Order/payment/cart | No |
| FX Job/Scheduler | No |
| Secret/IAM | No |
| Direct SQL/DB console | No |

### Validation

| Check | Result |
| --- | --- |
| Backend tests | Pass |
| `npm.cmd run test:frontend` | Pass |
| `npm.cmd run lint` | Pass |
| `npm.cmd run build` | Pass |
| `npm.cmd run build:production` | Pass |
| `git diff --check` | Pass |

### Remaining Gate

Admin-side visibility must still be verified with an admin session before N78 is considered unblocked.
