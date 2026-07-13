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

## Global quote workflow

- Vite + React + React Router
- Supabase Auth and Postgres support for buyer profiles, catalog prices, quote requests, quotes, and status history
- Buyer states: `guest`, `pending`, `approved`, `admin`
- Approved Buyer Price and MOQ visible only after Buyer Approval
- Inquiry List and Request Quote available only to approved buyers
- Buyers can review a published quotation, download a PDF, and accept or decline it on the site
- Buyer acceptance records an administrator follow-up request only; it does not create an order or a payment
- Admins can review requests, set item pricing and terms, then publish an official quotation
- Responsive product grid: desktop 4 columns, tablet 3 columns, mobile 2 columns
- Route-level code splitting keeps account, quote administration, Supabase, and PDF code out of the initial storefront bundle

Firebase Hosting continues to serve the frontend. Supabase is the data and
identity service for the quote workflow. The application remains a B2B catalog:
there is no checkout, payment, order confirmation, or inventory deduction flow.

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

## Configure Supabase and Firebase Hosting

Follow [the quote workflow setup guide](./docs/GLOBAL_QUOTE_WORKFLOW_SETUP.md)
before deploying. It covers the database migration, the two public Vite
environment variables, initial catalog and market-price data, and the
administrator profile setup. Do not place service-role keys in frontend
environment variables.
