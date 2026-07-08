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
