# User Type and Flow

This document defines the Buyer state flow and AI/automated assistance design for the Noblesse Piercing B2B catalog website.

Version 1 remains mock-first. Firebase connection, real authentication, admin dashboard, and AI execution are future phases unless explicitly requested.

## Core Product Flow

Noblesse Piercing is a premium B2B piercing catalog website for global buyers.

The customer-facing flow is:

```text
Home
-> Product List
-> Product Detail
-> Inquiry List
-> Request Quote
-> My Inquiries
```

The website should look like a refined jewelry brand catalog, but the business process must stay B2B.

## User States

Frontend mock UI uses `viewerState`.

| viewerState | Meaning | Price Access | Inquiry Access | Main CTA |
| --- | --- | --- | --- | --- |
| `guest` | Visitor without login | No | No | Request Buyer Access |
| `pending` | Buyer profile waiting for approval | No | No | Approval Pending |
| `approved` | Approved Buyer | Yes | Yes | Inquiry List / Request Quote |
| `admin` | Internal preview state | Admin preview only | Future phase | Admin scaffold |

Firestore user documents use a separate role/status model.

| Field | Values | Notes |
| --- | --- | --- |
| `role` | `buyer`, `admin` | `guest` is not a Firestore role |
| `status` | `pending`, `approved`, `blocked` | Buyer Approval lifecycle |
| `assignedMarket` | `KR`, `JP`, `US`, `GLOBAL` | Used for market-specific Buyer pricing |

## Buyer Access Rules

### Guest

- Can browse visible products and public catalog content.
- Cannot see Approved Buyer Price.
- Cannot use Inquiry List.
- Cannot submit Request Quote.
- Should see Request Buyer Access guidance.

### Pending

- Can browse visible products and public catalog content.
- Cannot see Approved Buyer Price.
- Cannot use Inquiry List.
- Cannot submit Request Quote.
- Should see Buyer Approval pending guidance.

### Approved

- Can see Approved Buyer Price for the assigned market.
- Can add products to Inquiry List.
- Can submit Request Quote.
- Can view My Inquiries.

### Admin

- Can preview internal account data in the mock UI.
- Full admin management screens are a later phase.
- Admin is responsible for reviewing AI/automated drafts before final publication.

## Request Quote Document Flow

Request Quote is not a final sale confirmation.

Recommended flow:

```text
Buyer selects products
-> Inquiry List
-> Request Quote document
-> Admin reviews availability, pricing, MOQ, VAT, lead time, and shipping conditions
-> Admin sends final quotation through the agreed channel
```

Client-side totals are for preview only. The future server-side process must recalculate final values from trusted data.

## AI/자동화 보조 기능 설계

AI and automation features are assistants, not decision makers.

### Role of AI

AI may help with:

- Draft generation
- Translation suggestions
- Category suggestions
- Tag suggestions
- Material and care guide draft text
- Buyer-facing summary draft text
- Internal admin memo draft text

AI must not be treated as a source of truth for commercial, legal, safety, or inventory decisions.

### Role of Admin

Admin must:

- Review AI-generated drafts.
- Edit or reject AI output.
- Confirm final product information.
- Save final approved content.
- Decide whether AI-generated fields are ready for Buyer-facing display.

AI-generated output must not be automatically saved as final product data.

### Role of System

The system, not AI, must calculate or validate:

- Approved Buyer Price
- Current inventory status
- MOQ
- Buyer discount rate
- VAT
- Market-specific currency
- Request Quote totals
- Export availability rules

AI may suggest copy, but the system must own calculations and validation.

## Product Admin AI Assistance Scope

In a future product registration or product edit screen, AI may generate drafts for:

- Product name
- Product description
- Wholesale Buyer description
- Korean, English, and Japanese translations
- Search tags
- Category candidates
- Collection candidates
- Material description
- Piercing care guide draft
- Export catalog summary

AI must not decide:

- Price
- Inventory status
- MOQ
- Buyer discount rate
- VAT
- Tax classification
- Final export availability
- Final safety claims

## User-Type Application Scope

| User Type | AI/Automation Exposure | Notes |
| --- | --- | --- |
| `guest` | None | Public content only; no AI draft exposure |
| `pending` | None | Buyer Approval required before protected content access |
| `approved` | Only admin-approved final content | Never expose unapproved AI drafts |
| `admin` | Draft generation and review tools | Admin edits and approves final content |

## AI Draft Visibility Rules

- AI-generated output is draft-only by default.
- AI-generated output must not be exposed to guest, pending, or approved Buyer screens before admin approval.
- Admin must explicitly approve AI-generated fields before they become public or Buyer-facing.
- AI output should be stored with clear draft metadata if persisted.
- Final Buyer-facing content should remain distinguishable from raw AI draft content.

## AI Generation History Fields

Future documents that use AI assistance may include:

```js
{
  aiGeneratedAt: Timestamp,
  aiGeneratedFields: string[],
  aiEditedByAdmin: boolean,
  aiApprovedByAdmin: boolean
}
```

### Field Meanings

| Field | Type | Meaning |
| --- | --- | --- |
| `aiGeneratedAt` | `timestamp \| null` | Last AI draft generation time |
| `aiGeneratedFields` | `string[]` | Field names generated or suggested by AI |
| `aiEditedByAdmin` | `boolean` | Whether admin edited AI output |
| `aiApprovedByAdmin` | `boolean` | Whether admin approved AI output for final use |

## Prohibited AI Claims

AI-generated content must not include:

- 알러지 완전 방지
- 무조건 안전
- 의학적 효과
- 치료 효과
- 100% 안전
- 부작용 없음

If AI suggests any of these claims, admin must reject or rewrite the output before saving.

## First Version Boundary

For the first version:

- Use mock data only.
- Do not connect real AI services.
- Do not add automatic content publishing.
- Do not add automatic price or MOQ decisions.
- Do not expose AI draft content to Buyer screens.
- Keep the live website focused on product browsing, Inquiry List, Request Quote, and My Inquiries.
