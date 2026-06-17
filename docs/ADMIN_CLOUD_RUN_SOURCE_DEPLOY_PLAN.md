# Admin Cloud Run Source Deploy Plan

## Purpose

- Plan a Cloud Run deployment path that does not require local Docker Desktop.
- Compare existing Dockerfile-based Cloud Build vs buildpacks/source deploy.
- Keep actual gcloud deploy, Cloud Build, Cloud Run, Secret Manager, Firebase rewrite, DB/Auth integration blocked.
- This step is docs-only.
- This plan supports the Noblesse B2B admin backend runtime path, not customer catalog UI changes.

## Current Status

- backend/Dockerfile exists.
- backend/.dockerignore exists.
- local Docker CLI unavailable.
- local Docker smoke: No-Go.
- local Node backend smoke: Go.
- /api/health returned 200 OK in non-container local smoke.
- /api/admin/dashboard without token returned 401 UNAUTHORIZED in non-container local smoke.
- DATABASE_URL is not configured.
- Firebase credential is not configured.
- production runtime deployment: No-Go.
- Firebase /api rewrite: No-Go.
- production admin_memo rollout: No-Go.
- frontend source dirty exists but is intentionally not staged by this step.

## Deployment Options

### Option A. Cloud Run source deploy using existing Dockerfile

Description:

- Cloud Run source deploy path is used.
- Cloud Build builds from source using the existing backend/Dockerfile.
- Local Docker Desktop is not required.
- Dockerfile remains the build definition.
- This is more explicit than buildpacks.

Pros:

- Reuses existing backend/Dockerfile.
- Keeps runtime definition explicit.
- Avoids requiring Docker Desktop in the current local environment.
- More predictable than auto-detected buildpacks.

Cons:

- Dockerfile must remain correct.
- Build failure may appear only in Cloud Build, since local Docker smoke is unavailable.
- Requires Cloud Build permissions and correct project/region setup.
- Requires Cloud Run runtime contract compatibility, including PORT handling.

Gate impact:

- local Docker smoke can remain optional.
- Cloud Build result becomes the first real container build validation.
- production deploy remains No-Go in 32K-3.

Decision:

- Recommended path for now.

### Option B. Cloud Run source deploy using buildpacks

Description:

- Use Cloud Run source deploy with Google Cloud buildpacks.
- Google buildpacks detect Node.js and build a production image.
- Local Docker Desktop is not required.
- This path should be considered only if Dockerfile is removed, avoided, or a later deploy path explicitly selects buildpacks.

Pros:

- Simpler build setup.
- No Dockerfile maintenance.
- Suitable for conventional Node.js apps.

Cons:

- Less explicit control over build/runtime behavior.
- Need to ensure backend root/path is correctly selected.
- Existing Dockerfile can cause confusion if present.
- Must confirm how the selected deploy command/source path handles Dockerfile vs buildpacks.

Gate impact:

- Could reduce Dockerfile maintenance.
- Requires separate decision if we want to stop using Dockerfile.
- Not the preferred 32K-3 path because backend/Dockerfile already exists.

Decision:

- Keep as fallback/alternative, not current recommendation.

### Option C. Install Docker Desktop and keep local Docker smoke as required

Description:

- Install Docker Desktop locally.
- Run local docker build/run smoke before Cloud Run progression.

Pros:

- Best local container confidence.
- Catches Dockerfile problems before remote build.
- Good parity check.

Cons:

- Current blocker is Docker CLI unavailable.
- Adds local setup overhead.
- Blocks progress even though Cloud Run/Cloud Build can build remotely.
- Not necessary for 32K-3 planning.

Gate impact:

- If kept as required, 32K remains blocked.
- If optional, work can proceed while preserving local parity as a later improvement.

Decision:

- Downgrade to optional but recommended.

### Option D. Cloud Build image submit + deploy image

Description:

- Build container image explicitly with Cloud Build.
- Deploy the built image to Cloud Run in a separate step.

Pros:

- Better CI/CD separation.
- More explicit control over build and deploy.
- Better fit for later production pipeline.

Cons:

- More complex than current 32K-3 needs.
- Requires Cloud Build execution, which is forbidden in this task.
- Requires image registry/deploy strategy decisions.

Gate impact:

- Useful later.
- Too heavy for current docs-only step.

Decision:

- Defer to later backend deployment/CI planning.

## Recommended Direction

- Keep backend/Dockerfile for now.
- Do not force Docker Desktop installation.
- Treat local Docker smoke as optional but recommended.
- Plan Cloud Run source deploy path using existing backend/Dockerfile only after user approval.
- Consider current recommended path as "Cloud Run source deploy with existing Dockerfile via Cloud Build."
- Do not call this current path "pure buildpacks."
- Do not deploy in 32K-3.
- Do not add Firebase /api rewrite in 32K-3.
- Do not enable production admin_memo write in 32K-3.

## Required Before Any Cloud Run Deploy

