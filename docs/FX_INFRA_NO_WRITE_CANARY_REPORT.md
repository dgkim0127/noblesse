# FX Infra and No-write Canary Report

## Status

FX_INFRA_PROVISIONED_CANARY_PASSED_NO_WRITE

N45 prepared the no-write provider canary code path and the first production FX infrastructure pieces. N46 found secret version 1 enabled, created the no-write Cloud Run Job, and executed it exactly once. The canary reached the provider path but failed with a sanitized authentication category and HTTP 403. No second execution was attempted.

N47 checked for a corrected secret version 2 before changing the Job. Secret version 2 was not found, so the Job binding was not updated and the canary was not re-executed.

N47B confirmed secret version 2 is enabled, updated only the existing Job secret binding from version 1 to version 2, and executed the no-write provider canary exactly once. The execution completed successfully with one provider request and no DB, snapshot, product, price, or Scheduler write path.

## Baseline

- Branch: `codex/member-catalog-v1`
- Starting HEAD: `eb5e632c02e3a444e8113f8ac4b06a5834100d45`
- Code commit for no-write canary: `b18bdf5032367c2c17d0223d8649b786357b620f`
- N46 result documentation: this report update
- N47B result documentation: this report update
- Allowed untracked paths observed: `.firebase/`, `.prod-webapp-snapshot/`

## Prepared Code Path

- Script: `backend/src/scripts/checkFxProvider.js`
- Package script: `npm run fx:provider-check`
- Provider: `exchange_rate_api`
- Base currency: `KRW`
- Required currencies: `KRW`, `JPY`, `USD`, `CNY`
- DB client initialization: No
- DB query or transaction path: No
- Rate snapshot write path: No
- Price mutation path: No

## Cloud Resources

- Project: `pors-piercing-pos`
- Region: `asia-northeast3`
- Artifact Registry repository: `cloud-run-source-deploy`
- Runtime service account: `noblesse-fx-job-prod@pors-piercing-pos.iam.gserviceaccount.com`
- User-managed service account keys: 0
- Secret: `noblesse-production-exchange-rate-api-key`
- Secret labels:
  - `app=noblesse`
  - `env=production`
  - `purpose=fx-provider-api-key`
  - `provider=exchange-rate-api`
- Secret version 1 final state: `DISABLED`
- Secret version 2 final state: `ENABLED`
- Secret IAM: secret-level `roles/secretmanager.secretAccessor` for the FX runtime service account only
- Project-level role grant for FX runtime service account: none observed

## Cloud Run Job

- Job name: `noblesse-fx-provider-check-prod`
- Image: `asia-northeast3-docker.pkg.dev/pors-piercing-pos/cloud-run-source-deploy/noblesse-fx-provider-check@sha256:ac9e55ac6f3384c1ddb9ff2700d9786f60298546d543c742f999c980a55517de`
- Command: `npm`
- Args: `run`, `fx:provider-check`
- Secret env: `EXCHANGE_RATE_API_KEY`
- Secret binding: `noblesse-production-exchange-rate-api-key:2`
- Tasks: 1
- Parallelism: 1
- Max retries: 0
- Timeout: 120 seconds
- DB secret attached: No
- Scheduler attached: No

## Image

- Image tag: `asia-northeast3-docker.pkg.dev/pors-piercing-pos/cloud-run-source-deploy/noblesse-fx-provider-check:b18bdf5032367c2c17d0223d8649b786357b620f`
- Image digest: `sha256:ac9e55ac6f3384c1ddb9ff2700d9786f60298546d543c742f999c980a55517de`
- Build ID: `aab8e6e0-0ae9-4fe0-aad1-a456b9bdf472`
- Secret used during build: No

## Canary Execution

- Execution ID: `noblesse-fx-provider-check-prod-97447`
- Execution count: 1
- Exit status: failed
- Provider: `exchange_rate_api`
- Base: expected `KRW`
- Required currencies: `KRW`, `JPY`, `USD`, `CNY`
- Sanitized error category: `authentication`
- Sanitized HTTP status code: 403
- Credential leakage: No
- Authorization header leakage: No
- Raw provider payload logged: No
- Full rate bundle logged: No

## N47B Successful Canary

- Execution ID: `noblesse-fx-provider-check-prod-dcgfg`
- Execution count in gate: 1
- Exit status: succeeded
- Provider: `exchange_rate_api`
- Base: `KRW`
- Required currencies: `KRW`, `JPY`, `USD`, `CNY`
- Present currencies: `KRW`, `JPY`, `USD`, `CNY`
- Source effective at: `2026-06-26T00:00:01.000Z`
- Fetched at: `2026-06-26T03:17:45.702Z`
- Timestamp validation: passed
- Completeness validation: passed
- Supported currency validation: passed
- Rate direction validation: passed
- Provider request count: 1
- Credential leakage: No
- Authorization header leakage: No
- Raw provider payload logged: No
- Full rate bundle logged: No

## N47 Attempt

- Baseline HEAD: `e75d6079aa21f1e3586f5948875dc0096cc7245c`
- Secret version 2 metadata: Not found
- Job update: No
- New execution: No
- Secret payload accessed: No
- Secret value exposed: No
- DB write: No
- Scheduler change: No

## No-write Verification

- Provider account creation by Codex: No
- API key seen by Codex: No
- Secret payload accessed: No
- Cloud Scheduler created or enabled: No
- DB client initialized: No
- DB connection attempted: No evidence in Job config, code path, or logs
- DB query: No
- DB transaction: No evidence in Job config, code path, or logs
- Rate snapshot write: No
- Idempotency write: No
- Product mutation: No
- Price mutation: No

## Operator Handoff

Provider authentication recovery is complete. The Job remains pinned to numeric secret version `2`. Secret version `1` is disabled and was not destroyed. Do not paste the API key into chat, terminal, files, screenshots, or Git.

## Next Gate

```text
APPROVE_FX_PRODUCTION_ACTIVATION = YES
```

After this gate, the next step may activate the production FX fetch/evaluate workflow. Scheduler creation, DB snapshot writes, and price mutations remain blocked until that separate activation gate.

## N48 Taiwan Market Activation Preparation

- Active required currencies changed to `KRW`, `JPY`, `USD`, and `TWD`.
- `CN` / `CNY` remains historical read-only and is deprecated for new writes.
- The previous N47B canary result remains evidence for provider authentication recovery only; a TWD no-write canary is required before production snapshot or price writes.
- Secret payload access: No.
- Scheduler change in preparation phase: No.
- DB write in preparation phase: No.
