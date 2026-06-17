# Admin Firebase Auth Verification Plan

## Purpose

- Plan how production admin APIs will verify Firebase Auth ID tokens.
- Define the backend authorization boundary for admin_memo and future admin write APIs.
- Map Firebase identity to PostgreSQL users.auth_uid, users.role, and users.status.
- Keep Firebase Auth integration, Firebase Admin SDK installation, credentials, DB/Auth runtime wiring, Firebase rewrite, and deploy blocked.
- This step is docs-only.

## Current Decision Status

- Firebase Auth admin verification planning: Go
- Firebase Auth integration: No-Go
- Firebase Admin SDK dependency: No-Go
- Service account credential creation: No-Go
- Production admin_memo rollout: No-Go
- Firebase Hosting /api rewrite: No-Go
- Status/buyer/product/price/quote writes: No-Go

## Inputs Reviewed

- docs/ADMIN_PRODUCTION_INFRA_DECISION.md
- docs/ADMIN_PRODUCTION_BACKEND_RUNTIME_PLAN.md
- docs/ADMIN_PRODUCTION_DB_MIGRATION_PLAN.md
- docs/ADMIN_PRODUCTION_SECRET_MANAGER_PLAN.md
- docs/ADMIN_MEMO_PRODUCTION_READINESS_GATE.md
- docs/ADMIN_WRITE_API_CONTRACT.md
- docs/ADMIN_WRITE_SAFETY_GATES.md
- docs/BACKEND_API_BOUNDARY.md
- docs/BACKEND_IMPLEMENTATION_READINESS.md
- backend/src/auth/requireAdmin.js

## Admin Auth Architecture

Future production flow:

1. Admin signs in through approved Firebase Auth flow.
2. Frontend obtains Firebase ID token.
3. Frontend sends:
   - Authorization: Bearer <Firebase ID token>
4. Backend verifies ID token server-side.
5. Backend reads decoded uid.
6. Backend loads user from PostgreSQL users.auth_uid.
7. Backend requires:
   - users.role = admin
   - users.status = approved
8. Backend attaches admin viewer context.
9. Admin write proceeds only through backend transaction/audit path.

Important:

- frontend viewerState is not trusted.
- frontend role labels are not trusted.
- no public admin signup.
- no direct React-to-PostgreSQL write.
- no DB secret in frontend.

Current status:

- mock/injected requireAdmin exists
- production Firebase Auth verification not implemented

## Firebase ID Token Verification Plan

Future backend behavior:

- Read Authorization header.
- Require Bearer token.
- Verify token using Firebase Admin SDK or approved runtime verifier.
- Reject missing, invalid, expired, malformed, or revoked tokens.
- Extract uid from decoded token.
- Do not trust email alone as admin identity.
- Do not accept role/status from client body/localStorage.

Failure handling:

- missing token -> UNAUTHORIZED
- invalid token -> UNAUTHORIZED
- expired token -> UNAUTHORIZED
- revoked token -> UNAUTHORIZED if revocation check is enabled
- decoded uid missing -> UNAUTHORIZED
- backend verifier unavailable -> INTERNAL_ERROR with safe message

Current status:

- planning only
- no Firebase Admin SDK dependency added in 32J-5
- no token verification enabled

No-Go:

- do not install Firebase Admin SDK in 32J-5
- do not verify real Firebase tokens in 32J-5

## PostgreSQL Admin Mapping Plan

Required table mapping:

- users.auth_uid maps to decoded Firebase uid
- users.role must be admin
- users.status must be approved

Authorization result:

- uid not found in users -> FORBIDDEN
- users.role != admin -> FORBIDDEN
- users.status pending -> FORBIDDEN
- users.status blocked -> FORBIDDEN
- users.status approved and role admin -> allowed

Rules:

- email may be displayed or audited but must not be the only authorization key
- auth_uid is primary identity mapping
- no admin role from frontend
- no public admin self-approval
- no localStorage admin override

Current status:

- schema has users.auth_uid
- production auth lookup not connected

## Admin Viewer Context

Future backend context candidate:

```json
{
  "userId": "postgres-user-id",
  "authUid": "firebase-uid",
  "email": "admin@example.com",
  "role": "admin",
  "status": "approved",
  "requestId": "...",
  "ipAddress": "...",
  "userAgent": "..."
}
```

Rules:

- context created only after backend auth verification
- requestId required
- actor_user_id for audit_logs comes from PostgreSQL users.id
- actor_role must be admin
- ip_address and user_agent may be recorded for audit_logs
- raw token must never be logged

Current status:

- mock context exists in tests
- production context not implemented

## Firebase Admin Runtime Credential Strategy

Recommended direction:

- Use runtime-managed credentials where possible.
- Avoid service account JSON files in repo.
- Avoid GOOGLE_APPLICATION_CREDENTIALS file committed to project.
- If local/staging credential is required, keep it outside repo and never document value/path containing secrets.
- Production runtime service account should have least privilege.

Required before implementation:

- decide Firebase Admin SDK initialization mode
- decide project id config
- decide runtime service account
- decide local/staging credential handling
- no credential JSON in GitHub/docs/chat
- no credential JSON in frontend

Current status:

