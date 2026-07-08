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
