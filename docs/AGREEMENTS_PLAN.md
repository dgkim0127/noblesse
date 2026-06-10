# Agreements Plan

This document defines the first-version agreement and consent structure for the Noblesse Piercing wholesale member sign-up request flow.

Version 1 is mock-first. The current website does not connect to Firebase Auth, Supabase Auth, or a production database for agreement persistence.

## Brand Naming Standard

- Korean brand name: 귀족
- English brand name: Noblesse Piercing
- 피어싱 is used as a category or service descriptor.
- Do not combine the Korean brand name with the category descriptor as the main Korean brand label.
- Korean agreement copy should prefer 도매 회원, 승인 도매 회원, 회원가, 견적 리스트, 견적 요청, and 견적 요청 내역 where natural.

## 1. Why Agreements Are Needed

Wholesale member sign-up request collects company and contact information before a member can access member prices and Request Quote features.

The website needs a clear consent checkpoint for:

- service usage terms
- B2B wholesale member and quote terms
- privacy collection and use
- optional marketing and new arrival updates
- privacy policy review

The agreement text in this repository is a first-version operating draft. Final operating terms and privacy policy must be reviewed by the business owner and legal/privacy reviewer before launch.

## 2. Agreement Documents

| Key | Version | Required | Register checkbox | Purpose |
| --- | --- | --- | --- | --- |
| `terms_of_service` | `terms-v1.0` | yes | yes | General site and service usage rules |
| `buyer_terms` | `buyer-terms-v1.0` | yes | yes | Wholesale member, member price, MOQ, Request Quote, and Admin Quote rules |
| `privacy_collection_use` | `privacy-v1.0` | yes | yes | Consent for collecting and using wholesale member sign-up request information |
| `marketing_updates` | `marketing-v1.0` | no | yes | Optional product, catalog, collection, and member update notices |
| `privacy_policy` | `privacy-policy-v1.0` | no | no | Full privacy policy reference document |

`privacy_policy` is available from RegisterPage as a full document link, but it is not a checkbox target in version 1.

## 3. Required And Optional Consent

Required:

- Terms of Service
- B2B wholesale member and Quote Terms
- Privacy Collection and Use

Optional:

- Marketing and New Arrival Updates

Wholesale member sign-up request must be blocked when any required consent is missing. Optional marketing consent must not block wholesale member sign-up request.

## 4. Terms Of Service Scope

The Terms of Service should cover:

- service purpose and definitions
- site, user, guest, wholesale member, approved wholesale member, admin, product, member price, Inquiry List, Request Quote, Admin Quote, and priceSnapshot
- service changes and suspension
- wholesale member sign-up request
- wholesale member approval and access rights
- product information and image limitations
- pricing access restrictions
- Inquiry List and Request Quote meaning
- Admin Quote as the final quote basis
- user obligations and prohibited behavior
- intellectual property
- privacy reference
- notices, disputes, governing law, and revision notice

Important operating rule:

- Request Quote is not a final transaction.
- Displayed price, subtotal, and estimatedTotal are references only.
- priceSnapshot is a request-time reference price.
- Final price, stock, lead time, shipping conditions, and export conditions are confirmed by Noblesse through Admin Quote or manager review.

## 5. B2B wholesale member And Quote Terms Scope

The B2B wholesale member terms should cover:

- wholesale member approval criteria
- submitted information accuracy
- country and market-specific pricing
- member price conditions
- MOQ variability
- price change possibility
- Request Quote nature
- priceSnapshot meaning
- Admin Quote
- final quote not completed at request submission
- availability, lead time, shipping, and export limits
- quote adjustment when MOQ or supply conditions do not match
- approval revocation and access limitation
- buyer responsibility for incorrect input
- misuse and account limits
- disputes and inquiries

Noblesse may show some price information only to approved wholesale members. Market prices can differ by assignedMarket and currency.

## 6. Privacy Collection And Use

Purpose:

- Wholesale member approval review
- company verification
- contact
- country and market assignment
- member price access
- Request Quote processing
- customer support
- dispute and record management
- misuse prevention

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
- business information
- request memo

Retention:

- until account withdrawal
- until buyer application withdrawal
- until processing purpose is fulfilled
- longer when required by law, dispute handling, transaction record retention, or misuse prevention

Right to refuse:

- Members may refuse consent.
- wholesale member sign-up request cannot be processed without required privacy consent.

## 7. Privacy Policy

The full privacy policy should be available separately from the required checkbox list.

It should include:

- processing purposes
- processed items
- collection methods
- retention and disposal
- third-party provision
- outsourcing
- overseas transfer
- user rights and request methods
- cookies and access logs
- security measures
- children under 14
- privacy officer
- remedies
- policy changes
- effective date

Current placeholder privacy officer:

- privacy officer: to be confirmed before operation
- email: `privacy@noblesse.example`

Items requiring final review:

- actual business information
- privacy officer name and contact
- outsourcing vendors
- overseas transfer countries and processors
- legal retention periods
- user rights request channel

## 8. Marketing Consent

Marketing consent is optional.

Purpose:

- new product notices
- catalog updates
- collection updates
- event notices
- member update notices
- market-specific product recommendations

Channels:

- email
- messenger
- phone
- other submitted contact channels

Refusing marketing consent must not block wholesale member sign-up request. Members should be able to withdraw marketing consent later.

## 9. RegisterPage UI

RegisterPage should show:

- Agree to all
- required Terms of Service
- required B2B wholesale member and Quote Terms
- required Privacy Collection and Use
- optional Marketing and New Arrival Updates
- Privacy Policy full document link
- disabled membership request button until all required items are accepted
- long agreement content inside a scrollable details area

The current version builds an agreement snapshot in memory only. It does not persist the snapshot.

## 10. Versioning

Agreement versions are defined in frontend content and should match database seed values.

Current versions:

- `terms_of_service`: `terms-v1.0`
- `buyer_terms`: `buyer-terms-v1.0`
- `privacy_collection_use`: `privacy-v1.0`
- `marketing_updates`: `marketing-v1.0`
- `privacy_policy`: `privacy-policy-v1.0`

When terms change, create a new version instead of mutating historical meaning.

## 11. Database Direction

Future production storage should use:

- `terms_versions`
- `buyer_agreements`

`terms_versions` stores active and historical agreement documents.

`buyer_agreements` stores:

- Buyer ID
- agreement key
- version
- required flag
- accepted flag
- accepted timestamp
- related terms version ID
- server-side IP address if legally allowed
- server-side user agent if legally allowed

Historical consent records should not be overwritten when terms change.

## 12. Trusted API/RPC Validation

Actual persistence should be handled by a trusted API/RPC, not direct browser database writes.

The trusted layer should:

- load active required agreement versions
- verify `terms_of_service`, `buyer_terms`, and `privacy_collection_use`
- record optional `marketing_updates` status
- create the wholesale member application or buyer profile
- store agreement snapshots in one controlled flow
- record IP address and user agent only if the final privacy policy allows it
- reject stale or missing required agreement versions

Browser values are display/input values only and must be validated again server-side.

## 13. Excluded From Version 1

Version 1 does not add:

- real Firebase Auth
- real Supabase Auth
- production database writes
- PostgreSQL direct connection code
- Supabase `createClient`
- service role keys
- database connection URL values
- direct online settlement features
