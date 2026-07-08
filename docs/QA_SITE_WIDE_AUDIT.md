# Noblesse Site-Wide QA Audit

Date: 2026-07-08

Task: `N73-SITE-WIDE-QA-AND-OPERATIONS-MAP-1`

Decision: `SITE_MAP_READY`

## Baseline

| Item | Value |
| --- | --- |
| Workspace | `D:\noblesse-main-work` |
| Branch | `main` |
| HEAD before audit | `81c5d80f0a2daf0dc9bf091b46e107d4b89ec1d3` |
| origin/main before audit | `81c5d80f0a2daf0dc9bf091b46e107d4b89ec1d3` |
| Working tree before docs | Clean tracked files; allowed untracked `.firebase/` and `operator-input/` only |

## Browser Route QA

Production routes were checked read-only in the in-app browser. No forms were submitted and no admin mutation buttons were used.

| Route | Result | Notes |
| --- | --- | --- |
| `/` | Pass | Home rendered, no console errors observed |
| `/kr` | Pass | Korean home rendered |
| `/en` | Pass | English home rendered |
| `/jp` | Pass | Japanese home rendered |
| `/cn` | Pass | Canonicalized to Taiwan Chinese route |
| `/zh-TW` | Pass | Taiwan Chinese home rendered |
| `/products` | Pass | Product list rendered |
| `/kr/products` | Pass | Korean product list rendered |
| `/products/NB-4WAY-GREEN-CLOVER-BARBELL` | Pass | Seeded product detail rendered |
| `/zh-TW/products/NB-4WAY-GREEN-CLOVER-BARBELL` | Pass | Taiwan Chinese detail rendered |
| `/cn/products/NB-4WAY-GREEN-CLOVER-BARBELL` | Pass | Canonicalized to `zh-TW` detail |
| `/products/NB-NONEXISTENT-PRODUCT-0000` | Pass | Not-found state rendered |
| `/register` | Pass | Registration rendered |
| `/kr/register` | Pass | Korean registration rendered |
| `/zh-TW/register` | Pass | Taiwan Chinese registration rendered |
| `/cn/register` | Pass | Canonicalized to `zh-TW/register` |
| `/admin` | Pass | Protected admin route checked read-only |
| `/kr/admin/catalog/new` | Pass | Admin product entry route rendered under existing session |
| `/kr/admin/products` | Pass | Admin product route rendered under existing session |
| `/kr/admin/categories` | Pass | Admin category route rendered under existing session |
| `/kr/admin/prices` | Pass | Admin price route rendered under existing session |
| `/kr/admin/team` | Pass | Admin team route rendered under existing session |
| `/kr/admin/buyers` | Pass | Buyer management route rendered under existing session |
| `/kr/admin/inquiries` | Pass | Inquiry route rendered under existing session |
| `/kr/admin/quotes` | Pass | Quote route rendered under existing session |
| `/kr/admin/analytics` | Pass | Analytics route rendered under existing session |

Observed browser QA summary:

| Check | Result |
| --- | --- |
| Console fatal errors | 0 observed during sampled route navigation |
| Horizontal overflow | Not observed in sampled desktop checks |
| Legacy `cn` behavior | Canonicalizes to `zh-TW` |
| Nonexistent product handling | Not-found state rendered |
| Admin routes | Protected and render only with active admin session |

## API Smoke

The following API checks were performed without authenticated user data.

| Method | Path | Expected | Observed |
| --- | --- | --- | --- |
| GET | `/api/health` | 200 | 200 |
| GET | `/api/catalog/products` | 200 | 200 |
| GET | `/api/catalog/products/NB-4WAY-GREEN-CLOVER-BARBELL` | 200 | 200 |
| GET | `/api/catalog/products/NB-NONEXISTENT-PRODUCT-0000` | 404 | 404 |
| GET | `/api/buyer/me` | 401 without auth | 401 |
| GET | `/api/admin/me` | 401 without auth | 401 |
| POST | `/api/auth/resolve-login-identifier` with smoke-only dummy input | Closed to unauthenticated smoke | 401 |

## Public Catalog State

| Item | Observed |
| --- | --- |
| Public product count | 1 |
| Seed product route | `/products/NB-4WAY-GREEN-CLOVER-BARBELL` |
| Product image metadata | Present |
| Home placement metadata | Present |
| Related products | Sparse because only one public product exists |

## Home Page QA Notes

| Area | Status | Follow-up |
| --- | --- | --- |
| Header and locale controls | Operational | Continue route and session regression checks |
| Snap / hero area | Operational | Needs admin-editable placement controls |
| Category chips | Operational | Needs server-backed management if live operations require edits |
| Product sections | Operational | Needs empty/disabled rules when no assigned product exists |
| Floating helper / test control | Should be removed from production UI if still visible | Track under next UI cleanup task |

## Product Detail QA Notes

| Area | Status | Follow-up |
| --- | --- | --- |
| Product image | Operational | Typography and spacing still need refinement across long locale text |
| Approval panel | Operational | Keep approved-price visibility guarded |
| Editorial sections | Operational | Some long copy can feel oversized or compressed in JP/TW screenshots |
| Related products | Empty/sparse | Add more real catalog products or hide when empty |

## Registration QA Notes

| Area | Status | Follow-up |
| --- | --- | --- |
| Korean terms structure | Reference-quality structure exists | Keep as source for other locales |
| English/Japanese/Taiwan Chinese terms parity | Needs continued copy and layout QA | Ensure tables and detailed clauses match Korean structure |
| Phone input | Needs country-aware formatting UX | Track as registration UX task |

## Admin QA Notes

| Area | Status | Follow-up |
| --- | --- | --- |
| Buyer management | Operational route | UX can be simplified; status controls need clearer permission feedback |
| Team/operator management | Operational route | Owner-to-operator workflow exists; keep permissions explicit |
| Catalog entry | Operational route | Attribute/detail editor still needs rework |
| Home placement management | Missing | Needed to manage hero, snap, weekly, new, buyer, piercing, steady placements |
| FX admin | Operational route | Continue scheduled verification and observability checks |

## Risk Register

| Risk | Severity | Current mitigation |
| --- | --- | --- |
| Only one production public product | Medium | Related sections are sparse; seed more real catalog only through approved workflow |
| Home section fallback can show unintended items | Medium | Add admin placement and enable/disable controls |
| Product detail long-locale typography | Medium | Rework detail typography and responsive rules |
| Admin buyer status UX unclear | Medium | Clarify role, account state, buyer state, and permission actions |
| Locale parity in terms | Medium | Keep Korean structure as reference and localize table/clauses |

## Mutation Confirmation

| Mutation class | Result |
| --- | --- |
| Production data changes | No |
| Product create/update/delete | No |
| Buyer status change | No |
| Inquiry create/update | No |
| Manual FX execution | No |
| Scheduler change | No |
| Runtime config change | No |
| Database migration | No |
| Deployment | No |
