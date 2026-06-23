# Admin Staging DB Runtime Privilege Recovery Diagnosis

## Scope

- Diagnose the failed staging runtime privilege hardening Job without re-running it.
- Add and run a separate read-only diagnostic runner.
- Determine whether the failure left committed privilege changes or rolled back before runtime setup.
- No GRANT, REVOKE, DDL, hardening retry, runtime DB user creation, runtime secret creation, application deploy, Firebase deploy, or production mutation.

## Source

- starting HEAD: `adc45c96b2470cff4a15e494e791efe834f09f8c`
- diagnostic source commit: `065ae2931`
- diagnostic source commit pushed: Yes.
- diagnostic image build: Success.
- diagnostic Cloud Run Job created: Yes.
- diagnostic Cloud Run Job execute count: 1.

## Diagnostic Job

- Job: `noblesse-staging-db-privilege-diagnose`.
- identity: existing DB Job identity reused; raw principal recorded: No.
- secret binding: existing migration DB URL secret, specific enabled version; secret value recorded: No.
- Cloud SQL socket attachment: Present; raw connection name recorded: No.
- command: `node`.
- args: `src/scripts/diagnoseStagingRuntimePrivileges.js`.
- max retries: 0.
- guard: `ALLOW_STAGING_RUNTIME_PRIVILEGE_DIAGNOSIS=true`.
- execution result: Succeeded.
- raw execution id recorded: No.
- raw logs recorded: No.
- sensitive data leak observed: No.

## Read-only Safety

- read-only transaction used: Yes.
- mutation SQL blocked by runner: Yes.
- GRANT executed: No.
- REVOKE executed: No.
- DDL executed: No.
- local psql/direct operator DB connection: No.
- secret payload access/read by operator: No.
- hardening Job re-executed: No.
- migration Job re-executed: No.
- RBAC verification Job re-executed: No.

## Execution Counts

- migration Job execution count before/after: 12/12.
- RBAC verification Job execution count before/after: 1/1.
- failed hardening Job execution count before/after: 1/1.
- diagnostic Job execution count before/after: 0/1.

## Diagnostic Result

- classification: B - database/schema ownership or runtime role setup failure.
- classification state: rolled back or not started.
- reason: runtime group role is absent and ownership authority is incomplete for the intended runtime privilege state.
- current session can create role: Yes.
- current session can create database: Yes.
- current session is superuser: No.
- current session has Cloud SQL superuser membership: Yes.
- current session is database owner: No.
- current session is public schema owner: No.
- runtime group role exists: No.
- runtime group role has object ownership: No.
- runtime group role can login: No.
- runtime group role is superuser: No.
- database public CREATE: No.
- schema public CREATE: No.
- manifest tables expected: 18.
- missing manifest tables: 0.
- expected runtime table privilege checks missing: 36 of 36.
- unexpected runtime table privileges: 0.
- migration ledger access for runtime role: No.

## Atomicity Finding

- The current hardening runner computes verification failures after `COMMIT`.
- Therefore the failed `NonZeroExitCode` alone did not prove rollback.
- The read-only diagnostic shows the runtime group role is absent and expected runtime privileges are not applied, so the failed run appears rolled back or not started for runtime privilege setup.
- Future hardener recovery must validate before commit and rollback on failed checks.

## Go / No-Go

- recovery diagnosis: Go.
- staging runtime DB privilege hardening retry: No-Go.
- runtime DB user creation: No-Go.
- runtime secret creation: No-Go.
- application service deploy: No-Go.
- Firebase deploy or `/api` rewrite: No-Go.
- production rollout: No-Go.

## Next Gate

- `APPROVE_STAGING_RUNTIME_PRIVILEGE_HARDENER_FIX_AND_RERUN = YES`
