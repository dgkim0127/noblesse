# N74 Catalog Editor Save/Load Canary

Date: 2026-07-08

## Scope

This check verified the production admin catalog editor save path with one controlled hidden canary product.

Repository: `D:\noblesse-main-work`
Branch: `main`
HEAD: `a567bf06001ce9e9a80d128e465582c17647120a`
Production URL: `https://noblesse.web.app`

## Guardrails

- No existing production product was edited.
- Seed product `NB-4WAY-GREEN-CLOVER-BARBELL` was read before and after; the JSON hash matched.
- No direct database connection, SQL, migration, secret access, IAM change, FX job, scheduler change, backend deploy, or Firebase deploy was performed.
- Browser auth token, cookies, localStorage, and secret values were not extracted.

## Canary

| Item | Value |
| --- | --- |
| Product code | `NB-CANARY-EDITOR-SAVELOAD-001` |
| Intended state | hidden, inactive, not home-placed |
| Image | temporary local placeholder uploaded through the admin editor |
| Public detail before create | 404 |
| Public detail after save attempt | 404 |
| Public product list after save attempt | canary absent; public count remained 1 |

## Save Attempt Result

The production admin editor accepted the 8-step form and started the existing save flow.

| Step | Result | Evidence |
| --- | --- | --- |
| Category | Not newly created | Existing `barbell` category selected |
| Product | Completed | Editor reported product step complete |
| Image | Completed | Editor reported photo step complete |
| Price | Failed | Editor reported `관리자 권한이 없습니다.` at price step |

Decision: `STOPPED_SAVELOAD_REQUIRES_PRICE_PERMISSION`

The canary proves that the product and image portions of the editor are wired to real production mutation paths, but the full product-plus-price save/load canary is blocked by missing price-write permission for the current operator session.

## Field Matrix

| Editor area | Save path status | Reload/read-back status |
| --- | --- | --- |
| Product code/name/description/material/colors/sizes/badge | Product step completed | Public hidden state confirmed; full admin edit reload not exposed in current UI |
| Visibility and home placement flags | Product step completed with hidden/off values | Public API list/detail kept canary hidden |
| Taxonomy/spec/detail copy JSON | Product step completed by editor flow and backend create path supports JSON fields | Needs admin edit/detail reload surface for full operator verification |
| Image metadata and binary upload | Photo step completed | Public hidden state prevents public image exposure |
| KR price and FX market modes | Blocked at price step | Not verified |

## Existing Product Safety

`NB-4WAY-GREEN-CLOVER-BARBELL` public API JSON was fetched before and after the canary attempt.

Result: unchanged.

## Follow-Up

1. Confirm whether the current owner/admin should receive the narrow permission needed by the price writer.
2. Add or expose an admin product edit/reopen screen so taxonomy, specs, detail copy, and home placement can be reloaded field-by-field after save.
3. Repeat the canary only after the price permission gap is intentionally resolved.

## N74P Price Permission Recovery Preflight

Date: 2026-07-08

Repository: `D:\noblesse-main-work`
Branch: `main`
HEAD: `24ceb8c8cf7829630b062c4c78058645af5dbf39`

### Permission Finding

The blocked price step maps to the existing admin price-book endpoint:

- `PUT /api/admin/products/:productId/price-books`
- Route guard: `prices.write`
- Permission source: `backend/src/auth/adminPermissions.js`
- Delegation status: `prices.write` is delegable; governance permissions such as `admins.manage` and `settings.manage` are non-delegable.

The minimum recovery is therefore an `allow` override for `prices.write` on the intended canary operator/admin account. Broader roles such as owner, broad admin permissions, IAM, Secret Manager, Firebase custom claims, direct SQL, or database console changes are not required for this specific blocker.

### Safe Grant Path

The existing safe mutation path is the admin governance API/UI:

- `PUT /api/admin/admins/:userId/permission-overrides/:permissionKey`
- Required acting principal: current owner admin with `admins.manage`
- Allowed target permission: `prices.write`
- Required reason: a non-empty reason string

This task did not complete the permission grant because the production admin team page could not be observed or operated reliably from the current browser-control session after opening `/kr/admin/team`. Without confirming the acting session and target admin row in the existing UI, applying the override would require guessing an account identifier or using a lower-level path, both of which are outside the approved safe-recovery boundary.

Decision: `STOPPED_PRICE_PERMISSION_REQUIRES_OWNER_GOVERNANCE_SESSION`

### Canary Retry

The hidden canary product state was visible in the existing catalog editor session before the team-page check. The price retry was not executed because the `prices.write` grant was not safely confirmed first.

No canary product was published, no existing product was changed, no direct database connection or SQL was used, no secret/IAM/Firebase custom claim was changed, and no backend or Firebase deploy was performed.

### Next Safe Step

Use an owner admin session that can access `/kr/admin/team`, then add only this override to the intended operator/admin account:

| Field | Value |
| --- | --- |
| Permission | `prices.write` |
| Effect | `allow` |
| Reason | `N74P price save canary recovery` |
| Expiry | Optional; set only if operations policy requires it |

After the override is confirmed in the admin UI, retry only the failed price step for hidden canary `NB-CANARY-EDITOR-SAVELOAD-001` and re-check that the canary remains absent from public list/detail routes.

## N74P2 Owner Governance Session Attempt

Date: 2026-07-08

Repository: `D:\noblesse-main-work`
Branch: `main`
HEAD: `410545785bdaea6f593154da48ec78e2b555c0c6`

### Attempted Scope

The approved recovery was limited to the existing owner governance UI/API path:

- Grant only `prices.write = allow` to the intended canary operator/admin account.
- Retry only the failed price-book save for hidden canary `NB-CANARY-EDITOR-SAVELOAD-001`.
- Keep the canary hidden, inactive, unpublished, and absent from home placement.

### Result

The production browser session was on `/kr/admin/team`, but the rendered page showed the admin access fallback instead of the team management controls:

- Current admin session visible: redacted `dgkim0127@...`
- Team management content: not rendered
- Visible blocker: additional admin API permission required
- Owner governance controls: not available
- `prices.write` override applied: No
- Canary price retry executed: No

Applying the override without the owner governance UI would require guessing a target account identifier, extracting browser credentials, using a lower-level backend call outside the rendered owner workflow, or using direct database/SQL recovery. Those paths were outside the approved boundary for this task.

Decision: `STOPPED_OWNER_GOVERNANCE_SESSION_LACKS_TEAM_ACCESS`

### Read-Only Safety Check

After stopping before mutation, public API checks were read-only:

| Check | Result |
| --- | --- |
| Seed product detail | 200 |
| Seed product hash | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Canary public detail | 404 |
| Canary in public product list | No |

No existing product was changed, no canary was published, no direct DB connection or SQL was used, no Secret/IAM/Firebase custom claim was changed, no backend or Firebase deploy was performed, and no token/cookie/localStorage value was extracted.

### Next Safe Step

Use an authenticated owner admin session that can render `/kr/admin/team`, then apply only this override through the existing UI:

| Field | Value |
| --- | --- |
| Permission | `prices.write` |
| Effect | `allow` |
| Reason | `N74P2 prices.write canary retry` |
| Target | Intended canary operator/admin account |

Next gate: `APPROVE_OWNER_GOVERNANCE_PRICE_PERMISSION_SESSION = YES` with a confirmed owner session that can access `/kr/admin/team`.
