# Admin Backend Container Local Smoke Report

## Scope

- Local Docker build/run smoke test for backend container artifact.
- No production Docker run.
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

## Docker Build

- image tag: `noblesse-backend:32k2-smoke`
- docker build result: Not run
- blocker: Docker CLI was not available in the current terminal session.
- secret build args used: No
- registry push: No

## Docker Run

- NODE_ENV: development planned only
- DATABASE_URL supplied: No
- Firebase credentials supplied: No
- port mapping: localhost only planned
- container start result: Not run

## Health Smoke

- `/api/health` status: Not tested in container
- `/api/health` body sanitized: Not available
- health result: No-Go due to Docker unavailable

## Admin No-token Smoke

- `/api/admin/dashboard` without token status: Not tested in container
- unauthorized behavior: Not verified in container
- raw secret leak: No
- raw SQL leak: No

## Cleanup

- container removed: No container was created
- image removed or left local: No image was created
- no cloud resources created: Yes

## Go / No-Go

- Local container build: No-Go
- Local container health smoke: No-Go
- Production runtime deployment: No-Go
- Firebase `/api` rewrite: No-Go
- Production admin_memo rollout: No-Go

## 32K-2N Local Node Smoke Follow-up

- Docker CLI remains unavailable in the current Codex terminal session.
- Non-container local Node smoke is documented separately in `docs/ADMIN_BACKEND_LOCAL_NODE_SMOKE_REPORT.md`.
- The Node smoke verified `/api/health` and admin no-token boundary without DB, Firebase credentials, Cloud Run, Cloud Build, Firebase deploy, or Firebase `/api` rewrite.
- Container smoke remains No-Go until Docker is available and a separate container smoke can run.
