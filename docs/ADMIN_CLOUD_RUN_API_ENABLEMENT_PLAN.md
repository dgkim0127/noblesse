# Admin Cloud Run API Enablement Plan

## Purpose

- Plan required Google Cloud API enablement before any Cloud Run admin backend deploy.
- Convert 32K-8R3 gcloud preflight Missing API results into an explicit approval gate.
- Keep actual API enablement, Cloud Build, Cloud Run deploy, Secret Manager creation, Firebase rewrite, DB/Auth integration blocked.
- This step is docs-only.

## Current Status

- gcloud CLI: available
- active account: present, value not recorded
- active project: present, value not recorded
- run.googleapis.com: Missing
- cloudbuild.googleapis.com: Missing
- artifactregistry.googleapis.com: Missing
- secretmanager.googleapis.com: Missing
- API enablement execution: No-Go
- Cloud Run deploy: No-Go
- Firebase `/api` rewrite: No-Go
- production admin_memo rollout: No-Go
- frontend source dirty: allowed but not staged

## Required APIs

| API | Purpose | Current Status | Enablement Judgment |
| --- | --- | --- | --- |
| run.googleapis.com | Cloud Run runtime | Missing | Approval required |
| cloudbuild.googleapis.com | Source deploy build path | Missing | Approval required |
| artifactregistry.googleapis.com | Container image storage/build artifacts | Missing | Approval required |
| secretmanager.googleapis.com | Server-side secret storage | Missing | Approval required |

## Enablement Approval Requirements

Before enabling any API:

- user approval required
- active project must be intentionally confirmed
- no real project id recorded in docs/chat
- no broad deploy command executed
- billing/cost impact acknowledged
- POS/default site impact reviewed
- rollback/no-op understanding documented
- deploy remains separate approval

## Placeholder Commands - Do Not Run

Document only:

```sh
# DO NOT RUN in 32K-9. Placeholder only.
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

Rules:

- Do not run these commands in 32K-9.
- Do not record actual project id.
- Do not change active project.
- Do not deploy after enabling APIs without a separate step.

## Risk / Cost Notes

Risks:

- enabling APIs changes project configuration
- Cloud Build / Artifact Registry may create billable resources later when used
- Cloud Run deploy may incur cost later when service is created
- wrong project enablement could affect unrelated project
- API enablement does not imply deploy approval

Mitigation:

- explicit user approval
- sanitized project confirmation only
- enable APIs only in a separate approved step
- deploy remains blocked
- Firebase `/api` rewrite remains blocked

## Go / No-Go

Go:

- API enablement planning

No-Go:

- gcloud services enable
- Cloud Run deploy
- Cloud Build execution
- Secret Manager creation
- Firebase deploy
- Firebase `/api` rewrite
- DB/Auth/SQL
- production admin_memo write

## 32K-10 API Enablement Follow-up

- API enablement was executed after explicit user approval.
- Enablement result is documented in `docs/ADMIN_CLOUD_RUN_API_ENABLEMENT_REPORT.md`.
- Required APIs are now Enabled.
- Cloud Run deploy remains No-Go.
- Cloud Build execution remains No-Go.
- Secret Manager secret creation remains No-Go.
- Firebase `/api` rewrite remains No-Go.
- production admin_memo rollout remains No-Go.
