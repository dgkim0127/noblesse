# Product Currency And FX Policy

## Decision

Noblesse product prices are explicit per-market price books. Published operating prices are not calculated from a live exchange rate at request time.

Supported Phase N39-A markets:

- KR / KRW
- JP / JPY
- US / USD
- CN / CNY
- GLOBAL / USD

## Accounting

The recommended base accounting currency is KRW. This is an internal reference and does not replace published buyer-facing price books.

## Published Prices

Published prices must be stored as explicit amounts for each supported market and currency pair. A missing exact price must be treated as unavailable. The system must not fall back to another market or currency amount.

Authenticated buyer selection order:

1. Buyer currency exact price
2. Buyer assigned market exact price
3. Price unavailable

Guest locale defaults are display guidance only:

- kr -> KRW
- jp -> JPY
- en -> USD
- cn -> CNY

## FX Rates

FX rates are reference-only in this phase.

- Automatic daily repricing: No-Go
- Conversion result: draft only
- Admin approval required before any published price changes
- Rate source and effective timestamp should be stored later

N39-B may introduce an `fx_rate_snapshots` design with:

- `base_currency`
- `quote_currency`
- `rate`
- `source`
- `effective_at`
- `fetched_at`

N39-A does not create this table or any FX API.

## Inquiry And Quote Snapshots

Historic inquiries and quotes keep the original currency and amount snapshot. Quote currency changes must not automatically recalculate existing confirmed prices or subtotals. CNY is allowed only as an explicit stored currency.
