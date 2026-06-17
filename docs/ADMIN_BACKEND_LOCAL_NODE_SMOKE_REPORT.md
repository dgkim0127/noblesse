# Admin Backend Local Node Smoke Report

## Scope

- Local non-container Node backend smoke test.
- Docker unavailable; this does not replace container smoke.
- No production env.
- No DATABASE_URL.
- No Firebase credentials.
- No Cloud Run.
- No Cloud Build.
- No gcloud deploy.
- No Firebase deploy.
- No Firebase `/api` rewrite.
- No production/staging DB.
- No Secret Manager.
- No Firebase Auth integration.
- No secret recorded.

## Preconditions

- branch: `codex/member-catalog-v1`
- git status before: `.firebase/` cache only
- Docker available: No
- backend npm test before: Pass, 41 passed
- firebase config changed: No
- backend package changed: No
- frontend src changed: No

## Local Server

- NODE_ENV: development
- PORT: local-only
- DATABASE_URL supplied: No
- Firebase credentials supplied: No
- server start result: Pass
- server stopped: Yes

## Health Smoke

- `/api/health` status: 200
- `/api/health` body sanitized: `ok=true`, `service=noblesse-backend`, `version=phase1`
- health result: Pass

## Admin No-token Smoke

- `/api/admin/dashboard` without token status: 401
- unauthorized behavior: Pass
- requestId returned: Yes
- raw secret leak: No
- raw SQL leak: No

## Go / No-Go

- Local Node backend smoke: Go
- Local container build: still No-Go until Docker available
- Production runtime deployment: No-Go
- Firebase `/api` rewrite: No-Go
- Production admin_memo rollout: No-Go
