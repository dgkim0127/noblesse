# Taiwan App Production Release Report

## Scope
- Task: N50-TW-APP-PRODUCTION-RELEASE-1
- Source branch: codex/member-catalog-v1
- Production branch: main
- Release source SHA: a021e6ed7c62eb8e13a5c2fc5ff2bcc7d80b3110
- Production project: pors-piercing-pos

## Release Summary
- Taiwan locale and market release was merged into the canonical production branch.
- Active app markets are KR, JP, US, and TW.
- Active app currencies are KRW, JPY, USD, and TWD.
- Legacy CN/CNY remains historical/read-only compatibility only.

## Validation
- Frontend tests: 104 passed
- Backend tests: 323 passed
- Lint: passed
- Production build: passed
- Dist secret scan: no DB URL, private key, service credential, staging endpoint, test email, or E2E flag found

## Deployment
- Backend service: noblesse-backend
- Backend region: asia-northeast3
- Previous backend revision: noblesse-backend-00006-6z7
- New backend revision: noblesse-backend-00007-lzv
- Backend image digest: sha256:1bbbb6e87cc9b5f0da6c4084f260a60ee4746cea842280321334e2907f4c4bb5
- Firebase Hosting target: noblesse
- Hosting URL: https://noblesse.web.app
- Hosting deploy count: 1

## Smoke
- GET /api/health: 200
- GET /api/catalog/products: 200
- GET /api/buyer/me without token: 401
- /zh-TW route rendered with `html lang="zh-TW"` in headless Chrome

## Safety
- FX Job was not manually executed.
- Scheduler was not changed.
- Secret Manager values were not read or changed.
- IAM was not changed.
- Production DB schema was not changed.
- No direct DB connection or manual SQL was run.
