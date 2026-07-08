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

## N74P3 Owner Team Access Diagnosis

Date: 2026-07-08

Repository: `D:\noblesse-main-work`
Branch: `main`
HEAD: `1995e23e38995bb5c2e2402627b70c1ebd67af67`

### Read-Only Finding

The team management page is intentionally guarded before render:

- Route: `/admin/team` and `/:locale/admin/team`
- Frontend route guard: `admins.read`
- Backend list route: `GET /api/admin/admins` requires `admins.read`
- Governance mutations require `admins.manage`
- Server-side governance writes additionally require `adminRole = owner`
- `prices.write` is present in the delegable permission catalog

The current production browser session was logged in and showed the redacted active admin account, but the admin shell role label rendered as operator and `/kr/admin/team` rendered the additional-permission fallback instead of the team table or owner controls.

Observed browser result:

| Check | Result |
| --- | --- |
| Logged-in admin shell | Yes |
| Visible role label | operator |
| Team table rendered | No |
| Assign-operator controls rendered | No |
| Permission fallback rendered | Yes |
| Browser token/cookie/localStorage extraction | No |
| Safe `/api/admin/me` read | Attempted through browser context; unavailable without credential extraction |

### Classification

Decision: `OWNER_PERMISSION_NOT_GRANTED`

The code path does not show a team-page gate bug. Owner sessions should resolve `admins.read` and `admins.manage`; non-owner sessions cannot view the team table or change permission overrides. Because the visible session is the expected production administrator identity but resolves as operator in the UI, the blocker is that the production admin profile is not currently represented as owner/admins.manage in the admin permission model.

No `prices.write` override was applied, no canary was retried, no product was mutated, no SQL/DB console was used, no IAM/Secret/Firebase custom claim was changed, and no deploy was performed.

### Next Safe Step

Run a separately approved owner/admin profile recovery using the existing audited governance model, then return to the original narrow grant:

| Target | Value |
| --- | --- |
| Acting account | intended production owner admin |
| Required role | `owner` |
| Required governance permission | `admins.manage` |
| Later narrow override | `prices.write = allow` for the intended canary operator/admin account |

Next gate: `APPROVE_OWNER_ADMIN_PROFILE_RECOVERY = YES`

## N74P4 Owner Admin Profile Recovery Preflight

Date: 2026-07-08

Repository: `D:\noblesse-main-work`
Branch: `main`
HEAD: `f7774d446aa72021115e3b5506863ae6b1d6ae74`

### Approved Recovery Path

The existing recovery path was found and reviewed:

- Script: `backend/src/scripts/recoverOwnerAdminAccount.js`
- Service: `backend/src/services/ownerAdminRecoveryService.js`
- Queries: `backend/src/db/queries/ownerAdminRecoveryQueries.js`
- Package script: `npm run recover:owner-admin`

The path is fail-closed and requires `NOBLESSE_OWNER_ADMIN_RECOVERY_ALLOW=YES`, a production runtime marker, and `TARGET_OWNER_IDENTIFIER`. It rejects password input, rejects canary/test targets, checks that the target is a single active approved admin account, verifies the Firebase user is enabled, and mutates only `admin_profiles.admin_role = owner` after matching the Firebase UID to `users.auth_uid` in a transaction.

The sanitized script result intentionally does not include email, UID, token, password, or database connection details. The script also reports `explicitAdminsManageGrant=false`, `catalogWriteGranted=false`, and `otherPermissionsGranted=false`, so it does not grant `prices.write`.

### Stop Reason

Decision: `STOPPED_OWNER_RECOVERY_REQUIRES_SECRET_OR_IAM_APPROVAL`

Read-only IAM inspection showed the production runtime service account currently has `roles/cloudsql.client`, but no `roles/firebaseauth.viewer` binding was found. The owner recovery script requires Firebase Admin user lookup before any DB mutation, which requires `firebaseauth.users.get`.

Because the current approval allows limited owner profile mutation but does not approve IAM changes, the recovery Job was not created and the owner recovery script was not executed.

| Check | Result |
| --- | --- |
| Target account identified | Yes, redacted intended production admin |
| Existing safe recovery script found | Yes |
| Direct SQL required | No |
| Firebase user lookup required | Yes |
| Runtime Firebase Auth Viewer present | No |
| Recovery Job created | No |
| Recovery Job executed | No |
| Owner profile mutated | No |
| `prices.write` granted | No |
| Canary price retry | No |

No Secret value was accessed, no IAM role was changed, no Cloud Run Service was updated, no backend or Firebase deploy was performed, no direct DB connection or SQL was used, no product/buyer/inquiry data was changed, and no token/cookie/localStorage value was extracted.

### Next Safe Step

Approve a narrowly scoped temporary Firebase Auth Viewer grant for the production runtime service account, run the existing owner recovery Job exactly once, then revoke the temporary role after success or failure.

Next gate: `APPROVE_OWNER_RECOVERY_FIREBASE_AUTH_VIEWER_IAM_FIX = YES`
