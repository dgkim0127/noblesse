# ADR-0040: FX Provider Selection

## Status

Accepted for adapter implementation planning. Runtime provider fetch, credentials, Secret Manager changes, scheduler changes, Cloud Run Job deploy/execution, migrations, DB access, and price mutation remain blocked until separate approval.

## Context

Noblesse automatic FX pricing stores published buyer prices per market and currency. Buyer-facing pages never calculate live exchange rates. The automatic FX workflow needs a server-side provider for a complete KRW, JPY, USD, and CNY rate snapshot. The current internal contract stores canonical `KRW_PER_UNIT` rates with:

- one complete same-provider bundle for `KRW`, `JPY`, `USD`, and `CNY`
- explicit `source_effective_at`
- server-generated `fetched_at`
- canonical `payload_hash`
- 72h stale protection
- 5 minute future timestamp skew protection
- source-aware idempotency for rate snapshots, base price changes, and mode changes
- repeatable manual rechecks

This ADR selects the provider only. It does not implement an adapter and does not call a live provider API.

## Hard Requirements

| Requirement | Result |
| --- | --- |
| KRW, JPY, USD, CNY coverage | Required |
| Deterministic base/quote conversion | Required |
| Official source/publication timestamp | Required |
| Completeness and numeric validation | Required |
| Commercial production use | Required |
| Rate limit and predictable operating cost | Required |
| Server-side secret management | Required |
| Status/SLA or operational health signal | Required |
| Stable endpoint and documented errors | Required |

## Candidates

| Provider | Hard-requirement result | Notes |
| --- | --- | --- |
| ExchangeRate-API | PASS | Provides standard pair/latest API, `time_last_update_unix`, `time_next_update_unix`, supported currencies including KRW/JPY/USD/CNY, documented auth including Bearer, paid commercial plans, and quota metadata. |
| Open Exchange Rates | PASS with operational caveat | Strong docs, status page, timestamped latest/historical payloads, and broad currency coverage. API key is commonly passed as `app_id` query parameter, which creates higher log-redaction risk than Bearer auth. |
| Currencylayer | CONDITIONAL | Official docs expose live quotes, timestamp, source currency, and paid plans. It commonly uses access key URL/query authentication and source-switching is plan-dependent, so it is less attractive for the current secret-handling requirement. |
| Fixer / Exchangerates API | CONDITIONAL | Official docs expose timestamped EUR/base rates and symbols, but KRW base/source support and higher-refresh operating needs are plan-dependent. URL key handling and provider/package overlap are less clean for the first production adapter. |
| OANDA Exchange Rates API | CONDITIONAL | Operationally mature commercial provider, but public documentation available without account context was insufficient to map exact payload fields, timestamp semantics, quota, and costs for this gate. |

## Evidence Matrix

Verified on 2026-06-25 using official provider documentation only. No live FX API request was made.

