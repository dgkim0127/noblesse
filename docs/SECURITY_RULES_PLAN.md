# Firebase Security Rules Plan

This document defines the intended future Firestore and Firebase Storage access model.
Version 1 uses mock data only. Do not connect Firebase or add production rules until explicitly requested.

## User States

| State | Meaning |
| --- | --- |
| `guest` | Visitor without Buyer Approval |
| `pending` | Registered Buyer waiting for approval |
| `approved` | Approved Buyer with an assigned market |
| `admin` | Internal Noblesse operator |

## Access Summary

| Capability | `guest` | `pending` | `approved` | `admin` |
| --- | --- | --- | --- | --- |
| Read visible product metadata | Allowed | Allowed | Allowed | Allowed |
| Read public product images | Allowed | Allowed | Allowed | Allowed |
| Read product prices | Denied | Denied | Own market only | Allowed |
| Use Inquiry List | Denied | Denied | Allowed | Allowed for support |
| Submit Request Quote | Denied | Denied | Allowed | Allowed for support |
| Read inquiries | Denied | Denied | Own inquiries only | Allowed |
| Update inquiry status | Denied | Denied | Denied | Allowed |
| Manage catalog content | Denied | Denied | Denied | Allowed |

## Firestore Rules Intent

### `users`

- A signed-in Buyer may read their own user document.
- A Buyer may update only safe profile fields such as contact details and preferred language.
- A Buyer must not change their own `role`, `status`, `assignedMarket`, `currency`, `discountRate`, `minOrderAmount`, `approvedAt`, or `approvedBy`.
- `admin` may read and update all user documents.

### `products`

- Everyone may read product documents where `isVisible == true`.
- Only `admin` may create, update, delete, hide, or reorder products.
- Public product documents must not contain protected wholesale prices.

### `productPrices`

- `guest` and `pending` access is denied.
- `approved` may read active price documents only when `productPrices.market == users/{uid}.assignedMarket`.
- `admin` may read and write all price documents.
- Buyer-specific discount calculation must be validated by trusted server logic before an Inquiry is stored.

### `categories`, `collections`, and `banners`

- Everyone may read visible documents.
- Only `admin` may write.

### `catalogFiles`

- Everyone may read documents where `isPublic == true`.
- `approved` may read non-public documents only when the catalog market matches their assigned market.
- `admin` may read and write all documents.

### `inquiries`

- `guest` and `pending` access is denied.
- `approved` may create an Inquiry only for their own `buyerId`.
- `approved` may read only documents where `buyerId == request.auth.uid`.
- `approved` must not update status, totals, pricing snapshots, or `adminMemo`.
- `admin` may read all inquiries and update operational fields such as status and `adminMemo`.
- Future server logic must recalculate Approved Buyer Price, MOQ, and totals instead of trusting client-submitted amounts.

## Firebase Storage Rules Intent

### Product Assets

```text
/products/{productId}/original/original.jpg
```

- Read: `admin` only
- Write: `admin` only

```text
/products/{productId}/thumb/thumb.webp
/products/{productId}/card/card.webp
/products/{productId}/detail/detail.webp
/products/{productId}/zoom/zoom.webp
```

- Read: public
- Write: `admin` only

### Public Editorial Assets

```text
/banners/{bannerId}/desktop.webp
/banners/{bannerId}/mobile.webp
/categories/{categoryId}/cover.webp
/collections/{collectionId}/cover.webp
```

- Read: public
- Write: `admin` only

### PDF Catalogs

```text
/catalogs/public/noblesse-public-catalog.pdf
```

- Read: public
- Write: `admin` only

```text
/catalogs/jp/noblesse-jp-catalog.pdf
/catalogs/us/noblesse-us-catalog.pdf
```

- Read: approved Buyers assigned to the matching market and `admin`
- Write: `admin` only

## Implementation Notes for a Future Firebase Phase

- Keep public product metadata separate from protected price documents.
- Use trusted server logic for Request Quote creation.
- Use mock data with these exact field names during version 1.
- Add Firebase Emulator tests before deploying rules.
- Verify denied reads for `guest` and `pending`.
- Verify market isolation for approved Buyers.
- Verify that non-admin users cannot alter price or Inquiry status fields.

