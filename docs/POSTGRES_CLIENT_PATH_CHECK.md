# PostgreSQL Client Path Check

## Purpose

Confirm local PostgreSQL client tool paths before the SQL dry-run.

This check only located executable files and checked a client version. No PostgreSQL connection was opened, no database was created, no SQL was executed, and no secret was requested or recorded.

## Starting Point

- PostgreSQL service found: `postgresql-x64-17`
- Service status: `Running`
- `psql` not found in PATH
- Docker not found in PATH
- pgAdmin4 not found in PATH

## Checked Commands

Date: 2026-06-12

Service path check:

- Service name: `postgresql-x64-17`
- State: `Running`
- Service executable: `C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe`
- Data directory path was visible from the service command line, but no database connection was opened.

Client path results:

- `psql.exe`: found
- `psql.exe` paths:
  - `C:\Program Files\PostgreSQL\17\bin\psql.exe`
  - `C:\Program Files\PostgreSQL\17\pgAdmin 4\runtime\psql.exe`
- `psql` version: `psql (PostgreSQL) 17.10`
- `pgAdmin4.exe`: found
- `pgAdmin4.exe` path:
  - `C:\Program Files\PostgreSQL\17\pgAdmin 4\runtime\pgAdmin4.exe`

Do not record password, host, port, username, or connection string in this file.

## Recommendation

A. Use psql full path for next dry-run.

Reason:

- `psql.exe` was found.
- `psql` version was confirmed without opening a DB connection.
- This gives a direct PostgreSQL client path for the next manual dry-run.

Recommended client path:

- `C:\Program Files\PostgreSQL\17\bin\psql.exe`

Alternative:

- Use pgAdmin4 for the next dry-run if a UI is preferred.

Do not run the SQL dry-run until the target dev database is confirmed and no secrets will be recorded.

## Safety

- No DB connection opened.
- No SQL executed.
- No database created.
- No secret recorded.
- No frontend DB connection added.
- No Firebase changes.
