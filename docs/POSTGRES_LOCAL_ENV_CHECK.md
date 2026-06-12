# PostgreSQL Local Environment Check

## Purpose

This document records which PostgreSQL dev dry-run options appear available on the current Windows PC before running SQL.

No database connection was opened, no database was created, no SQL was executed, and no secret was requested or recorded.

## Checked Commands

Date: 2026-06-12

Command results:

- `where psql`: not found
- `psql --version`: not executed because `psql` was not found in PATH
- `where docker`: not found
- `docker --version`: not executed because `docker` was not found in PATH
- `where pg_isready`: not found
- `pg_isready --version`: not executed because `pg_isready` was not found in PATH
- `where pgadmin4`: not found
- PostgreSQL Windows service: found
- PostgreSQL service status:
  - Service name: `postgresql-x64-17`
  - Status: `Running`
  - Display name: `postgresql-x64-17 - PostgreSQL Server 17`

## Findings

- Local PostgreSQL appears possible because a PostgreSQL 17 Windows service exists and is running.
- `psql` is not currently available in PATH, so command-line dry-run through `psql` is not ready without locating the PostgreSQL bin directory or adding it to PATH later.
- Docker PostgreSQL is not currently available because Docker was not found in PATH.
- `pg_isready` is not available in PATH.
- `pgAdmin4` was not found in PATH. It may still be installed as a Windows Start Menu app, but this check did not confirm it.
- This is not a "pgAdmin4 only" environment because a PostgreSQL server service is present.
- A hosted dev DB such as Neon or Railway is optional, not required, if local PostgreSQL access can be completed safely.

## Recommendation

B. Use local PostgreSQL for dry-run.

Reason:

- A local PostgreSQL 17 Windows service is already present and running.
- This avoids production DB risk and does not require a hosted provider.

Before SQL dry-run, confirm one safe SQL client path:

- Open pgAdmin4 from the Windows Start Menu if installed, or
- Locate the PostgreSQL `psql` executable and use it without recording credentials, or
- Install pgAdmin4/psql client tools if no SQL client is available.

Do not proceed to SQL execution until the client path is confirmed and the target database is clearly local/dev.

Fallback:

- If local client access is inconvenient, use a Neon dev branch.
- If repeatable reset is preferred and Docker is installed later, Docker PostgreSQL is also a good option.

## Safety

- Production DB not used.
- POS DB not used.
- No secrets recorded.
- No SQL executed.
- No database created.
- No PostgreSQL connection opened.
- No frontend DB connection added.
- No Firebase settings changed.