| Provider | Official evidence URLs | Currency coverage | Timestamp semantics | Commercial/plan evidence | Auth and operations | Result |
| --- | --- | --- | --- | --- | --- | --- |
| ExchangeRate-API | `https://www.exchangerate-api.com/docs/standard-requests`, `https://www.exchangerate-api.com/docs/supported-currencies`, `https://www.exchangerate-api.com/docs/authentication`, `https://www.exchangerate-api.com/pricing`, `https://www.exchangerate-api.com/product/uptime`, `https://www.exchangerate-api.com/terms` | Official supported-currency docs list the currency table used by the API; KRW, JPY, USD, and CNY are supported. | Standard request responses document update fields including Unix/UTC update times and next update times. | Pricing page documents plan tiers and request allowances. Terms cover service use. | Authentication docs support Bearer authorization, which lets the adapter avoid putting the API key in URL query logs. Official uptime documentation describes provider monitoring/status history. | PASS |
| Open Exchange Rates | `https://docs.openexchangerates.org/reference/latest-json`, `https://docs.openexchangerates.org/reference/historical-json`, `https://openexchangerates.org/currencies.json`, `https://openexchangerates.org/signup`, `https://status.openexchangerates.org/`, `https://openexchangerates.org/license` | Official currency list includes KRW, JPY, USD, and CNY. | Latest/historical API docs expose timestamped snapshots. | Signup/pricing and license pages define paid use. | Status page exists; auth is app id based and must be strongly redacted from URL logs. | PASS with caveat |
| Currencylayer | `https://currencylayer.com/documentation`, `https://currencylayer.com/pricing`, `https://currencylayer.com/terms` | Official docs describe supported currency list and quote codes. | Live endpoint docs expose `timestamp`, `source`, and `quotes`. | Pricing/terms pages define paid use. | Query-string access key handling and plan-dependent source currency reduce fit. | CONDITIONAL |
| Fixer / Exchangerates API | `https://exchangeratesapi.io/documentation/`, `https://exchangeratesapi.io/pricing/`, `https://exchangeratesapi.io/terms/` | Official docs expose symbols and base/latest endpoints. | Latest endpoint docs expose timestamped responses. | Pricing/terms pages define plan access. | Base switching, refresh rate, and URL key handling require stricter plan review. | CONDITIONAL |
| OANDA Exchange Rates API | `https://exchange-rates-api.oanda.com/` | Commercial FX API is offered, but exact no-login currency/schema mapping was not fully verifiable for this gate. | UNKNOWN from public docs available in this review. | UNKNOWN exact price basis from public docs available in this review. | Likely enterprise-grade, but contract mapping evidence is insufficient without account docs. | CONDITIONAL |

## Decision

Select `ExchangeRate-API` as the primary FX provider for the first Noblesse production adapter, using a paid plan that provides hourly or better update cadence and enough monthly quota for scheduled jobs and manual rechecks.

Provider identifier:

```text
exchangerate-api
```

Required plan/tier:

```text
ExchangeRate-API Pro or equivalent paid tier with hourly updates and quota comfortably above the planned job volume.
```

## Why This Is The Best Fit

- It supports the four required currencies.
- Its standard request contract includes explicit update timestamps rather than requiring Noblesse to treat HTTP fetch time as the source publication time.
- It supports Bearer authorization, which is cleaner for Cloud Run server-side secret handling and redaction than URL query-only key transport.
- It can be queried with `KRW` as the base currency, then mapped deterministically into Noblesse's canonical `KRW_PER_UNIT` snapshot.
- Its expected operating volume is tiny relative to paid plan limits.

Expected request volume:

```text
Current schedule draft: weekdays 09:10, 13:10, and 17:10 Asia/Seoul.
Expected scheduled requests: about 66 per month.
Recommended planning allowance: 200-500 requests per month including manual rechecks, retries, and smoke diagnostics.
```

## Rejected Alternatives

Open Exchange Rates is a viable fallback. It has broad coverage, official documentation, and a status page. It is not the first choice because its common `app_id` authentication model increases URL/query redaction risk compared with ExchangeRate-API Bearer auth.

Currencylayer and Fixer/Exchangerates API are not rejected permanently, but they remain conditional because source/base support, refresh cadence, and URL key handling depend more heavily on plan details.

OANDA remains an enterprise fallback, but the no-account public evidence available during this gate was not enough to complete the current contract mapping.

## Contract Mapping

Selected endpoint:

```text
GET https://v6.exchangerate-api.com/v6/latest/KRW
Authorization: Bearer <server-side secret>
```

The adapter must not put the API key in frontend code, docs, logs, query strings, or committed files.

Mapping:

