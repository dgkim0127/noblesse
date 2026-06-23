# Admin Staging DB Runtime Privilege Hardening Report

## Scope

- Separate staging migration/schema credentials from application runtime credentials.
- Create a least-privilege runtime privilege manifest and guarded hardening/verifier runners.
- Move staging schema/RBAC verification Jobs to the DB Job identity.
- Attempt the approved staging runtime privilege hardening Job once.
- No Cloud Run application service deploy.
- No Firebase deploy or `/api` rewrite.
- No production DB, production secret, or production write.

## Source

- start HEAD: `007a8811c5a2bd87a2a4b4b4b84e7eb1127eec6d`
- code commit: `7443873fe`
- code commit pushed: Yes.

## Identity Separation

- application identity present: Yes.
- DB Job identity created/verified: Yes.
- DB Job identity has Cloud SQL Client: Yes.
- DB Job identity has migration secret access: Yes.
- DB Job identity has runtime secret access: No.
- migration Job moved to DB Job identity: Yes.
- RBAC schema verification Job moved to DB Job identity: Yes.
- migration execution count unchanged: Yes, remained 12.
- RBAC verification execution count unchanged: Yes, remained 1.
- application identity migration-secret access removed: Yes.
- staging application service updated/deployed: No.

## Runtime Privilege Manifest

- custom group role: `noblesse_staging_runtime_role`.
- manifest tables are explicit: Yes.
- `app_schema_migrations` excluded: Yes.
- broad `ALL PRIVILEGES` / `ALL TABLES`: No.
- schema CREATE grant: No.
- database CREATE grant: No.
- DELETE grant restricted to source usage: Yes.
- query source table coverage test: Pass.

## Hardening Job

- Job: `noblesse-staging-db-privilege-harden`.
- image built from backend source: Yes.
- Job deployed: Yes.
- Job service identity: DB Job identity.
- secret injected: migration DB URL secret, specific enabled version.
- Cloud SQL socket attachment: Present.
- guard env: `ALLOW_STAGING_RUNTIME_PRIVILEGE_HARDENING=true`.
- execute count: 1.
- execution result: Failed.
- final reason: NonZeroExitCode.
- failed task count: 1.
- execution logs available: No.
- sensitive data leak observed in logs: No.
- runtime role created/verified: Not confirmed.
- grants applied: Not confirmed.
- transaction committed: Not confirmed.

## Runtime User / Runtime Secret

- runtime DB login user created: No.
- runtime secret created: No.
- runtime secret value recorded: No.
- password recorded: No.
- TEMP credential files created: No.
- runtime privilege verification Job created/executed: No.

## Verification

- backend tests before Cloud work: Pass, 240 passed.
- frontend tests: Pass, 70 passed.
- lint: Pass.
- build: Pass.
- local psql/direct operator DB connection: No.
- raw secret value access/read: No.
- raw query result recorded: No.
- raw Cloud Run logs recorded: No.

## Boundary

- application deploy: No.
- Firebase deploy: No.
- Firebase `/api` rewrite: No.
- production DB/write: No.
- migration Job re-execution: No.
- RBAC verification Job re-execution: No.
- runtime user creation after hardening failure: No.
- runtime secret creation after hardening failure: No.

## Go / No-Go

- staging runtime DB privilege hardening: No-Go.
- staging application deploy: No-Go.
- role E2E: No-Go.
- production rollout: No-Go.

## Next Gate

- `APPROVE_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS = YES`

## N38-B5R Recovery Diagnosis Follow-up

- Recovery diagnosis report: `docs/ADMIN_STAGING_DB_RUNTIME_PRIVILEGE_RECOVERY_DIAGNOSIS.md`.
- Diagnostic source commit: `065ae2931`.
- Diagnostic Job created: Yes.
- Diagnostic Job executed: Yes, exactly once.
- Diagnostic Job result: Success.
- Hardening Job re-executed: No.
- Migration Job execution count remained 12.
- RBAC verification Job execution count remained 1.
- Hardening Job execution count remained 1.
- Classification: B - database/schema ownership or runtime role setup failure.
- Runtime group role exists: No.
- Expected runtime privilege checks missing: 36 of 36.
- Atomicity finding: the current hardener evaluates failed checks after commit; future recovery must validate before commit and rollback on failed checks.
- Next gate: `APPROVE_STAGING_RUNTIME_PRIVILEGE_HARDENER_FIX_AND_RERUN = YES`.

## N38-B5F Hardener Recovery Follow-up

- Recovery report: `docs/ADMIN_STAGING_RUNTIME_PRIVILEGE_HARDENER_RECOVERY_REPORT.md`.
- Fix code commit: `6b6daece82ef875c987031545ec1eb58fe37974f`.
- Ownership-aware preflight added: Yes.
- Validation before commit added: Yes.
- Hardening Job updated: Yes.
- Hardening Job execution count: 1 -> 2.
- Hardening Job result: Success.
- Database/schema ACL mutation executed: No.
- Runtime role created: Yes.
- Expected runtime privilege missing count: 0.
- Unexpected runtime privilege count: 0.
- Migration ledger access: No.
- Runtime user created: No.
- Runtime secret created: No.
- Runtime verifier executed: No.
- Application/Firebase deploy: No.
- Next gate: `APPROVE_STAGING_RUNTIME_DB_USER_AND_SECRET_CREATE = YES`.