- planning only
- no credential created
- no service account JSON used
- no Firebase Admin SDK initialized

No-Go:

- do not create/download service account JSON in 32J-5
- do not add GOOGLE_APPLICATION_CREDENTIALS to repo/docs
- do not add Firebase Admin SDK dependency in 32J-5

## Frontend Auth Boundary

Future frontend may:

- start Firebase Auth sign-in flow
- obtain ID token
- send Authorization header to backend
- handle UNAUTHORIZED/FORBIDDEN safely

Frontend must not:

- decide admin authorization
- store admin role as source of truth
- send role/status as trusted body fields
- write directly to PostgreSQL
- contain DATABASE_URL
- contain Firebase Admin credential
- contain service account secret
- contain SUPABASE_SERVICE_ROLE_KEY

Current status:

- frontend admin integration not implemented
- production frontend does not call admin API

## Admin Bootstrap Boundary

Admin bootstrap is required before production admin auth can succeed.

Required:

- controlled creation of first admin user
- users.auth_uid set to Firebase uid
- users.role = admin
- users.status = approved
- owner/reviewer recorded
- disable/rollback path documented
- no public admin signup

Allowed future approaches:

- controlled manual DB insertion during migration
- controlled one-time local/staging script
- protected internal bootstrap route only if separately approved later

Current status:

- bootstrap not implemented
- no admin user created in 32J-5

No-Go:

- do not create bootstrap script in 32J-5
- do not create admin account in 32J-5
- do not add public admin signup

## Auth Error Contract

Common errors:

- UNAUTHORIZED
- FORBIDDEN
- INTERNAL_ERROR

Error shape:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "requestId": "..."
  }
}
```

Rules:

- missing/invalid/expired token -> UNAUTHORIZED
- verified token but no admin user -> FORBIDDEN
- non-admin or blocked/pending admin -> FORBIDDEN
- internal verifier failure -> INTERNAL_ERROR safe message
- never expose raw token
- never expose Firebase internal stack trace
- never expose DB raw error
- always preserve requestId

Current status:

- contract planning only

## Auth QA Plan

Required before production admin_memo rollout:

- missing token -> UNAUTHORIZED
- malformed Authorization header -> UNAUTHORIZED
- invalid token -> UNAUTHORIZED
- expired token -> UNAUTHORIZED
- revoked token behavior decided
- token with uid not found in users -> FORBIDDEN
- buyer role token -> FORBIDDEN
- pending admin -> FORBIDDEN
- blocked admin -> FORBIDDEN
- approved admin -> allowed
- requestId appears in all failures
- no raw token/log leak
- audit actor_user_id comes from users.id

Current status:

- planning only
- not executed

## Token / Session Lifecycle

Future considerations:

- ID token refresh handled by frontend Firebase client
- backend verifies each request
- optional revocation check policy must be decided
- admin logout should clear frontend session
- token lifetime does not replace backend role/status check
- blocked admin should lose access once backend users.status is blocked

Current status:

- planning only
- no implementation

## Dependency / Package Plan

Future possible dependency:

- firebase-admin or approved verifier library

Required before adding:

- backend/package.json change approved
- package lock impact reviewed
- local tests updated
- no frontend package needed for backend verification
- no service account JSON committed

Current status:

- no dependency added in 32J-5

No-Go:

- do not modify backend/package.json in 32J-5
- do not modify root package.json in 32J-5

## Decision Matrix

| Gate | Recommended Direction | Current Status | 32J-5 Judgment |
| --- | --- | --- | --- |
| ID token verification | Firebase Admin SDK/runtime verifier | Not implemented | Plan only |
| users.auth_uid mapping | Required | Schema exists | Plan only |
| admin role check | users.role = admin | Not connected | Plan only |
| admin status check | users.status = approved | Not connected | Plan only |
| frontend viewerState | Not trusted | Mock-only exists | Keep blocked |
| service account credential | Runtime-managed/least privilege | Not created | Plan only |
| admin bootstrap | Controlled/manual plan | Not implemented | No-Go |
| production admin_memo write | Requires Auth gate | Blocked | No-Go |

## Recommended Next Phases

### 32J-6

Admin bootstrap plan:

- controlled first admin
- auth_uid mapping
- disable/rollback
- no public signup

### 32J-7

Staging or production-like admin_memo dry-run plan:

- staging DB
- staging secret
- auth strategy
- safe sample data

### 32J-8

Firebase Hosting /api rewrite plan:

- target check
- backend URL
- rollback

### 32J-9

Production rollout checklist:

- runtime
- DB
- secret
- auth
- bootstrap
- rewrite
- QA
- rollback

Important:

- Do not implement Firebase Auth before admin bootstrap and runtime credential strategy are approved.
- Do not enable production admin_memo write before Auth/DB/Secret/Runtime gates are satisfied.

## 32J-6 Admin Bootstrap Plan Follow-up

- Admin bootstrap planning is documented in `docs/ADMIN_BOOTSTRAP_PLAN.md`.
- Bootstrap remains No-Go until the first admin creation path is reviewed and approved.
- No admin user, bootstrap script, protected endpoint, DB write, Firebase Auth integration, credential, rewrite, or deploy was created in 32J-6.
