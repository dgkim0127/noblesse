# Admin Cloud SQL Admin API Enablement Report

## Scope

- Enable Cloud SQL Admin API only.
- No Cloud SQL instance creation.
- No database/user creation.
- No IAM change.
- No DB connection.
- No SQL execution.
- No Secret Manager version.
- No Cloud Run update/deploy.
- No Firebase rewrite/deploy.
- No production write.
- No secret recorded.
- Frontend source dirty not staged.

## Preconditions

- branch: `codex/member-catalog-v1`
- active account present: Yes
- active project configured: Yes
- real account email recorded: No
- real project id recorded: No
- user approval: Yes

## API Enablement

- `sqladmin.googleapis.com` before: Missing
- `gcloud services enable` executed: Yes, for `sqladmin.googleapis.com` only
- `sqladmin.googleapis.com` after: Enabled

## Cloud SQL Read-only Check

- Cloud SQL instances present: Yes
- Noblesse staging-named instance present: No
- raw instance names recorded: No
- raw IP/connection names recorded: No

## No-Go Boundaries

- staging DB creation: No-Go
- Cloud SQL instance creation: No-Go
- database/user creation: No-Go
- Cloud SQL Client IAM: No-Go
- schema migration: No-Go
- Secret Manager version addition: No-Go
- Cloud Run DB update: No-Go
- Firebase Auth/rewrite: No-Go
- production write: No-Go

## Next Gate

- `APPROVE_DB_POOL_SOCKET_SUPPORT = YES`

Reason:

- Backend pool must support Cloud SQL Unix socket mode before staging DB rollout.
