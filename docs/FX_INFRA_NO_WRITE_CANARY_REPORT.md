# FX Infra and No-write Canary Report

## Status

STOPPED_SECRET_VERSION_2_REQUIRED

N45 prepared the no-write provider canary code path and the first production FX infrastructure pieces. N46 found secret version 1 enabled, created the no-write Cloud Run Job, and executed it exactly once. The canary reached the provider path but failed with a sanitized authentication category and HTTP 403. No second execution was attempted.

N47 checked for a corrected secret version 2 before changing the Job. Secret version 2 was not found, so the Job binding was not updated and the canary was not re-executed.

## Baseline

- Branch: `codex/member-catalog-v1`
- Starting HEAD: `eb5e632c02e3a444e8113f8ac4b06a5834100d45`
- Code commit for no-write canary: `b18bdf5032367c2c17d0223d8649b786357b620f`
- N46 result documentation: this report update
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
- Secret version: `1`
- Secret version state: `ENABLED`
- Secret version 2: Not found
- Secret IAM: secret-level `roles/secretmanager.secretAccessor` for the FX runtime service account only
- Project-level role grant for FX runtime service account: none observed

## Cloud Run Job

- Job name: `noblesse-fx-provider-check-prod`
- Image: `asia-northeast3-docker.pkg.dev/pors-piercing-pos/cloud-run-source-deploy/noblesse-fx-provider-check@sha256:ac9e55ac6f3384c1ddb9ff2700d9786f60298546d543c742f999c980a55517de`
- Command: `npm`
- Args: `run`, `fx:provider-check`
- Secret env: `EXCHANGE_RATE_API_KEY`
- Secret binding: `noblesse-production-exchange-rate-api-key:1`
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
- DB client initialized: No evidence in code path or logs
- DB connection attempted: No evidence in code path or logs
- DB query: No evidence in code path or logs
- DB transaction: No evidence in code path or logs
- Rate snapshot write: No
- Idempotency write: No
- Product mutation: No
- Price mutation: No

## Operator Handoff

Use ExchangeRate-API and Google Cloud Console only. Do not paste the API key into chat, terminal, files, screenshots, or Git.

1. Confirm the provider account and key are active.
2. Confirm the selected plan supports Bearer authorization.
3. If the key must be corrected, add a new numeric secret version through Google Cloud Console.
4. Confirm only that version `2` exists and is enabled.
5. Do not disable or destroy version 1 until a replacement version is validated.
6. Do not report the key value, prefix, suffix, or hash.

## Next Gate

```text
APPROVE_FX_PROVIDER_AUTH_RECOVERY = YES
```

After this gate, the next step may retry the same recovery flow only after secret version 2 exists and is enabled. The rerun must remain a one-time no-write canary.
