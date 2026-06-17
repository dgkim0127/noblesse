# Admin Firebase API Rewrite Plan

## Purpose

- Plan the future Firebase Hosting `/api/**` rewrite needed to connect Noblesse static frontend to the production backend runtime.
- Define preconditions, target protection, backend URL readiness, rollback, QA, and POS/default site protection.
- Keep actual firebase.json changes, Firebase deploy, Cloud Run connection, backend runtime deployment, Auth/DB integration, and production rollout blocked.
- This step is docs-only.

## Current Decision Status

- Firebase API rewrite planning: Go
- firebase.json modification: No-Go
- Firebase deploy: No-Go
- Cloud Run/backend connection: No-Go
- Production DB/Auth integration: No-Go
- Production admin_memo rollout: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- `firebase.json`
- `.firebaserc`
- `docs/ADMIN_STAGING_MEMO_DRY_RUN_PLAN.md`
- `docs/ADMIN_BOOTSTRAP_PLAN.md`
- `docs/ADMIN_FIREBASE_AUTH_VERIFICATION_PLAN.md`
- `docs/ADMIN_PRODUCTION_INFRA_DECISION.md`
- `docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md`
- `docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md`
- `docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md`
- `docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md`
- `docs/ADMIN_WRITE_API_CONTRACT.md`
- `docs/ADMIN_WRITE_SAFETY_GATES.md`
- `docs/BACKEND_API_BOUNDARY.md`
- `docs/BACKEND_IMPLEMENTATION_READINESS.md`
- `supabase/VALIDATION_NOTES.md`

## Current Firebase Config Snapshot

Observed in 32J-8:

- hosting target: `noblesse`
- public directory: `dist`
- `/api` rewrite: absent
- current Hosting behavior: static frontend plus SPA fallback
- `.firebaserc` Noblesse target mapping: present

Current status:

- configuration read only
- no Firebase config file changed
- no deploy run

## Future Rewrite Architecture

Future target:

```text
Firebase Hosting noblesse
-> /api/**
-> production backend runtime
-> Express backend
-> Firebase Auth verification
-> PostgreSQL through server-side secret
-> transaction/audit_logs for admin writes
```

Current state:

- Firebase Hosting serves static frontend only.
- `/api` rewrite is absent.
- Production frontend does not call admin API.
- Backend runtime is not deployed.
- Production Auth/DB/Secret gates are not implemented.

Important:

- Rewrite must not be added before backend runtime is production-ready.
- Rewrite must not be added before Auth/DB/Secret/bootstrap/staging QA gates pass.
- Rewrite is not a substitute for backend auth.
- Rewrite does not authorize frontend direct DB access.

## Hosting Target Protection

Required:

- Firebase hosting target must remain `noblesse`.
- Firebase public directory must remain `dist`.
- Existing SPA fallback must remain intact.
- POS/default Firebase site must not be touched.
- Any old/unused site must not be deleted in this step.
- `.firebaserc` target mapping must be verified before any future deploy.

Current status:

- target check only
- no config change in 32J-8

No-Go:

- do not modify firebase.json in 32J-8
- do not modify .firebaserc in 32J-8
- do not deploy in 32J-8
- do not touch POS/default site

## Backend URL Readiness

Required before rewrite:

- production backend runtime exists
- backend health route verified
- backend URL known
- backend URL belongs to approved runtime
- backend Auth middleware ready
- backend DB secret available server-side
- admin_memo staging/prod-like dry-run passed
- rollback path approved

Backend URL must not be:

- unverified preview URL
- local development URL
- personal tunnel URL
- frontend-only Hosting URL
- URL without auth-protected admin routes

Current status:

- backend runtime not deployed
- backend URL not ready
- rewrite remains No-Go

## Rewrite Candidate Shape

Future candidate only.

Concept:

- `/api/**` should route to the approved backend runtime.
- Firebase Hosting should still serve static frontend from `dist`.
- SPA fallback should remain for frontend routes.

Rules:

- Document candidate shape only.
- Do not edit firebase.json in 32J-8.
- Verify exact Firebase syntax against official docs before implementation.
- Do not commit placeholder backend service IDs as active config.
- Do not add rewrite before backend health/Auth/DB/staging gates pass.

Example concept only:

```json
{
  "source": "/api/**",
  "run": {
    "serviceId": "<approved-admin-backend-service>",
    "region": "<approved-region>"
  }
}
```

This example is not active configuration.

## Rewrite Preconditions

All must be complete before changing Firebase config:

- production backend runtime implemented and deployed
- backend `/api/health` passes through direct backend URL
- Firebase Auth admin verification implemented
- PostgreSQL `users.auth_uid` admin mapping implemented
- admin bootstrap completed and reversible
- production DB and secret path approved
- staging/prod-like admin_memo dry-run passed
- rollback/disable plan approved
- hosting target confirmed as `noblesse`
- deployment command reviewed for `hosting:noblesse` only

