# PostgreSQL Dev Environment Options

This document compares safe dev database options for the Noblesse PostgreSQL schema dry-run.

The goal is to choose a reset-safe PostgreSQL environment before running the SQL scaffold. Do not use production, the POS database, or operating data.

## Option A. Local PostgreSQL

Description:

- PostgreSQL is installed directly on the PC.
- Connect with pgAdmin4 or psql.

Pros:

- Fully local.
- No risk to an operating hosted DB when a separate dev database is used.

Cons:

- Requires installation and local environment setup.
- Local service/version differences must be managed.

## Option B. Docker PostgreSQL

Description:

- PostgreSQL runs in a Docker container.

Pros:

- Easy reset.
- Easy separation from operating databases.
- Good for repeatable dry-runs.

Cons:

- Requires Docker.
- Volume/reset behavior must be understood before testing.

## Option C. Neon Dev Branch

Description:

- Create a free/dev PostgreSQL branch in Neon.

Pros:

- Low local setup.
- Web console is available.
- Branching can make reset/retry easier.

Cons:

- Requires provider account creation.
- Managed DB limits and costs should be checked.
- Secrets must not be copied into this repo.

## Option D. Railway / Render PostgreSQL

Description:

- Create a dev PostgreSQL instance on Railway or Render.

Pros:

- Can later connect naturally to an API deployment.
- Less local setup than a PC install.

Cons:

- Provider pricing and limits must be checked.
- Dev/prod project separation must be strict.
- Secrets must not be recorded.

## Option E. Cloud SQL Dev Instance

Description:

- Create a Google Cloud SQL PostgreSQL dev instance.

Pros:

- Good future fit if the backend API runs on Cloud Run.
- Cloud IAM/networking can be designed later around the API.

Cons:

- More setup complexity.
- Cost management is required.
- Must be kept separate from production and POS databases.

## Recommendation

- If minimal installation is preferred, start with a Neon dev branch.
- If fully local and reset-safe testing is preferred, use Docker PostgreSQL.
- If a future Cloud Run API is likely, consider Cloud SQL later after the schema and API boundary are clearer.

## Safety Notes

- Do not use a production DB.
- Do not use the POS DB.
- Do not use operating data.
- Do not record `DATABASE_URL`, DB password, host, port, username, or provider secret in docs, GitHub, chat, `.env.example`, or frontend code.
- The React frontend must not connect directly to PostgreSQL.
- The backend API will own PostgreSQL credentials in a later step.
