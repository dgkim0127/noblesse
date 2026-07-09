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

## N74P4B Owner Recovery Firebase Auth Viewer IAM Fix

Date: 2026-07-08

Repository: `D:\noblesse-main-work`
Branch: `main`
HEAD: `e06e0ba769a9a1e756d5e03618e0eb615dfe938e`

### Temporary IAM and Recovery Execution

The production runtime service account was temporarily granted only `roles/firebaseauth.viewer` so the existing owner recovery script could perform the required Firebase Admin user lookup. The role was confirmed before execution and revoked after the recovery flow completed.

| Item | Result |
| --- | --- |
| Runtime principal | `serviceAccount:noblesse-production-runtime@pors-piercing-pos.iam.gserviceaccount.com` |
| Temporary role | `roles/firebaseauth.viewer` |
| IAM grant count | 1 |
| Recovery Job | `noblesse-owner-admin-profile-recovery-n74p4b` |
| Job create count | 1 |
| Job execute count | 1 |
| Execution ID | `noblesse-owner-admin-profile-recovery-n74p4b-jk2xg` |
| Execution result | Succeeded, exit 0 |
| Recovery category | `OWNER_ADMIN_RECOVERY_COMPLETE` |
| Firebase target found/enabled | Yes |
| Owner ready | Yes |
| Transaction committed | Yes |
| Job deleted | Yes |
| IAM revoke count | 1 |
| Firebase Auth Viewer after cleanup | Absent |

The sanitized recovery output did not include the target email, Firebase UID, token, password, database URL, host, user, database name, SQL parameters, or secret values.

### Team Access and Permission State

The production browser session rendered `/kr/admin/team` with the admin team page and owner/admin navigation visible. The team table and role editor rendered, confirming that owner governance access was restored.

The role editor did not expose a `prices.write` override in the observed owner rows because owner overrides are protected. Source inspection still confirms `prices.write` exists in the frontend permission catalog and backend admin permission matrix, but this task did not grant it and did not retry the canary price save.

| Check | Result |
| --- | --- |
| `/kr/admin/team` rendered | Yes |
| Admin shell rendered | Yes |
| Owner/team signals rendered | Yes |
| Horizontal overflow | No |
| Login configuration error | No |
| `prices.write` granted | No |
| Canary price retry | No |

### Public Safety Checks

The seed product public API remained unchanged from the prior canary baseline hash, and the hidden canary product remained absent from public catalog surfaces.

| Check | Result |
| --- | --- |
| Seed product API status | 200 |
| Seed product SHA-256 | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Hidden canary detail route | 404 |
| Product list contains hidden canary | No |

No Secret value was accessed, no direct DB connection or manual SQL was used, no Firebase custom claim was edited, no Cloud Run Service or Firebase Hosting deploy was performed, no product, buyer, inquiry, order, FX, or scheduler mutation was performed, and no token/cookie/localStorage value was extracted.

### Next Safe Step

Use the restored owner/team access to grant only `prices.write = allow` through the existing owner-governed admin permission path, then retry only the failed hidden canary price save.

Next gate: `APPROVE_OWNER_GOVERNANCE_PRICE_PERMISSION_SESSION = YES`

## N74P4B Retry 2 Owner Recovery Firebase Auth Viewer IAM Fix

Date: 2026-07-09

Repository: `D:\noblesse-main-work`
Branch: `main`
Starting HEAD: `0fcbe7d4fe81561076d259d5be7b6a9b172405a7`

### Baseline Change Inspection

The expected baseline moved from `e06e0ba769a9a1e756d5e03618e0eb615dfe938e` to `0fcbe7d4fe81561076d259d5be7b6a9b172405a7`.

| Check | Result |
| --- | --- |
| Commit range | `e06e0ba..0fcbe7d` |
| Commits inspected | `0fcbe7d docs(admin): record owner recovery iam fix` |
| Changed files | `docs/N74_CATALOG_EDITOR_SAVE_LOAD_CANARY.md`, `docs/OPS_INDEX.md`, `docs/ROADMAP_B2B_SHOPPING_MALL.md` |
| Change type | Docs-only owner recovery record |
| Unexpected auth/IAM/backend/runtime/permission code changes | No |
| Safe to continue | Yes |

### Temporary IAM, Recovery Execution, and Cleanup

`roles/firebaseauth.viewer` was temporarily granted only to the production runtime service account so the existing owner recovery path could perform its Firebase Auth user lookup. The existing Cloud Run Job wrapper path ran once, then the one-time Job was deleted and the temporary IAM role was revoked.

| Item | Result |
| --- | --- |
| Project | `pors-piercing-pos` |
| Runtime principal | `serviceAccount:noblesse-production-runtime@pors-piercing-pos.iam.gserviceaccount.com` |
| Firebase Auth Viewer before | Absent |
| Temporary role granted | `roles/firebaseauth.viewer` |
| Other IAM roles changed | No |
| Recovery Job | `noblesse-owner-admin-profile-recovery-n74p4b-retry2` |
| Execution ID | `noblesse-owner-admin-profile-recovery-n74p4b-retry2-q2mtz` |
| Execution result | Succeeded, exit 0 |
| Target owner account | Identified from approved recovery path, redacted |
| Job deleted | Yes |
| Temporary role revoked | Yes |
| Firebase Auth Viewer after cleanup | Absent |