No-Go until all pass:

- no `/api` rewrite
- no Firebase deploy
- no frontend admin production integration

## Future Deploy Boundary

Allowed future deploy scope only after approval:

```text
firebase.cmd deploy --only hosting:noblesse --project pors-piercing-pos
```

Required future deploy log checks:

- deploy target shows `hosting[noblesse]`
- Hosting URL remains `https://noblesse.web.app`
- Firestore rules deployed: No
- Storage rules deployed: No
- POS/default site touched: No
- `/api/**` route smoke tested after deploy

Current status:

- deploy not run in 32J-8
- deploy command documented only

## Rollback Plan

Future rollback if `/api` rewrite causes issues:

- revert firebase.json rewrite change
- build frontend if needed
- deploy `hosting:noblesse` only
- verify static frontend routes still load
- verify `/api` no longer routes through broken backend
- keep backend runtime rollback available separately
- preserve logs and requestIds for diagnosis

Rollback must not:

- delete the Noblesse Hosting target
- deploy default/POS site
- modify Firestore/Storage rules
- expose backend secrets in rollback logs
- disable catalog frontend unless explicitly required

Current status:

- rollback planned only
- no rewrite exists to roll back

## Production Smoke QA Plan

Required future QA after rewrite deploy:

- `/` loads static catalog frontend
- `/kr`, `/en`, `/jp`, `/cn` routes load through SPA fallback
- `/api/health` returns backend health through Hosting
- `/api/admin/dashboard` without token returns `UNAUTHORIZED`
- invalid token returns `UNAUTHORIZED`
- non-admin token returns `FORBIDDEN`
- approved admin token can access read-only/admin memo candidate routes only if all gates are approved
- `PATCH /api/admin/inquiries/:inquiryId/memo` remains feature-gated until production rollout approval
- requestId appears in errors
- no raw SQL/Auth/secret details leak

Catalog checks:

- product catalog still loads
- inquiry/contact flow remains intact
- no direct-purchase checkout/payment language appears

Current status:

- production smoke QA not executed in 32J-8

## POS / Default Site Protection

Required:

- use only Noblesse hosting target
- do not use broad Firebase deploy
- do not deploy default hosting site
- do not modify POS/APK/Capacitor files
- do not change unrelated Firebase targets
- do not delete old/unused hosting sites without separate approval

Before future deploy:

- inspect `firebase.json`
- inspect `.firebaserc`
- confirm deploy command uses `--only hosting:noblesse`
- confirm no Firestore/Storage rules are included

Current status:

- protection documented only
- no deploy

## No-deploy / No-rewrite Checklist For 32J-8

Completed in this step:

- firebase.json inspected
- `.firebaserc` inspected
- `/api` rewrite confirmed absent
- rewrite plan documented

Not performed:

- firebase.json modification
- `.firebaserc` modification
- Firebase deploy
- Cloud Run/backend runtime deployment
- backend URL connection
- DB/Auth/Secret integration
- SQL execution
- schema/migration change
- frontend source change

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-8 Judgment |
| --- | --- | --- | --- |
| Hosting target | `noblesse` only | Present | Keep protected |
| Public directory | `dist` | Present | Keep protected |
| `/api` rewrite | Add only after backend gates | Absent | Plan only |
| Backend URL | Approved production runtime URL | Not ready | No-Go |
| Auth/DB/Secret | Required before rewrite | Not implemented | No-Go |
| Staging dry-run | Required before production rollout | Not executed | No-Go |
| Deploy | `hosting:noblesse` only after approval | Not run | No-Go |
| POS/default site | Must not be touched | Protected | Keep blocked |

## Recommended Next Phases

### 32J-9

Production rollout checklist:

- runtime
- DB
- secret
- auth
- bootstrap
- staging dry-run
- rewrite
- QA
- rollback

### 32K

Actual implementation phase, only after explicit approval:

- backend runtime implementation
- Firebase Auth integration
- production/staging DB setup
- Secret Manager setup
- Firebase Hosting `/api` rewrite implementation

Important:

- Do not add `/api` rewrite before backend runtime and Auth/DB/Secret/staging gates pass.
- Do not deploy broad Firebase targets.
- Do not touch POS/default site.

## 32J-9 Admin Production Rollout Checklist Follow-up

- Production rollout checklist is documented in `docs/ADMIN_PRODUCTION_ROLLOUT_CHECKLIST.md`.
- Firebase `/api` rewrite remains No-Go until the rollout checklist passes.
- No Firebase config change, rewrite, deploy, backend URL connection, DB/Auth integration, or POS/default site change was added in 32J-9.
