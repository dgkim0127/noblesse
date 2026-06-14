# Backend Local Runtime QA

## Purpose

Record local backend runtime smoke results before provider integration.

This QA confirms only the runtime pieces that are safe without PostgreSQL, Firebase Admin credentials, Cloud Run, Cloud SQL, Firebase Hosting rewrites, or deploy.

## Environment

- Runtime: local backend process
- Command target: `backend/src/server.js`
- Port: `8080`
- `DATABASE_URL`: not set
- Firebase Admin credentials: not set
- Production DB: not used
- Firebase rewrite: not added
- Deploy: not run

No password, username, host, port, connection string, or provider secret was recorded.

## Commands

Backend test:

```powershell
cd backend
npm.cmd test
```

Local runtime smoke:

```powershell
node src/server.js
```

Health check:

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing
```

Catalog limitation check:

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/api/catalog/products" -UseBasicParsing
```

## Results

Backend tests:

- Result: pass
- Tests: 9 passed
- Real PostgreSQL connection: no
- Real Firebase Admin verification: no

Health endpoint:

- Route: `GET /api/health`
- Result: pass
- HTTP status: `200`
- Body: `{"ok":true,"service":"noblesse-backend","version":"phase1"}`
- `x-request-id` header: present

Catalog runtime limitation:

- Route: `GET /api/catalog/products`
- Result: expected limitation
- HTTP status observed without `DATABASE_URL`: `500`
- `x-request-id` header: present
- Reason: DB-backed catalog queries require a configured PostgreSQL pool.
- This is not a Phase 1 failure because catalog route contract is already covered by mock tests.
- No DB details or secrets were recorded.

## Conclusion

- Local backend starts without provider resources.
- `/api/health` runtime smoke passes without DB or Firebase credentials.
- DB-backed catalog runtime QA requires a later local DB environment step.
- Buyer runtime QA with real token verification requires a later Firebase Auth/Admin setup step.
- Provider resources are still not created.
- Firebase Hosting rewrite is still not added.
- Deploy is still not run.
