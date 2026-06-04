# Noblesse

Noblesse is a responsive B2B piercing catalog website for global buyers.
The interface has the visual tone of a refined jewelry brand while keeping the
business flow focused on buyer approval and quote requests.

## Catalog flow

```text
Home
-> Product List
-> Product Detail
-> Inquiry List
-> Request Quote
-> My Inquiries
```

## First version

- Vite + React + React Router
- Mock buyer states: `guest`, `pending`, `approved`
- Mock catalog records shaped like the future Firestore documents
- Approved Buyer Price and MOQ visible only after Buyer Approval
- Inquiry List and Request Quote available only to approved buyers
- Responsive product grid: desktop 4 columns, tablet 3 columns, mobile 2 columns

Real Firebase services and authentication are intentionally deferred. The
planned data model, storage paths, and access policy are documented under
[`docs`](./docs).

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm run lint
npm run build
```
