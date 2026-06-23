# Admin Staging Runtime Secret Version Add Diagnosis

## Scope

- Read-only diagnosis of failed runtime secret version add.
- No version add retry.
- No password reset.
- No IAM mutation.
- No secret value access.
- No DB login/query, psql, runtime verifier, Cloud Run Job execution, application deploy, Firebase deploy, or production work.
- No raw audit log, raw principal, raw resource name, raw request payload, secret payload, password, DB URL, project ID, service account email, or TEMP file content is recorded.

## Source

- start HEAD: `61d37f27ccb6ace382ecf08fe0c6042d7c07b133`
- prior report: `docs/ADMIN_STAGING_RUNTIME_DB_STAGED_CREDENTIAL_HANDOFF_REPORT.md`

## Current State

- runtime secret exists: Yes
- runtime secret version counts: enabled 0 / disabled 0 / destroyed 0
- runtime user exists: Yes
- custom runtime group role preserved: Yes, from prior hardening report
- explicit cloudsqlsuperuser: No
- application runtime-secret accessor: No
- DB Job runtime-secret accessor: No
- application migration-secret accessor: No
- public runtime secret member: No
- Job execution counts unchanged: Yes

## API Evidence

- bounded diagnostic window used: Yes
- relevant AddSecretVersion audit event found: No
- relevant event count: 0
- request reached Secret Manager API: No
- API result category: unknown
- raw principal recorded: No
- raw resource name recorded: No
- raw request/response recorded: No
- secret payload recorded: No

## IAM

- caller add-version permission: Unknown
- reason: current gcloud surface did not expose a usable `secrets test-iam-permissions` command.
- secret-level relevant role present: No
- explicit deny signal: Unknown
- IAM mutation executed: No
- raw member identities recorded: No

## Context

- active project matches secret project: Yes
- expected secret resource resolved: Yes
- regional/global location mismatch: No
- raw identifiers recorded: No

## Parser / Wrapper

- command contract available: Yes
- positional secret supported: Yes
- `--data-file` supported: Yes
- `--quiet` supported: Yes
- `--user-output-enabled` supported: Yes
- no-space path accepted: Yes
- space path accepted: Yes
- argument quoting issue for plain data-file path: No
- Start-Process without explicit project flag: parser accepted
- direct PowerShell without explicit project flag: parser accepted
- cmd wrapper without explicit project flag: parser accepted
- Node wrapper without explicit project flag: parser did not complete successfully
- Start-Process with explicit project flag in the add-version help shape: parser failed
- operation created by parser tests: No
- dummy files removed: Yes

## Classification

- Category: A - LOCAL_WRAPPER_OR_PATH_FAILURE
- Sanitized reason: The failed N38-B6R4 add-version attempt produced no bounded-window AddSecretVersion audit event and no server-side version, while local parser tests show the exact explicit-project add-version argument shape fails before API reachability. Plain data-file path parsing works, including paths with spaces.
- retry approved: No

## Boundary

- secret version add retry: No
- password reset: No
- IAM mutation: No
- secret value access: No
- DB login/query: No
- Job execution: No
- app/Firebase deploy: No
- production mutation: No

## Verification

- backend tests: Pass. `npm.cmd test` in `backend` completed with 262 tests passed and 0 failed.
- frontend tests: Pass. `npm.cmd run test:frontend` completed with 70 tests passed and 0 failed.
- build: Pass. `npm.cmd run build` completed successfully; the existing Vite chunk-size warning remains informational.
- lint: Blocked by existing out-of-scope source state. `npm.cmd run lint` reports two conditional React hook errors in `src/pages/HomePage.jsx`, which was already dirty and was not modified or staged by this diagnosis.
- sensitive value scan: Pass. The report records only sanitized categories and does not record a DB URL, password, private credential, API key, service account email, secret payload, raw audit log, raw resource name, request payload, response payload, or temporary file content.

## Next Gate

- `APPROVE_STAGING_RUNTIME_SECRET_WRAPPER_FIX = YES`
- Follow-up report: `docs/ADMIN_STAGING_RUNTIME_SECRET_WRAPPER_FIX_REPORT.md`.
- Result: Case B - wrapper still fails before target API reachability.
- Secret version add invocation count: 1.
- Target runtime secret version created: No.
- Password reset, version enable, IAM grant, DB login/query, runtime verifier, Cloud Run Job execution, app/Firebase deploy, and production mutation were not performed.
- Updated next gate: `APPROVE_STAGING_RUNTIME_SECRET_WRAPPER_RECOVERY_DIAGNOSIS = YES`.
