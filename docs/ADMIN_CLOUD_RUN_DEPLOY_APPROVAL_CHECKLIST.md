# Admin Cloud Run Deploy Approval Checklist

## Purpose

- Define the approval checklist required before any Cloud Run admin backend runtime deploy.
- Convert the 32K-3 source deploy path decision into concrete pre-deploy requirements.
- Keep actual gcloud deploy, Cloud Build, Cloud Run, Secret Manager, Firebase rewrite, DB/Auth integration blocked.
- This step is docs-only.
- This plan supports the Noblesse B2B admin backend runtime path, not customer catalog UI changes.

## Current Status

- 32K-3 source deploy path documented.
- Recommended path is Cloud Run source deploy with existing backend/Dockerfile via Cloud Build.
- Buildpacks remain fallback/alternative, not the current primary path.
- local Docker CLI unavailable.
- local Docker smoke: No-Go / optional.
- local Node backend smoke: Go.
- backend npm test previously passed.
- root build previously passed.
- production runtime deployment: No-Go.
- Firebase /api rewrite: No-Go.
- production admin_memo rollout: No-Go.
- frontend source dirty exists but is intentionally not staged by this step.

## 32K-4 Scope

In scope:

- pre-deploy checklist
- placeholder-only runtime deploy spec
- required decisions before deploy
- smoke checks
- rollback/disable plan
- no-go boundaries
- validation notes

Out of scope:

- actual deploy
- Cloud Build execution
- Cloud Run service creation
- Secret Manager secret creation
- DB connection
- Firebase Auth connection
- Firebase /api rewrite
- production admin write
- frontend source changes

## Required Decisions Before Cloud Run Deploy

| Item | Required decision | Current value | Status | Notes |
| --- | --- | --- | --- | --- |
| Google Cloud project | Confirm deployment project | `<PROJECT_ID>` | Pending | Placeholder only; do not record real project id in this step. |
| Cloud Run service name | Confirm backend service name | `<SERVICE_NAME>` | Pending | Must be unique and clearly Noblesse admin backend scoped. |
| Cloud Run region | Confirm runtime region | `<REGION>` | Pending | Must align with DB/provider latency and operator comfort. |
| source path | Confirm deploy source root | `backend` | Proposed | Current backend package lives under `backend/`. |
| build mode | Confirm build method | existing `backend/Dockerfile` via Cloud Build | Proposed | Buildpacks remain fallback/alternative. |
| runtime service account | Confirm least-privilege runtime identity | `<RUNTIME_SERVICE_ACCOUNT>` | Pending | Do not use broad owner/admin permissions. |
| ingress/auth mode | Confirm Cloud Run ingress policy | TBD | Pending | Must fit Firebase Hosting rewrite plan. |
| unauthenticated access policy | Confirm public access boundary | TBD | Pending | Health may be public; admin routes must still require backend auth. |
| environment variable strategy | Confirm runtime env injection | TBD | Pending | No plaintext secret values in repo/docs. |
| Secret Manager strategy | Confirm secret storage and access | TBD | Pending | Must be approved before production deploy. |
| DATABASE_URL secret strategy | Confirm DB secret name and injection | `<DATABASE_URL_SECRET_NAME>` | Pending | Placeholder only; no connection string recorded. |
| Firebase credential strategy | Confirm backend Firebase credential path | `<FIREBASE_CREDENTIAL_SECRET_NAME>` | Pending | Placeholder only; no private JSON recorded. |
| Firebase Auth backend verification plan | Confirm server-side token verification | documented, not implemented | Pending | Must map token uid to PostgreSQL users.auth_uid. |
| staging/prod DB separation | Confirm separate staging/prod DB strategy | TBD | Pending | Required before staging or production write. |
| admin bootstrap plan | Confirm first admin process | documented, not executed | Pending | No public admin signup. |
| rollback strategy | Confirm runtime/rewrite/secret rollback | documented candidate | Pending | Must be tested before production write. |
| log redaction/no-secret policy | Confirm no secret logging | required | Pending | No tokens, DB URLs, private keys, auth headers, or JSON credentials in logs. |
| Firebase hosting target protection | Confirm `noblesse` target | configured | Pending before deploy | Reconfirm before any Firebase command. |
| POS/default site protection | Confirm no POS/default impact | required | Pending before deploy | Keep Noblesse separate from POS/default site. |
| Firebase /api rewrite approval sequence | Confirm rewrite happens only after runtime smoke | documented | Pending | Rewrite remains No-Go in 32K-4. |

