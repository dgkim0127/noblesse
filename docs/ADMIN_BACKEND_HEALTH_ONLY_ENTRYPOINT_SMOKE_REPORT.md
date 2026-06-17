# Admin Backend Health-only Entrypoint Smoke Report

## Scope

- Local production health-only backend entrypoint smoke.
- Actual `npm start` / `src/server.js` path.
- `NODE_ENV=production`.
- `ALLOW_HEALTH_ONLY_STARTUP=true`.
- No `DATABASE_URL`.
- No Firebase credentials.
- No Docker.
- No Cloud Run.
- No Cloud Build.
- No Firebase deploy.
- No Firebase `/api` rewrite.
- No DB/Auth/SQL.
- No secret recorded.

## Preconditions

- branch: `codex/member-catalog-v1`
- git status before: known frontend source dirty plus `.firebase/` cache only.
- backend npm test before: Pass, 47 tests.
- Firebase config changed: No.
- backend package changed: No.
- frontend src staged: No.

## Server Startup

- command path: `npm start`
- port: local-only `18082`
- server start result: Pass.
- `DATABASE_URL` supplied: No.
- Firebase credentials supplied: No.
- health-only flag enabled: Yes.

## Health Smoke

- `/api/health` status: 200.
- body sanitized: `ok=true`, `service=noblesse-backend`, `version=phase1`.
- health result: Pass.

## Admin No-token Smoke

- `/api/admin/dashboard` without token status: 401.
- unauthorized behavior: Pass.
- requestId present: Yes.
- raw secret leak: No.
- raw SQL leak: No.

## Cleanup

- server stopped: Yes.
- port 18082 clear: Yes.
- no cloud resources created: Yes.

## Go / No-Go

- Health-only entrypoint smoke: Go.
- Docker container smoke: still No-Go until Docker is available.
- Cloud Run deployment: No-Go.
- Firebase `/api` rewrite: No-Go.
- Production admin_memo rollout: No-Go.