| Internal field | Provider field or rule |
| --- | --- |
| `provider` | `exchangerate-api` |
| `baseCurrency` | Internal normalized value: `KRW` |
| required quote currencies | `KRW`, `JPY`, `USD`, `CNY` |
| provider base currency | `base_code` must equal `KRW` |
| `sourceEffectiveAt` | Convert `time_last_update_unix` to ISO. If needed for audit display, retain `time_last_update_utc` as provider metadata. |
| `fetchedAt` | Server receive time after successful HTTPS response. Must be greater than or equal to `sourceEffectiveAt`. |
| freshness | `now - sourceEffectiveAt <= 72h` |
| future skew | `sourceEffectiveAt` and `fetchedAt` must not exceed server time by more than 5 minutes. |
| completeness | `result` success, `base_code` KRW, `conversion_rates.KRW`, `.JPY`, `.USD`, `.CNY` all present and finite. |
| numeric parsing | Reject null, missing, string-nonnumeric, zero, negative, NaN, and infinite values. |
| KRW rate | `KRW_PER_UNIT(KRW) = 1` |
| JPY/USD/CNY rate | Provider gives target units per 1 KRW; Noblesse stores KRW per 1 target unit, so `KRW_PER_UNIT(currency) = 1 / conversion_rates[currency]`. |
| inverse-rate handling | Inversion is required for JPY, USD, and CNY. Reject zero before inversion. |
| intermediate rounding | Do not round before conversion to scaled rate. Use decimal-safe logic in the adapter before handing values to `toRateScaled`. |
| final rounding | Existing FX math and currency minor-unit helpers own final money rounding. |
| payload hash | Canonical hash over provider id, `baseCurrency: KRW`, scaled KRW/JPY/USD/CNY rates, and `sourceEffectiveAt`; never include API keys. |

Error classification:

| Provider or transport condition | Internal category |
| --- | --- |
| Missing/invalid API key or auth failure | `authentication` |
| Quota exhausted, plan limit, rate limit | `quota_or_rate_limit` |
| Network timeout | `timeout` |
| Provider 4xx other than auth/quota | `provider_4xx` |
| Provider 5xx | `provider_5xx` |
| `result` is not success | `provider_error` |
| Missing required fields or malformed JSON | `malformed_payload` |
| Missing required currencies | `incomplete_payload` |
| `sourceEffectiveAt` older than 72h | `stale_payload` |
| Source/fetched timestamp too far in future | `future_timestamp` |

Retry/backoff:

- Retry is allowed for timeout, transient network errors, 429, and 5xx only.
- Do not retry malformed, stale, incomplete, authentication, or validation failures without operator action.
- Backoff should be short and capped because the scheduled volume is low and stale protection is already in place.

Provider-specific values included in idempotency:

- provider id
- `sourceEffectiveAt`
- payload hash
- for base price changes: KR source price version
- for mode changes: product, market, policy version, source price version, and bundle identity

Logs and redaction:

- Never log the API key, Authorization header, full request URL if it contains credentials, raw headers, or provider account identifiers.
- Safe logs may include provider id, source timestamp, fetched timestamp, currencies present, category, HTTP status class, and payload hash prefix.

## Security Considerations

The adapter must run only server-side in the Cloud Run FX rate job. Secret Manager should inject the provider key at runtime after separate approval. Frontend bundles must never contain provider credentials. Documentation must not include placeholder strings that look like real keys.

The recommended auth mode is Bearer header auth. If the implementation later proves that the selected plan only supports key-in-path mode, stop and re-open this ADR before implementation.

## Operational Risks

- Provider update timestamp could lag; stale protection blocks automatic mutation after 72h.
- Provider may return conversion rates in target-per-base form; adapter inversion must be covered by tests.
- API key in URL path or query would create log-redaction risk if Bearer auth is not available for the selected plan.
- Pricing page details can change. Confirm plan quota and update cadence immediately before purchasing or creating credentials.
- No fallback provider should silently fill a bundle. Provider replacement must create a separate snapshot and audit event.

## Cost Assumptions

The current schedule needs about 66 provider requests per month. A small paid tier with hourly update cadence and thousands of monthly requests is enough. Free tiers are not recommended for production because update cadence, SLA, commercial terms, and support are weaker.

## Open Questions

- Confirm the exact paid plan and invoice owner before credential creation.
- Confirm whether Bearer auth is enabled for the chosen plan before adapter implementation.
- Confirm the provider status page or operational incident feed to link from Noblesse runbooks.
- Confirm final retry count and Cloud Scheduler cadence during the deployment gate.

## Rollback / Replacement Strategy

- Disable the FX fetch job without disabling manual price management.
- Keep existing published product prices; do not recalculate buyer-facing prices live.
- Preserve existing `fx_rate_snapshots` and event history.
- Select a replacement provider through a new ADR.
- Implement replacement as a new provider id and new snapshots; do not mix providers into one snapshot bundle.

## Next Approval Gate

```text
APPROVE_FX_PROVIDER_ADAPTER_IMPLEMENTATION = YES
```