Do not record real project ids, service account emails, secret names, connection strings, passwords, keys, or private JSON.

## Proposed Runtime Deploy Spec - Placeholder Only

Intended deployment shape, not executed in 32K-4:

- source path: `backend`
- build mode: existing `backend/Dockerfile` via Cloud Build
- runtime: Cloud Run service
- service name: `<SERVICE_NAME>`
- region: `<REGION>`
- project: `<PROJECT_ID>`
- service account: `<RUNTIME_SERVICE_ACCOUNT>`
- secrets: not created in 32K-4
- Firebase rewrite: not added in 32K-4
- production DB write: disabled
- production admin_memo write: disabled

Warning:

The following command examples are placeholders for later approval only. Do not run them in 32K-4.

```sh
# DO NOT RUN in 32K-4. Placeholder only.
gcloud run deploy <SERVICE_NAME> --source backend --region <REGION> --project <PROJECT_ID>
```

Do not include real project, service, service account, secret, or database values.

## Cloud Run Runtime Contract Checks

Required before deploy:

- backend must listen on `process.env.PORT` or approved equivalent.
- backend must bind to `0.0.0.0`, not only `127.0.0.1`.
- `/api/health` must not require DB or Firebase Auth.
- `/api/admin/dashboard` without token must return 401 before DB write.
- startup must not require missing production secrets for health-only smoke unless explicitly approved.
- logs must not print secrets, tokens, DB URLs, private keys, service account JSON, or auth headers.

## Required Smoke Checks After Future Deploy

Future checks only; do not execute in 32K-4:

- GET runtime `/api/health` -> 200
- GET runtime `/api/admin/dashboard` without token -> 401
- verify no secret leakage in logs
- verify no DB write occurred
- verify service revision is healthy
- verify rollback target exists before traffic change
- verify Firebase `/api` rewrite remains disabled until separate approval

## Required Before Secret Manager Integration

- approved secret names only, no values in repo
- staging/prod secret separation
- runtime service account least privilege
- secret access auditability
- rotation plan
- no plaintext DATABASE_URL in docs, code, logs, or git history
- no FIREBASE_PRIVATE_KEY in docs, code, logs, or git history
- no GOOGLE_APPLICATION_CREDENTIALS JSON committed

## Required Before Firebase Auth Integration

- backend verifies Firebase ID token server-side
- users.auth_uid maps to token uid
- users.role = admin checked server-side
- users.status = approved checked server-side
- viewerState/client claims are not trusted
- no public admin signup

Failure QA:

- no token -> 401
- invalid token -> 401
- valid non-admin -> 403
- disabled/unapproved user -> 403
- approved admin -> allowed only for approved read/write scope

## Required Before Firebase /api Rewrite

- Cloud Run runtime URL exists
- runtime smoke checks pass
- no-token admin endpoint returns 401
- Firebase hosting target `noblesse` confirmed
- public = `dist` confirmed
- POS/default site impact reviewed
- rollback plan confirmed
- rewrite diff reviewed before deploy
- firebase deploy still separate approval
- `/api` rewrite remains No-Go in 32K-4

## Rollback / Disable Plan

Placeholder rollback options:

- disable admin write feature flag
- revert Firebase `/api` rewrite before deployment if needed
- route Cloud Run traffic to previous revision after a future deploy
- remove or restrict runtime service IAM if needed
- revoke runtime secret access if needed
- keep production admin_memo rollout blocked until staging dry-run passes

Do not run rollback commands in 32K-4.

## No-Go Boundaries

- no gcloud run deploy in 32K-4
- no gcloud builds submit in 32K-4
- no Cloud Build execution in 32K-4
- no Cloud Run service creation in 32K-4
- no docker build in 32K-4
- no docker run in 32K-4
- no Firebase rewrite in 32K-4
- no firebase deploy in 32K-4
- no production DB/Auth/Secret in 32K-4
- no staging DB/Auth/Secret in 32K-4
- no production admin_memo rollout in 32K-4
- no production DB migration in 32K-4
- no production Firebase Auth connection in 32K-4
- no status write
- no buyer write
- no product write
- no price write
- no quote write
- no public admin signup
- no frontend src staging/commit by 32K-4
- no real secret, private key, service account JSON, DB URL, or password in docs

