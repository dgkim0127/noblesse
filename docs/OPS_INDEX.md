# Noblesse Operations Index

Date: 2026-07-08

This index points operators and implementers to the current site map, QA evidence, and roadmap.

## Current Baseline

| Item | Value |
| --- | --- |
| Active repository | `D:\noblesse-main-work` |
| Branch | `main` |
| Baseline HEAD | `81c5d80f0a2daf0dc9bf091b46e107d4b89ec1d3` |
| Production URL | `https://noblesse.web.app` |
| Canonical Taiwan route | `zh-TW` |

## Core Documents

| Document | Purpose |
| --- | --- |
| `docs/SITE_OPERATIONS_MAP.md` | Route, API, admin, home, and data model map |
| `docs/QA_SITE_WIDE_AUDIT.md` | Read-only browser and API QA evidence |
| `docs/N74_CATALOG_EDITOR_SAVE_LOAD_CANARY.md` | Controlled admin catalog editor save/load canary evidence |
| `docs/ROADMAP_B2B_SHOPPING_MALL.md` | Staged roadmap for B2B catalog operations |
| `docs/OPS_INDEX.md` | Entry point for operations docs |

## Operator Quick Map

| Need | Where to start |
| --- | --- |
| Check public route health | `docs/QA_SITE_WIDE_AUDIT.md` |
| Understand route ownership | `docs/SITE_OPERATIONS_MAP.md` |
| Plan next admin feature | `docs/ROADMAP_B2B_SHOPPING_MALL.md` |
| Confirm B2B terminology | `docs/SITE_OPERATIONS_MAP.md` |
| Work on product attributes | Next task `N74-CATALOG-ATTRIBUTE-DETAIL-EDITOR-REWORK` |
| Check catalog editor save/load status | `docs/N74_CATALOG_EDITOR_SAVE_LOAD_CANARY.md` |

## Production Read-Only Smoke

| Check | Expected |
| --- | --- |
| Home | 200 and renders |
| Product list | 200 and renders |
| Seed product detail | 200 and renders |
| Missing product | Not-found state |
| Health API | 200 |
| Catalog API | 200 |
| Buyer/Admin profile without auth | 401 |

## No-Mutation Confirmation

This index was produced from read-only route, source, and API inspection.

No production deploy, runtime config change, data mutation, manual FX execution, or database migration is part of this documentation task.

N74 save/load canary note: one hidden canary product save was attempted through the production admin editor. Product and image steps completed, price save stopped on missing admin permission. Existing public product data remained unchanged.

N74P price permission recovery note: the exact missing permission is `prices.write` on the product price-book save route. It is delegable through the existing owner-governed admin permission override path, but no permission was changed in the current run because the owner governance UI/session could not be safely confirmed before mutation.

N74P2 owner governance session note: the active production admin session reached `/kr/admin/team` but rendered the additional-permission fallback instead of team management controls. No `prices.write` override or canary price retry was performed. Public checks still show the hidden canary absent from product detail and list routes.

N74P3 owner team access diagnosis: `/admin/team` is guarded by `admins.read`, and governance changes require owner plus `admins.manage`. The active production admin shell rendered the intended account as operator and did not render the team table or owner controls. No permission, product, IAM, Secret, DB, deploy, or canary mutation was performed. Next safe gate is owner/admin profile recovery before retrying the narrow `prices.write` grant.

N74P4 owner admin profile recovery preflight: the existing safe owner recovery script was found, but execution was stopped before Job creation because the production runtime service account does not currently have Firebase Auth Viewer for the required Firebase user lookup. No IAM, Secret, DB, deploy, product, permission, or canary mutation was performed. Next safe gate is a temporary Firebase Auth Viewer IAM fix for the owner recovery only.

N74P4B owner recovery IAM fix: `roles/firebaseauth.viewer` was temporarily granted only to the production runtime service account, the existing owner recovery Job ran once and completed, the one-time Job was deleted, and the temporary IAM role was revoked. `/kr/admin/team` now renders the team/governance page, but `prices.write` was not granted and the canary price retry was not performed. Public seed product hash remained unchanged and the hidden canary remains absent from public routes.

N74P4B retry-2 owner recovery IAM fix: baseline `0fcbe7d` was verified after a docs-only change from `e06e0ba`. The temporary `roles/firebaseauth.viewer` grant was applied only to the production runtime service account, the existing owner recovery Job completed, the one-time Job was deleted, and the temporary IAM role was revoked. `/kr/admin/team` renders with owner/team access, but the live `prices.write` override control was not visible because observed rows were owner rows. No `prices.write` grant, canary retry, product, buyer, inquiry, order/payment, FX, scheduler, Secret, SQL, DB console, backend deploy, or Firebase deploy occurred. Current blocker: `STOPPED_PRICES_WRITE_CONTROL_MISSING_AFTER_OWNER_RECOVERY`.

N74P4B current-main-2 recheck: current `origin/main` is `7c3b296d65afee53e906840a4a5f02a648f66da0`; recent changes were docs-only, so the already-completed owner recovery was not rerun. Read-only Cloud inspection confirmed the temporary Firebase Auth Viewer role remains revoked and the one-time recovery Job is absent. `/kr/admin/team` still renders owner/team access, but `prices.write` is still not visible in the live owner rows. No IAM, Job, product, buyer, inquiry, order/payment, FX, scheduler, Secret, SQL, DB console, backend deploy, or Firebase deploy mutation occurred.
