# Product Currency And FX Policy

## Decision

Noblesse product prices are explicit per-market price books. Published operating prices are not calculated from a live exchange rate at request time.

Supported markets and currencies:

- KR / KRW
- JP / JPY
- US / USD
- CN / CNY
- GLOBAL / USD

KRW is the internal reference currency for managed FX review. It does not replace published buyer-facing price books.

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

## Managed FX Workflow

FX rates use canonical `KRW_PER_UNIT`:

- 1 KRW = 1 KRW
- 1 JPY = KRW per one JPY
- 1 USD = KRW per one USD
- 1 CNY = KRW per one CNY

Rates are stored as fixed-point `rate_scaled = round(krw_per_unit * 100000000)`.

Operational policy:

- Daily rate snapshot: weekdays 09:10 KST
- Price review: Monday, Wednesday, Friday 10:00 KST
- Threshold: 2% or 200 basis points
- Stale protection: 72 hours
- Automatic product price publication: No
- Admin approval before product price write: Required
- Rejecting a draft never changes product prices

## Draft Rules

Existing foreign price update draft:

```text
proposed_amount = current_published_amount * anchor_krw_per_unit / current_krw_per_unit
```

This preserves the implied KRW value of the published price.

New foreign price draft may be generated from KR / KRW for JP / JPY, US / USD, and CN / CNY. GLOBAL / USD is not auto-created from KRW.

Draft creation is blocked when:

- rate change is below 2%
- current snapshot is older than 72 hours
- a pending draft already exists for the same product, market, and currency
- the source price changed after draft generation
- market/currency pair is invalid

## Inquiry And Quote Snapshots

Historic inquiries and quotes keep the original market, currency, unit amount, subtotal, and total snapshots. FX changes and product price approval do not recalculate existing inquiry or quote records.

## Current Go / No-Go

- Four-currency storefront binding: Go
- Managed FX workflow code and migration draft: Go
- Staging migration execution: No-Go
- Live FX provider fetch: No-Go
- Cloud Run Job deploy/execute: No-Go
- Cloud Scheduler creation: No-Go
- Firebase deploy: No-Go
- Production price mutation: No-Go