## Risk Register

| Risk | Impact | Mitigation | Current status |
| --- | --- | --- | --- |
| deploy command accidentally executed | Cloud resources could be created before approval. | Keep all commands placeholder-only and marked DO NOT RUN. | Blocked in 32K-4 |
| real project/secret values accidentally documented | Sensitive operational data could enter git history. | Use angle-bracket placeholders only. | Controlled |
| Dockerfile builds in Cloud Build but backend fails Cloud Run PORT contract | Remote build may succeed but service may not become healthy. | Verify PORT binding and health behavior before deploy approval. | Open |
| `/api/health` depends on DB/Auth and blocks smoke | Runtime smoke could fail without production secrets. | Keep health no-auth and safe, or explicitly approve readiness behavior. | Open |
| missing env vars break startup | Runtime could crash at boot. | Separate health-only startup from DB/Auth-dependent behavior where approved. | Open |
| secret leakage in logs | Credentials could be exposed. | Redact logs and prohibit printing env/secrets/tokens/headers. | Required |
| wrong Firebase Hosting target | Wrong site could be affected. | Reconfirm `noblesse`, `dist`, and scoped deploy before any rewrite/deploy. | Blocked |
| POS/default site accidental impact | Separate POS/default project could be touched. | Keep this repo and deploy target isolated. | Controlled |
| Firebase `/api` rewrite applied too early | Production frontend may route to unverified backend. | Rewrite requires runtime URL, smoke checks, rollback plan, and separate approval. | Blocked |
| production DB accidental write | Live data could change before rollout gates. | No production/staging DB connection in 32K-4. | Blocked |
| admin write enabled before Auth/role/status checks | Unauthorized admin writes could occur. | Require server-side Firebase Auth and PostgreSQL role/status checks. | Blocked |
| local dirty frontend accidentally staged | Unrelated UI changes could enter docs-only commit. | Stage only approved docs/supabase files; never stage src or .firebase. | Controlled |
| Cloud Run unauthenticated policy misunderstood | Admin routes may appear publicly reachable. | Require backend auth on admin routes regardless of Cloud Run ingress/public policy. | Open |

## 32K-4 Decision Summary

Decision:

Document Cloud Run deploy approval checklist and placeholder runtime spec only.

Deploy execution:

No-Go.

Build execution:

No-Go.

Cloud Run service creation:

No-Go.

Secret creation:

No-Go.

Firebase /api rewrite:

No-Go.

Production admin write:

No-Go.

Frontend source dirty:

Allowed to remain dirty but must not be staged/committed.

## 32K-5 Deploy Values Decision Follow-up

- Cloud Run deploy values decision is documented in `docs/ADMIN_CLOUD_RUN_DEPLOY_VALUES_DECISION.md`.
- Real project, service account, secret, DB URL, password, private key, and service account JSON values are not recorded.
- Deploy remains No-Go.
- Cloud Build, Cloud Run service creation, Secret Manager, Firebase Auth, Firebase `/api` rewrite, DB connection, and production admin_memo remain No-Go.

## 32K-6 Health-only Startup Follow-up

- `ALLOW_HEALTH_ONLY_STARTUP=true` exists for future runtime health smoke.
- Health-only startup does not replace Secret Manager, Auth, DB, staging dry-run, or rollback gates.
- Admin routes must remain fail-closed in this mode.
- Deploy still requires approval.
- Secret/Auth/DB gates remain No-Go.

## 32K-7 Health-only Entrypoint Smoke Follow-up

- Health-only entrypoint smoke completed locally through the actual `npm start` path.
- The smoke result is documented in `docs/ADMIN_BACKEND_HEALTH_ONLY_ENTRYPOINT_SMOKE_REPORT.md`.
- `/api/health` passed without DB/Auth secrets when `ALLOW_HEALTH_ONLY_STARTUP=true`.
- Admin no-token access remained fail-closed with `UNAUTHORIZED`.
- Cloud Run deploy still requires separate approval.
