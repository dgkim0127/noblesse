# Agreements Plan

This document defines the first-version agreement and consent structure for the Noblesse Piercing Buyer Access Request flow.

Version 1 is mock-first. The current website does not connect to Firebase Auth, Supabase Auth, or a production database for agreement persistence.

## Why Agreements Are Needed

Buyer Access Request collects company and contact information before a Buyer can access Approved Buyer Price and Request Quote features.

The website therefore needs a clear consent checkpoint for:

- service usage terms
- privacy collection and use
- optional marketing and new arrival updates

The current text is placeholder copy. Final operating terms and privacy policy must be reviewed by the business owner and legal/privacy reviewer before launch.

## Required And Optional Consent

Required:

- Terms of Service
- Privacy Collection and Use

Optional:

- Marketing and New Arrival Updates

Buyer Access Request must be blocked when required consent is missing. Optional marketing consent must not block Buyer Access Request.

## RegisterPage UI Structure

`RegisterPage` shows an Agreements section before the final submit action.

The section includes:

- Agree to all
- [Required] Terms of Service
- [Required] Privacy Collection and Use
- [Optional] Marketing and New Arrival Updates
- details/summary placeholders for each notice
- a disabled Request Buyer Access button until required consent is accepted

The legal text is intentionally compact so the registration form does not feel like a heavy legal document.

## Agreement Versioning

Agreement text should be versioned because Buyers may apply under different versions over time.

Current frontend helper versions:

- `termsOfService`: `terms-v1.0`
- `privacyCollectionUse`: `privacy-v1.0`
- `marketingUpdates`: `marketing-v1.0`

Future database keys:

- `terms_of_service`
- `privacy_collection_use`
- `marketing_updates`

## `buyer_agreements` Purpose

Future production storage should record:

- Buyer ID
- agreement key
- agreement version
- required flag
- accepted flag
- accepted timestamp
- related terms version ID
- server-side IP address if legally required
- server-side user agent if legally required

Historical consent records should not be overwritten when terms change.

## Privacy Collection And Use Items

Purpose:

- Buyer access review
- company verification
- contact
- market assignment
- Request Quote processing

Collected items:

- email
- password
- company name
- contact name
- country
- preferred language
- phone
- messenger type
- messenger ID
- sales channel
- business number
- request memo

Retention:

- retained while the Buyer account is active
- retained as required for business or legal record keeping

Right to refuse:

- Buyers may refuse consent
- Buyer Access Request cannot be processed without required information

## Marketing Consent

Marketing and new arrival updates are optional.

Purpose:

- new product notices
- catalog updates
- collection updates
- event notices
- Buyer update notices

Channels:

- email
- messenger
- other submitted contact channels

Refusing marketing consent must not block Buyer Access Request.

## Production Handling

Actual persistence should be handled by a trusted API/RPC, not direct browser database writes.

The trusted layer should:

- load active required agreement versions
- verify that required consent is accepted
- create the Buyer application or Buyer profile
- store agreement snapshots in one controlled flow
- record IP address and user agent only if the final privacy policy allows it

Browser values are display/input values only and must be validated again server-side.

## Excluded From Version 1

Version 1 does not add:

- real Firebase Auth
- real Supabase Auth
- production database writes
- PostgreSQL direct connection code
- Supabase `createClient`
- service role keys
- `DATABASE_URL`
- direct settlement or direct purchase features
