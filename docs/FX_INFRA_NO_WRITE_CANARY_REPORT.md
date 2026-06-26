# FX Infra and No-write Canary Report

## Status

STOPPED_SECRET_VERSION_REQUIRED

N45 prepared the no-write provider canary code path and the first production FX infrastructure pieces. The actual ExchangeRate-API key was not available in the Codex runtime and must not be passed through chat, terminal output, files, or Git. The Cloud Run Job was not created and the provider canary was not executed.

## Baseline

- Branch: `codex/member-catalog-v1`
- Starting HEAD: `eb5e632c02e3a444e8113f8ac4b06a5834100d45`
- Code commit for no-write canary: `b18bdf5032367c2c17d0223d8649b786357b620f`
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
- Secret versions: none yet
- Secret IAM: secret-level `roles/secretmanager.secretAccessor` for the FX runtime service account only
- Project-level role grant for FX runtime service account: none observed

## Image

- Image tag: `asia-northeast3-docker.pkg.dev/pors-piercing-pos/cloud-run-source-deploy/noblesse-fx-provider-check:b18bdf5032367c2c17d0223d8649b786357b620f`
- Image digest: `sha256:ac9e55ac6f3384c1ddb9ff2700d9786f60298546d543c742f999c980a55517de`
- Build ID: `aab8e6e0-0ae9-4fe0-aad1-a456b9bdf472`
- Secret used during build: No

## Not Done

- Provider account creation by Codex: No
- API key seen by Codex: No
- Secret version added: No
- Cloud Run FX Job created: No
- Cloud Scheduler created or enabled: No
- Provider network canary executed: No
- DB connection: No
- DB write: No
- Rate snapshot write: No
- Product or price mutation: No

## Operator Handoff

Use Google Cloud Console only. Do not paste the API key into chat, terminal, files, screenshots, or Git.

1. Open Secret Manager in project `pors-piercing-pos`.
2. Open secret `noblesse-production-exchange-rate-api-key`.
3. Add a new secret version with the ExchangeRate-API key.
4. Leave the new version enabled.
5. Do not view or copy the secret value back out.
6. Report only that version `1` exists and is enabled.

## Next Gate

```text
APPROVE_FX_NO_WRITE_CANARY_CONTINUE = YES
```

After this gate, the next step may create `noblesse-production-fx-provider-check` with `EXCHANGE_RATE_API_KEY` pinned to numeric secret version `1` and execute the Job exactly once.
