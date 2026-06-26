# FX Credential Provisioning Preflight

## Status

CREDENTIAL_PROVISIONING_PREFLIGHT_READY

This preflight prepares the next approval gate for the ExchangeRate-API credential. It does not create provider accounts, API keys, Secret Manager secrets, secret versions, IAM bindings, Cloud Run Jobs, Scheduler Jobs, DB connections, or production mutations.

## Baseline

- Branch: `codex/member-catalog-v1`
- HEAD and origin: `7007a49ee299932d518c332a29f0fbc4c7ab97a2`
- Allowed untracked paths observed: `.firebase/`, `.prod-webapp-snapshot/`
- Source changes in this preflight: none

## N43 Follow-up

- Public Chinese locale is `zh-TW`.
- Legacy Chinese locale aliases still canonicalize to `zh-TW`.
- Legacy path migration preserves nested paths, query strings, and hashes.
- At the time of this preflight, CN/CNY pricing behavior was unchanged. N48 supersedes this active market contract with TW/TWD while preserving legacy CN/CNY read compatibility.

Verified example:

```text
/cn/products/NB-001?ref=legacy#details
-> /zh-TW/products/NB-001?ref=legacy#details
```

## Provider Contract Recheck

Provider: ExchangeRate-API

Official sources checked on 2026-06-25:

- `https://www.exchangerate-api.com/`
- `https://www.exchangerate-api.com/docs/standard-requests`
- `https://www.exchangerate-api.com/docs/authentication`
- `https://www.exchangerate-api.com/docs/supported-currencies`
- `https://www.exchangerate-api.com/terms`
- `https://www.exchangerate-api.com/product/uptime`

Contract status:

- Standard endpoint remains v6-compatible for the existing adapter shape.
- Bearer authorization remains documented.
- KRW, JPY, USD, and TWD remain supported for the active Noblesse bundle.
- Response update timestamp fields remain documented.
- Pro plan basis remains suitable for the planned Noblesse request volume.
- Rates remain suitable only for catalog price management, not payment settlement or trading.

## Adapter Audit

Current implementation:

- Provider id: `exchange_rate_api`
- Secret env var: `EXCHANGE_RATE_API_KEY`
- Fixed origin: `https://v6.exchangerate-api.com`
- Fixed path: `/v6/latest/KRW`
- Auth mode: `Authorization: Bearer <server-side secret>`
- Required currencies: KRW, JPY, USD, TWD
- Canonical internal rate: KRW per one quote-currency unit
- Stale protection: 72 hours
- Future timestamp skew protection: 5 minutes
- Transport timeout: 5 seconds

Confirmed protections:

- No URL credential query parameter.
- No provider endpoint override.
- No frontend credential path.
- No live provider request in tests.
- Error categories cover auth, account, quota/rate-limit, timeout, provider 4xx/5xx, malformed payload, incomplete payload, stale payload, and future timestamp.
- Payload hash excludes credentials.

## Cloud Target Read-only Audit

- Project: `pors-piercing-pos`
- Region: `asia-northeast3`
- FX Cloud Run Job: not present
- FX Secret Manager secret: not present
- Cloud Scheduler API: disabled
- Existing production DB secret remains separate from FX credential provisioning.
- Project-level `roles/secretmanager.secretAccessor` binding for FX provisioning was not found.
- Existing production DB secret accessor binding is limited to the production runtime service account.

## Provisioning Plan

Next gated mutation should create a new dedicated Secret Manager secret only:

- Secret name: `noblesse-production-exchange-rate-api-key`
- Replication: automatic
- Labels:
  - `app=noblesse`
  - `env=production`
  - `purpose=fx-provider-api-key`
  - `provider=exchange-rate-api`
- Version: add version 1 only after operator-provided credential input.
- Runtime env var: `EXCHANGE_RATE_API_KEY`
- Runtime binding: pin numeric version 1, do not use `latest` for production.
- Accessor: grant only the future FX rate-fetch runtime principal after the Job identity is explicitly approved.

The next step must not create Scheduler Jobs, execute provider fetches, run DB writes, update product prices, or deploy frontend/backend services unless separately approved.

## Rollback Plan

- Disable the FX fetch job if it exists.
- Disable the provider secret version if credential exposure or account revocation is needed.
- Keep manual fixed prices and existing buyer-facing prices unchanged.
- Do not delete historical rate snapshots or price history without a separate recovery approval.
- Rotate by adding a new numeric secret version and updating only the approved FX job binding.

## Next Gate

```text
APPROVE_FX_CREDENTIAL_SECRET_CREATION = YES
```

## N48 Taiwan Market Addendum

- Active market/currency set changes from `CN` / `CNY` to `TW` / `TWD`.
- Required provider currencies become `KRW`, `JPY`, `USD`, and `TWD`.
- Existing secret container and version metadata remain valid; no secret payload is recorded here.
- Provider free-plan status remains acceptable for the approved weekday once-daily schedule.
- No payment, plan upgrade, Scheduler creation, DB write, or product price mutation is authorized by this addendum alone.