The recovery path remained the existing `backend/src/scripts/recoverOwnerAdminAccount.js` flow through the audited owner recovery service. No password, token, cookie, Firebase UID, database URL, SQL parameter, Secret value, or private email was recorded.

### Team Access Verification

The production browser session rendered `/kr/admin/team` after recovery. The admin shell, owner/equivalent role text, team table, and permission override UI rendered with zero captured console errors and no horizontal overflow.

The live page did not expose a visible `prices.write` override control during this retry because the observed admin rows were owner rows and owner overrides are protected by the existing UI. Source inspection still confirms `prices.write` exists in the frontend delegable permission catalog and backend admin permission matrix, but the live control visibility requirement was not satisfied without making an out-of-scope admin mutation.

Decision: `STOPPED_PRICES_WRITE_CONTROL_MISSING_AFTER_OWNER_RECOVERY`

| Check | Result |
| --- | --- |
| `/kr/admin/team` rendered | Yes |
| Admin shell rendered | Yes |
| Current user role owner/equivalent | Yes |
| Team table rendered | Yes |
| Permission override UI rendered | Yes |
| `prices.write` visible in live control | No |
| `prices.write` present in source permission catalog | Yes |
| Console errors | 0 |
| Horizontal overflow | No |

### Public Safety Checks

The seed product remained unchanged and the hidden canary stayed hidden after recovery.

| Check | Result |
| --- | --- |
| Seed product API status | 200 |
| Seed product SHA-256 | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Hidden canary detail route | 404 |
| Product list contains hidden canary | No |
| `prices.write` granted | No |
| Canary price retry | No |
| Product mutation | No |
| Buyer mutation | No |
| Inquiry mutation | No |
| Order/payment mutation | No |
| FX Job execution | No |
| Scheduler change | No |
| Direct SQL or DB console | No |
| Secret value access | No |
| Backend deploy | No |
| Firebase Hosting deploy | No |

### Next Gate

`N74P5-GRANT-PRICES-WRITE-AND-CANARY-PRICE-RETRY` remains blocked until a visible owner-governed `prices.write` grant path is available for a non-owner target account or another approved, audited path is provided. Do not retry the hidden canary price save before that gate succeeds.

## N74P4B Current-Main-2 Recheck

Date: 2026-07-09

The current `origin/main` baseline is `7c3b296d65afee53e906840a4a5f02a648f66da0`. The working tree had no tracked or staged diff; only allowed untracked folders were present. Recent commits since the previous recovery run were docs-only owner recovery records in this file, `docs/OPS_INDEX.md`, and `docs/ROADMAP_B2B_SHOPPING_MALL.md`.

Because the approved owner recovery had already completed and was recorded in the current baseline, this recheck did not repeat the temporary IAM grant or rerun the recovery Job. Read-only Cloud inspection confirmed the production runtime service account currently retains only `roles/cloudsql.client`; `roles/firebaseauth.viewer` is absent after cleanup, and the retry-2 one-time recovery Job is absent.

The live `/kr/admin/team` page still renders the admin shell, owner/equivalent role text, team table, and role edit controls with zero captured console logs and no horizontal overflow. The live `prices.write` control is still not visible because the observed rows are owner rows and owner overrides are protected.

Decision: `STOPPED_PRICES_WRITE_CONTROL_MISSING_AFTER_OWNER_RECOVERY`

| Check | Result |
| --- | --- |
| Current HEAD | `7c3b296d65afee53e906840a4a5f02a648f66da0` |
| HEAD equals `origin/main` | Yes |
| Tracked or staged diff | No |
| Recent unexpected code/auth/IAM/backend/runtime changes | No |
| Temporary IAM grant repeated | No |
| Recovery Job rerun | No |
| Firebase Auth Viewer after cleanup | Absent |
| `/kr/admin/team` rendered | Yes |
| Team table rendered | Yes |
| Permission override UI rendered | Yes |
| `prices.write` visible in live control | No |
| Console logs | 0 |
| Horizontal overflow | No |
| Seed product API status | 200 |
| Seed product SHA-256 | `58f6f661afab553f381d6232f92cdc8da83928858ff1a2fe6d96b9106069c9db` |
| Hidden canary detail route | 404 |
| Product list contains hidden canary | No |
| `prices.write` granted | No |
| Canary price retry | No |
| Product, buyer, inquiry, order/payment, FX, scheduler mutation | No |
| Direct SQL, DB console, Secret value access, backend deploy, Firebase deploy | No |

Next gate remains `N74P5-GRANT-PRICES-WRITE-AND-CANARY-PRICE-RETRY`.
