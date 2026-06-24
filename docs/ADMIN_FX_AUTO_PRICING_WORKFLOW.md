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
- Thresholds are fixed server-side. Admin API requests cannot override 500 bps, 1500 bps, or 72h policy values.
- Evaluation uses only a complete same-provider, same-`source_effective_at`, same-`payload_hash` bundle containing KRW, JPY, USD, and CNY.
- `manual_fixed` policies update reference state for operator awareness but never mutate the published price.
- Paused automatic policies expose current reference state but never apply price changes until resumed.

## Data Model

- `fx_rate_snapshots`: canonical KRW-per-unit snapshots.
- `product_price_policies`: market-level pricing mode, source price, published price, reference state, latest observed source baseline, last applied source baseline, status, and pause state.
- `fx_auto_price_runs`: evaluation run summaries with idempotency keys.
- `fx_auto_price_events`: append-only policy and price event history with event keys.

## Concurrency And Idempotency

- Evaluation takes a transaction-scoped advisory lock before scanning policies.
- Run idempotency is keyed by trigger, optional product, provider, source effective time, and payload hash.
- Event idempotency is keyed by policy, action, rate, source baseline, and reference value.
- Existing manual price conflicts are recorded as policy errors; automatic evaluation does not overwrite manual rows.
- Source price observation and source price application are stored separately so reference updates do not look like published price applications.

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
- `PUT /api/admin/products/:productId/price-books`

Permissions:

- Read routes: `prices.read`
- Import, evaluate, mode change, pause, resume, and price-book setup: `prices.write`

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
- Product registration writes KR / KRW as the manual source price and creates JP / JPY, US / USD, and CN / CNY `fx_auto` policies. GLOBAL remains manual only.
- Existing product prices are backfilled as `manual_fixed`; missing JP / JPY, US / USD, and CN / CNY policies are backfilled as pending `fx_auto` where a KR / KRW source exists.

## No-Go Until Separate Approval

- Staging/prod migration execution
- External provider network fetch
- Cloud Run Job deployment or execution
- Cloud Scheduler creation
- Real product price mutation
- Secret or IAM changes
