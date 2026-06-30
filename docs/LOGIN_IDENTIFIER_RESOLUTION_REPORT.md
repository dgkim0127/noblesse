# Login Identifier Resolution Report

## Scope

- Task: `N60-FX-OBSERVABILITY-AND-LOGIN-IDENTIFIER-FIX-1`
- Production login accepts full email or an app login identifier/email local-part.
- Passwords are sent only to Firebase Auth.
- The backend resolver receives only the identifier and returns only canonical email.
- Product catalog creation and `catalog.write` permissions remain unchanged.

## Backend Contract

- Endpoint: `POST /api/auth/resolve-login-identifier`
- Request body: `{ "identifier": "..." }`
- Success response: `{ "data": { "email": "..." }, "meta": { "requestId": "..." } }`
- Response header: `cache-control: no-store`
- The resolver rejects requests that include a password field.
- Unknown, duplicate, disabled, suspended, or non-login-eligible identifiers fail closed.
- The response does not include role, permissions, user ID, Firebase UID, buyer profile, or admin profile.

## Frontend Behavior

- Login label: `아이디 또는 이메일`
- Email input containing `@`: Firebase email/password sign-in path is unchanged.
- Identifier input without `@`: frontend calls the resolver first, then signs into Firebase with the returned canonical email.
- Resolver failures and Firebase credential failures map to the same generic login error.
- Raw `auth/invalid-email` is not shown to the user.

## Security Notes

- Password sent to resolver: No.
- Token or cookie extracted: No.
- Resolved email recorded in docs: No.
- Admin credential recorded in repo: No.
- Catalog permissions changed: No.
- Product created: No.

## Follow-up

- Rotate/change the previously exposed admin password.
- Complete the approved `catalog.write` permission workflow before product seed or product detail canary.
