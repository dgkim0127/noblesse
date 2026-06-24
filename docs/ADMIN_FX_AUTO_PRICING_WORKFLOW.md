# Admin FX Auto Pricing Workflow

## Scope

This document defines the current automatic foreign exchange pricing workflow for Noblesse admin operations.

The workflow does not use approval drafts. Admins choose whether each foreign market price is fixed manually or managed automatically by FX policy.

## Price Modes

`manual_fixed`:

- Admin-entered price.
- FX changes never overwrite the published amount.
- Allowed for JP / JPY, US / USD, CN / CNY, and GLOBAL / USD.
- Required for KR / KRW and GLOBAL / USD.

`fx_auto`:

- Allowed only for JP / JPY, US / USD, and CN / CNY.
- Uses the KR / KRW source price.
- Stores a real published foreign price only when a fresh rate bundle exists and safety gates pass.

## Automatic Rules

- Initial creation: create the foreign price from KR / KRW and the latest fresh rate.
- 5% deadband: differences below 500 bps keep the current price and update reference state only.
- 15% circuit breaker: rate movement at or above 1500 bps blocks automatic price changes.
- 72h stale protection: `source_effective_at` older than 72 hours blocks automatic price changes.
- KR source price change: bypasses the 5% deadband but still respects stale-rate and circuit-breaker guards.

## Data Model

- `fx_rate_snapshots`: canonical KRW-per-unit snapshots.
- `product_price_policies`: market-level pricing mode, source price, published price, reference state, status, and pause state.
- `fx_auto_price_runs`: evaluation run summaries.
- `fx_auto_price_events`: append-only policy and price event history.

## API Surface

Admin routes:

- `GET /api/admin/fx/status`
- `GET /api/admin/fx/rates`
- `GET /api/admin/fx/runs`
- `GET /api/admin/fx/prices`
- `GET /api/admin/fx/prices/:policyId/history`
- `POST /api/admin/fx/rates/import`
- `POST /api/admin/fx/evaluate`
- `POST /api/admin/fx/products/:productId/evaluate`
- `PUT /api/admin/fx/products/:productId/markets/:market/mode`
- `POST /api/admin/fx/prices/:policyId/pause`
- `POST /api/admin/fx/prices/:policyId/resume`

Permissions:

- Read routes: `prices.read`
- Import, evaluate, mode change, pause, resume: `prices.write`

Removed routes:

- `GET /api/admin/fx/drafts`
- `POST /api/admin/fx/drafts/:draftId/approve`
- `POST /api/admin/fx/drafts/:draftId/reject`
- `POST /api/admin/fx/review-runs`

## Admin UI

The FX page shows:

- current rates
- policy thresholds
- total automatic policies
- held, updated, pending, stale, spike-blocked, paused, and error counts
- current published price
- latest reference price
- divergence
- latest rate and source time
- last evaluated and last auto update timestamps
- event history
- mode and pause/resume controls

The UI is localized for KR, EN, JP, and CN.

## Integrity

- Money calculations use currency minor units.
- Evaluation is transaction-managed.
- Events are append-only.
- Audit logs record sanitized action metadata.
- Existing inquiries and quotes remain immutable snapshots.
- Evaluator code must not update inquiry or quote tables.

## No-Go Until Separate Approval

- Staging/prod migration execution
- External provider network fetch
- Cloud Run Job deployment or execution
- Cloud Scheduler creation
- Real product price mutation
- Secret or IAM changes
