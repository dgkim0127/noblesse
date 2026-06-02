# Firebase Security Rules Plan

This document defines the future Firestore and Storage access model for Noblesse Piercing.
Version 1 remains mock-only. Do not deploy production rules or connect Firebase yet.

## User States

| State | Meaning |
| --- | --- |
| `guest` | Visitor with no authenticated Firebase user |
| `pending` | Signed-in profile where `role == "buyer"` and `status == "pending"` |
| `approved` | Signed-in profile where `role == "buyer"` and `status == "approved"` |
| `admin` | Internal operator where `users/{uid}.role == "admin"` |

Persisted user documents use `role: "buyer" | "admin"` and `status: "pending" | "approved" | "blocked"`.
The `guest` state exists only when no authenticated Buyer document is available.
Firestore market values and `users.assignedMarket` use uppercase enum values: `KR`, `JP`, `US`, and `GLOBAL`.
Storage folder segments remain lowercase paths such as `/catalogs/jp/**` and `/catalogs/us/**`.

## Firestore Access Table

| Collection | `guest` | `pending` | `approved` | `admin` |
| --- | --- | --- | --- | --- |
| `products` | Read visible | Read visible | Read visible | Read/write all |
| `categories` | Read visible | Read visible | Read visible | Read/write all |
| `collections` | Read visible | Read visible | Read visible | Read/write all |
| `banners` | Read visible | Read visible | Read visible | Read/write all |
| `catalogFiles` | Read public price-free files | Read public price-free files | Read public and matching market files | Read/write all |
| `productPrices` | Denied | Denied | Read active matching market | Read/write all |
| `users` | Denied | Read own | Read and safe-update own | Read/write all |
| `inquiries` | Denied | Denied | Create and read own | Read/write all |

## State Requirements

### `guest`

- Has no authenticated Firebase user.
- May read visible `products`, `categories`, `collections`, and `banners`.
- May read public `catalogFiles` only.
- Must not read `productPrices` or create Inquiries.

### `pending`

- Has `users/{uid}.role == "buyer"` and `users/{uid}.status == "pending"`.
- May read visible public catalog content and their own user document.
- Must not read `productPrices` or create Inquiries.

### `approved`

- Has `users/{uid}.role == "buyer"` and `users/{uid}.status == "approved"`.
- May read active `productPrices` only when the price market matches `users/{uid}.assignedMarket`.
- May read and create only their own Inquiries.

### `admin`

- Has `users/{uid}.role == "admin"`.
- May manage all catalog, user, price, Inquiry, and Storage resources.

## Required Protections

- UI hiding is not price security. Rules must deny `productPrices` reads for `guest` and `pending`.
- Approved Buyers may read prices only when `productPrices.market` matches `users/{uid}.assignedMarket`.
- An Inquiry must use `buyerId == request.auth.uid`.
- Buyers may not modify pricing snapshots, totals, workflow status, or `adminMemo`.
- Price, discount, MOQ, and totals must be recalculated by trusted server logic before persistence.
- Price-included PDF catalogs must never be publicly readable.

## Firestore Pseudo Rules

This is an implementation-oriented draft, not deployable rules code.

```js
function signedIn() {
  return request.auth != null;
}

function currentUser() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}

function isAdmin() {
  return signedIn() && currentUser().role == "admin";
}

function isApprovedBuyer() {
  return signedIn()
    && currentUser().role == "buyer"
    && currentUser().status == "approved";
}

match /products/{productId} {
  allow read: if resource.data.isVisible == true || isAdmin();
  allow write: if isAdmin();
}

match /categories/{id}, /collections/{id}, /banners/{id} {
  allow read: if resource.data.isVisible == true || isAdmin();
  allow write: if isAdmin();
}

match /productPrices/{priceId} {
  allow read: if isAdmin()
    || (isApprovedBuyer()
      && resource.data.isActive == true
      && resource.data.market == currentUser().assignedMarket);
  allow write: if isAdmin();
}

match /users/{uid} {
  allow read: if isAdmin() || (signedIn() && request.auth.uid == uid);
  allow update: if isAdmin()
    || (signedIn()
      && request.auth.uid == uid
      && onlySafeProfileFieldsChanged());
}

match /inquiries/{inquiryId} {
  allow create: if isApprovedBuyer()
    && request.resource.data.buyerId == request.auth.uid
    && createdByTrustedRequestQuoteFlow();
  allow read: if isAdmin()
    || (isApprovedBuyer() && resource.data.buyerId == request.auth.uid);
  allow update: if isAdmin();
}

match /catalogFiles/{fileId} {
  allow read: if isAdmin()
    || (resource.data.priceIncluded == false && resource.data.visibleTo == "public")
    || (isApprovedBuyer()
      && resource.data.visibleTo == "approved_only"
      && resource.data.market == currentUser().assignedMarket);
  allow write: if isAdmin();
}
```

`onlySafeProfileFieldsChanged()` and `createdByTrustedRequestQuoteFlow()` are placeholders for a future rules and server implementation.

## Storage Access Table

| Path | `guest` | `pending` | `approved` | `admin` |
| --- | --- | --- | --- | --- |
| `/products/**` display WebP | Read | Read | Read | Read/write |
| `/products/**/original/**` | Denied | Denied | Denied | Read/write |
| `/banners/**`, `/categories/**`, `/collections/**` | Read | Read | Read | Read/write |
| `/catalogs/public/**` | Read | Read | Read | Read/write |
| `/catalogs/jp/**` | Denied | Denied | Matching JP Buyer | Read/write |
| `/catalogs/us/**` | Denied | Denied | Matching US Buyer | Read/write |

## Storage Pseudo Rules

```js
match /products/{productId}/{variant}/{fileName} {
  allow read: if variant != "original" || isAdmin();
  allow write: if isAdmin();
}

match /banners/{allPaths=**},
      /categories/{allPaths=**},
      /collections/{allPaths=**} {
  allow read: if true;
  allow write: if isAdmin();
}

match /catalogs/public/{fileName} {
  allow read: if true;
  allow write: if isAdmin();
}

match /catalogs/{market}/{fileName} {
  allow read: if isAdmin()
    || (isApprovedBuyer() && currentUser().assignedMarket.lower() == market);
  allow write: if isAdmin();
}
```

The Storage pseudo rule lowercases the uppercase Firestore `assignedMarket` only to match the required lowercase Storage folder segments.

## Future Firebase Phase Checklist

- Implement trusted Request Quote creation, then persist validated Inquiry snapshots.
- Add Firebase Emulator tests before deployment.
- Verify denied price reads for `guest` and `pending`.
- Verify assigned-market isolation for approved Buyers.
- Verify that Buyers cannot modify protected user fields.
- Verify that Buyers cannot alter Inquiry status, totals, or price snapshots.
- Verify that price-included PDFs cannot be downloaded publicly.