- Google Cloud project confirmed.
- Cloud Run service name confirmed.
- region confirmed.
- Cloud Run Admin API enabled.
- Cloud Build permissions confirmed.
- Artifact Registry behavior understood.
- runtime service account selected.
- PORT handling confirmed in backend.
- Secret Manager plan approved.
- production/staging DB plan approved.
- Firebase Auth/admin verification implementation approved.
- users.auth_uid mapping plan approved.
- users.role = admin server-side check approved.
- users.status = approved server-side check approved.
- viewerState/client claims are not trusted.
- admin bootstrap plan approved.
- staging dry-run plan approved.
- rollback/disable plan approved.
- POS/default site protection confirmed.
- Firebase hosting target noblesse confirmed.
- Firebase /api rewrite plan approved but not deployed.

## Required Before Any Production Admin Write

- Cloud Run runtime deployed and reachable.
- runtime /api/health smoke passes.
- runtime /api/admin/dashboard without token returns 401.
- DATABASE_URL provided only through Secret Manager or approved secret path.
- Firebase ID token verification implemented on backend.
- users.auth_uid maps to authenticated Firebase uid.
- users.role = admin checked server-side.
- users.status = approved checked server-side.
- staging/prod-like DB dry-run passes.
- admin_memo write succeeds only in staging first.
- audit_logs insert verified.
- rollback/disable path verified.
- Firebase /api rewrite tested only after backend runtime URL exists.
- production admin_memo rollout separately approved.

## Optional Gates

- Local Docker build.
- Local Docker run.
- Container /api/health smoke.
- Container no-token 401 smoke.

Explanation:

- These checks are useful for local container parity.
- They are not required to complete 32K-3 because Cloud Run/Cloud Build can build remotely.
- If Docker CLI becomes available later, run them before production rollout if practical.

## No-Go

- no gcloud run deploy in 32K-3.
- no Cloud Build in 32K-3.
- no Cloud Run service creation in 32K-3.
- no Firebase rewrite in 32K-3.
- no firebase deploy in 32K-3.
- no production DB/Auth/Secret in 32K-3.
- no staging DB/Auth/Secret in 32K-3.
- no production admin_memo rollout in 32K-3.
- no production DB migration in 32K-3.
- no production Firebase Auth connection in 32K-3.
- no status write.
- no buyer write.
- no product write.
- no price write.
- no quote write.
- no public admin signup.
- no frontend src staging/commit by 32K-3.

## Risk Register

| Risk | Impact | Mitigation | Current status |
| --- | --- | --- | --- |
| Dockerfile build may fail in Cloud Build even though Node local smoke passed. | First remote build may block deployment. | Keep Dockerfile explicit, review build logs, and treat Cloud Build as first real container validation if local Docker remains unavailable. | Open |
| Cloud Run PORT mismatch risk. | Runtime may start locally but fail Cloud Run health checks. | Confirm backend listens on the runtime-provided PORT before any deploy. | Open |
| Missing environment variables risk. | Runtime may boot without DB/Auth features or fail guarded routes. | Document required env and inject secrets only through approved runtime paths. | Open |
| Secret leakage risk. | Credentials could be exposed in repo, docs, logs, or images. | Do not record real connection strings, private keys, or service account JSON; use Secret Manager or approved secret path later. | Controlled in 32K-3 |
| Wrong Firebase Hosting target risk. | Deploy could affect the wrong site. | Confirm target `noblesse`, public `dist`, and scoped deploy command before any Firebase change. | Blocked |
| POS/default site accidental impact risk. | Non-Noblesse app/site could be modified. | Keep this repo and hosting target separate from POS/default site work. | Controlled in 32K-3 |
| Production DB accidental write risk. | Live data could be modified before gates pass. | No production/staging DB connection or write in 32K-3; require staging dry-run first. | Blocked |
| Buildpacks vs Dockerfile confusion risk. | Wrong build path could be selected. | Name current recommendation as source deploy with existing Dockerfile via Cloud Build, not pure buildpacks. | Documented |
| Firebase /api rewrite applied too early. | Frontend could route traffic to an unverified backend. | Keep rewrite No-Go until runtime URL, health, auth, DB, and rollback gates pass. | Blocked |
| Admin write enabled before Auth/role/status checks. | Unauthorized production writes could be possible. | Require Firebase ID token verification plus server-side users.role/status checks first. | Blocked |
| Local dirty frontend accidentally staged. | Unrelated UI changes could enter docs-only commit. | Stage only explicitly allowed docs and validation notes; never stage `src/` or `.firebase/`. | Controlled in 32K-3 |

## 32K-3 Decision Summary

Decision:

Proceed with Cloud Run source deploy path planning.

Build mode:

Use existing backend/Dockerfile via Cloud Build as the recommended path.

Docker Desktop:

Not required for 32K progression.

Local Docker smoke:

Optional, not blocking.

Production deploy:

No-Go.

Production admin write:

No-Go.

Production DB/Secret/Auth/Firebase rewrite:

No-Go until later gates pass.

Frontend source dirty:

Allowed to remain dirty but must not be staged/committed.
