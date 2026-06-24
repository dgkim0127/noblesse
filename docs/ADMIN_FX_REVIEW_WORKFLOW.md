# Admin FX Review Workflow

## Scope

This document defines the managed foreign exchange review workflow for Noblesse admin operations.

The workflow is approval-only. Rate collection and review runs can create reference snapshots and price drafts, but they must not publish prices without an admin approval transaction.

## API Surface

Admin routes:

- `GET /api/admin/fx/status`
- `GET /api/admin/fx/rates`
- `GET /api/admin/fx/review-runs`
- `GET /api/admin/fx/drafts`
- `POST /api/admin/fx/rates/import`
- `POST /api/admin/fx/review-runs`
- `POST /api/admin/fx/drafts/:draftId/approve`
- `POST /api/admin/fx/drafts/:draftId/reject`
- `POST /api/admin/fx/prices/:priceId/enable`
- `POST /api/admin/fx/prices/:priceId/disable`

Permissions:

- Read routes: `prices.read`
- Import, review, approve, reject, enable, disable: `prices.write`

## Admin UI

Routes:

- `/admin/fx`
- `/kr/admin/fx`
- `/en/admin/fx`
- `/jp/admin/fx`
- `/cn/admin/fx`

The page shows current rates, stale state, review policy, draft status, and approve/reject actions. It is localized through the existing admin copy dictionary.

## Approval Transaction

Approving a draft must:

1. Lock the draft.
2. Require `status = pending`.
3. Lock the target product price.
4. Verify the source price was not changed after draft creation.
5. Apply the proposed amount.
6. Refresh FX anchor metadata.
7. Mark the draft approved.
8. Insert an audit log.
9. Commit.

Any failure rolls back and leaves the product price unchanged.

Rejecting a draft records a reason and audit log only. It never changes `product_prices`.

## No-Go Until Separate Approval

- Staging/prod migration execution
- External provider network fetch
- Cloud Run Job deployment or execution
- Cloud Scheduler creation
- Product price mutation outside approved draft transaction
- Secret or IAM changes
