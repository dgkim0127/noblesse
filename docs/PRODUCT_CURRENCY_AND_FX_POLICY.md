# Product Currency And FX Policy

## Decision

Noblesse product prices are explicit per-market price books. Published buyer-facing prices are stored per market and currency; they are not calculated from a live exchange rate at request time.

Supported markets and currencies:

- KR / KRW
- JP / JPY
- US / USD
- CN / CNY
- GLOBAL / USD

KR / KRW is the source price for automatic foreign price policies. GLOBAL / USD remains manual only.

## Buyer Price Selection

Approved buyers can see only the exact price for their assigned market and currency.

Rules:

- KR buyer: KR / KRW only
- JP buyer: JP / JPY only
- US buyer: US / USD only
- CN buyer: CN / CNY only
- GLOBAL buyer: GLOBAL / USD only
- Missing exact price: unavailable
- Cross-market or same-currency fallback: prohibited
- Guest, pending, rejected, suspended, and blocked users: no protected price API access
- Admin users must use admin price APIs, not buyer price APIs

Locale is display guidance only. It must not select a protected buyer price.

## Money Integrity

Currency minor units:

- KRW: 0 decimals
- JPY: 0 decimals
- USD: 2 decimals
- CNY: 2 decimals

Discounts, subtotals, and totals use minor-unit helpers. Scientific notation and unsafe money strings are rejected.

## FX Price Modes

`manual_fixed`:

- Used when an admin directly enters a foreign market price.
- FX changes never overwrite the published amount.
- Latest reference values may still be shown for operator awareness.

`fx_auto`:

- Used for JP / JPY, US / USD, and CN / CNY when the foreign price is left empty or explicitly switched to automatic mode.
- Uses the KR / KRW source price and the latest fresh KRW-per-unit rate snapshot.
- Creates or updates the stored foreign price without an approval draft when policy gates pass.

Manual-only markets:

- KR / KRW
- GLOBAL / USD

## Automatic Rules

Rates use canonical `KRW_PER_UNIT`:

- 1 KRW = 1 KRW
- 1 JPY = KRW per one JPY
- 1 USD = KRW per one USD
- 1 CNY = KRW per one CNY

Reference price:

```text
target_reference = source_krw_amount / current_krw_per_unit
```

Automatic update rules:

- Difference below 5%: keep the current published price and mark `held_deadband`.
- Difference at or above 5%: update automatically when rate movement is below 15%.
- Rate movement at or above 15%: block automatic update and mark `blocked_spike`.
- `source_effective_at` older than 72 hours: block automatic update and mark `blocked_stale`.
- KR / KRW source price changes bypass the 5% deadband, but still respect stale-rate and spike protection.

## Inquiry And Quote Snapshots

Historic inquiries and quotes keep the original market, currency, unit amount, subtotal, and total snapshots. FX changes and product price updates do not recalculate existing inquiry or quote records.

## Current Go / No-Go

- Four-currency storefront binding: Go
- Automatic FX pricing code and migration draft: Go
- Admin automatic FX monitoring UI: Go
- Staging migration execution: No-Go
- Live FX provider fetch: No-Go
- Cloud Run Job deploy/execute: No-Go
- Cloud Scheduler creation: No-Go
- Firebase deploy: No-Go
- Production price mutation: No-Go
