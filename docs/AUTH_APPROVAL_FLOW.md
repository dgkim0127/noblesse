# Firebase Auth and Buyer Approval Flow

This document defines the version 1 preparation layer for future Firebase Auth and Firestore Buyer Approval.
The current website remains mock-first. Firebase services must be null-safe when environment variables are not configured.

## Purpose

- Firebase Auth will identify a signed-in Buyer or admin.
- Firestore `users/{uid}` will store Buyer Approval state and market conditions.
- The UI derives catalog access from the user profile, not from client-side form values.
- Version 1 keeps the mock preview state for local development and design review.

## `users/{uid}` Schema

```js
{
  uid: string,
  email: string,
  role: "buyer" | "admin",
  status: "pending" | "approved" | "blocked",
  companyName: string,
  contactName: string,
  country: string,
  preferredLanguage: "ko" | "en" | "ja" | "zh",
  assignedMarket: "KR" | "JP" | "US" | "GLOBAL",
  currency: "KRW" | "JPY" | "USD",
  phone: string,
  messengerType: string,
  messengerId: string,
  salesChannel: string,
  businessNumber: string,
  requestMemo: string,
  discountRate: number,
  minOrderAmount: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  approvedAt: timestamp | null,
  approvedBy: string | null
}
```

`guest` is not a Firestore role. It means there is no signed-in Firebase Auth user.

## Role, Status, and Viewer State

| Source | Values | Purpose |
| --- | --- | --- |
| `users.role` | `buyer`, `admin` | Stored permission class |
| `users.status` | `pending`, `approved`, `blocked` | Stored account review state |
| `viewerState` | `guest`, `pending`, `approved`, `admin`, optional `blocked` | Frontend rendering state |

Derivation:

- No Auth user: `guest`
- `role == "admin"`: `admin`
- `role == "buyer"` and `status == "pending"`: `pending`
- `role == "buyer"` and `status == "approved"`: `approved`
- `status == "blocked"`: `blocked`

## New Buyer Sign-Up Flow

1. Buyer enters email, password, company, contact, country, language, messenger, sales channel, business number, and memo.
2. Firebase Auth creates the account.
3. Firestore creates `users/{uid}` with:
   - `role: "buyer"`
   - `status: "pending"`
   - inferred `assignedMarket`
   - inferred `currency`
   - `discountRate: 0`
   - `minOrderAmount: 0`
4. Buyer lands on `/approval-pending`.
5. Approved Buyer Price, Inquiry List, and Request Quote stay locked until approval.

## Approval Pending Flow

Pending Buyers can browse the public catalog, but cannot view protected price records or use Inquiry features.
The page explains that Noblesse reviews company information and trade conditions before approval.

## Approved Price Access Flow

Approved Buyers can:

- view Approved Buyer Price for their assigned market
- add products to Inquiry List
- submit Request Quote
- view My Inquiries

The frontend may show estimated totals, but trusted server logic must recalculate protected values before persistence in a later phase.

## Admin Approval Scope

Admin approval tools are separated to Stage 14 or later.
This stage only prepares service functions and profile state handling.
No full admin management dashboard is introduced here.

Future admin approval should:

- verify `role == "admin"`
- update `users/{uid}.status`
- set `discountRate`, `minOrderAmount`, `assignedMarket`, and `currency`
- set `approvedAt` and `approvedBy`

## Blocked Account Behavior

Blocked profiles should not see Approved Buyer Price or use Inquiry features.
The UI should show account review guidance and a path back to the public catalog or Account page.

## Mock Fallback Behavior

If Firebase config is missing:

- `auth`, `db`, and `storage` exports remain `null`
- Auth and user services return mock-safe results
- the existing preview `viewerState` switch remains available
- local review can still test `guest`, `pending`, `approved`, and `admin`

## Security Notes

Production Firestore rules are not implemented in this stage.
They must be implemented from `docs/SECURITY_RULES_PLAN.md` before launch.

Required production protections:

- `guest` and `pending` cannot read `productPrices`
- only approved Buyers can read prices for their `assignedMarket`
- only approved Buyers can create their own Inquiry documents
- Buyers can read only their own Inquiry documents
- only admin users can approve, block, or change pricing conditions
