# Catalog MVP Locale Brand QA Report

## Scope

- 30D locale brand label correction and production QA.
- Production URL: `https://noblesse.web.app`
- Firebase Hosting target: `noblesse`
- Firebase project: `pors-piercing-pos`
- No backend/API/Auth/DB connection.
- No Firebase `/api` rewrite.
- No Firestore rules deploy.
- No Storage rules deploy.

## Change

Locale brand rule:

- KR: `귀족`
- EN: `Noblesse`
- JP: `貴族`
- CN: `贵族`

The visible header brand, compact header brand, Home H1, footer brand, and brand home accessibility label follow this rule.

## Build And Deploy

- Backend test: `npm.cmd test` in `backend` passed, 9 tests.
- Frontend build: `npm.cmd run build` passed.
- Deploy command used: `firebase.cmd deploy --only hosting:noblesse --project pors-piercing-pos`
- Deploy log target: `hosting[noblesse]`
- Hosting URL: `https://noblesse.web.app`

## Production Routes Checked

- `/kr`
- `/en`
- `/jp`
- `/cn`

## Production Results

### KR

- Header brand: `귀족`
- Compact brand: `귀족`
- Home H1: `귀족`
- Footer brand: `귀족`
- Brand home aria label: `귀족 home`
- Result: Go

### EN

- Header brand: `Noblesse`
- Compact brand: `Noblesse`
- Home H1: `Noblesse`
- Footer brand: `Noblesse`
- Brand home aria label: `Noblesse home`
- Result: Go

### JP

- Header brand: `貴族`
- Compact brand: `貴族`
- Home H1: `貴族`
- Footer brand: `貴族`
- Brand home aria label: `貴族 home`
- Result: Go

### CN

- Header brand: `贵族`
- Compact brand: `贵族`
- Home H1: `贵族`
- Footer brand: `贵族`
- Brand home aria label: `贵族 home`
- Result: Go

## Safety Confirmation

- POS/default Hosting site touched: No.
- Temporary Noblesse site touched or deleted: No.
- Firestore rules deployed: No.
- Storage rules deployed: No.
- Firebase `/api` rewrite added: No.
- Backend/API/Auth/DB automation added: No.
- SQL executed: No.

## Go / No-Go

- Locale brand production QA: Go
