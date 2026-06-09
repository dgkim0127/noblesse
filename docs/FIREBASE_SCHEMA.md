# Firebase Firestore Schema

This document defines the future Firestore schema for the Noblesse Piercing B2B catalog website.
Version 1 remains mock-only. Live Firebase connection is intentionally deferred.

## General Conventions

- Store timestamps as Firestore `Timestamp`.
- Store money as integer amounts in the document currency.
- Store image URLs only. Image binary files belong in Firebase Storage.
- Keep public product metadata separate from protected Buyer pricing.
- Use uppercase markets: `KR`, `JP`, `US`, and `GLOBAL`.
- Use `KRW`, `JPY`, and `USD` currency codes.

## Architecture Note

Firestore-only is suitable for the MVP catalog and Request Quote workflow, especially while Noblesse remains mock-first and image-centered.

However, Noblesse is not only a public catalog. The long-term business needs include Buyer activity analytics, product performance reporting, market/category reporting, and requested-to-confirmed quote analysis. If those reporting needs become important, PostgreSQL/Supabase is recommended for core business data.

Production direction:

- Firestore schema is MVP/reference only.
- Production business data should move to PostgreSQL/Supabase.
- Firebase Hosting target `noblesse` is used only for web deployment.
- Do not mix the POS Hosting site and Noblesse Hosting site.
- Do not rely on Firestore-only analytics for long-term wholesale reporting.

Important pricing rules:

- Client-side price calculation must not be trusted.
- Client-side totals are display references only.
- `priceSnapshot` is not a final confirmed price.
- Trusted server logic must validate Buyer approval, market price, discount, MOQ, and totals before persistence.
- The final confirmed quote should be stored separately as `adminQuote`/`adminQuoteItems`, or moved into PostgreSQL tables such as `admin_quotes` and `admin_quote_items`.

## `users`

### Purpose

Stores Buyer profiles, Buyer Approval status, assigned market, and account pricing conditions.

### Document ID Rule

Use the Firebase Authentication UID: `users/{uid}`.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `uid` | `string` | Firebase Authentication UID |
| `email` | `string` | Buyer login email |
| `companyName` | `string` | Buyer company |
| `contactName` | `string` | Primary contact |
| `country` | `string` | Country code, such as `JP` |
| `preferredLanguage` | `string` | Language code, such as `ja` |
| `phone` | `string` | Contact phone |
| `messengerType` | `string` | Such as `LINE` or `WhatsApp` |
| `messengerId` | `string` | Messenger account |
| `salesChannel` | `string` | Such as `online_store` |
| `businessNumber` | `string` | Tax or business identifier |
| `role` | `string` | `buyer` or `admin` |
| `status` | `string` | `pending`, `approved`, or `blocked` |
| `assignedMarket` | `string` | `KR`, `JP`, `US`, or `GLOBAL` |
| `currency` | `string` | `KRW`, `JPY`, or `USD` |
| `discountRate` | `number` | Buyer discount percent |
| `minOrderAmount` | `number` | Minimum Request Quote amount |
| `createdAt` | `timestamp` | Created time |
| `updatedAt` | `timestamp` | Updated time |
| `approvedAt` | `timestamp \| null` | Buyer Approval time |
| `approvedBy` | `string \| null` | Approving admin UID |

### Example Document

```js
users/buyer_tokyo_001
{
  uid: "buyer_tokyo_001",
  email: "buyer@example.jp",
  companyName: "Tokyo Piercing Lab",
  contactName: "Yamada Haruka",
  country: "JP",
  preferredLanguage: "ja",
  phone: "+81-90-1234-5678",
  messengerType: "LINE",
  messengerId: "tokyo-piercing-lab",
  salesChannel: "online_store",
  businessNumber: "JP-123456789",
  role: "buyer",
  status: "approved",
  assignedMarket: "JP",
  currency: "JPY",
  discountRate: 12,
  minOrderAmount: 30000,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  approvedAt: Timestamp,
  approvedBy: "admin_001"
}
```

### Permissions

- A signed-in Buyer may read their own document and update safe contact fields only.
- Only `admin` may list users or change approval, market, discount, and minimum amount fields.

### Mock Mapping

`src/data/catalog.js` exports `mockUsers`. UI-only preview keys `guest`, `pending`, and `approved` represent future authentication states; persisted Buyer documents use `role: "buyer"` with an operational `status`.

## `products`

### Purpose

Stores public product metadata. It never contains protected Buyer pricing or image binaries.

### Document ID Rule

Use the stable product ID: `products/{productId}`, such as `products/NB-001`.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `productId` | `string` | Stable product ID |
| `code` | `string` | Buyer-facing product code |
| `nameKo`, `nameEn`, `nameJa` | `string` | Localized names |
| `categoryId` | `string` | Primary category ID |
| `collectionIds` | `string[]` | Curated collection IDs |
| `material` | `string` | Primary material |
| `colors` | `string[]` | Available colors |
| `sizes` | `string[]` | Available sizes |
| `moqDefault` | `number` | Public fallback MOQ guidance |
| `leadTime` | `string` | Typical lead time |
| `origin` | `string` | Origin country code |
| `imageSet` | `map` | `thumb`, `card`, `detail`, and `zoom` URLs |
| `imageAlt` | `map` | `ko`, `en`, and `ja` alternative text |
| `isVisible` | `boolean` | Public catalog visibility |
| `isExportAvailable` | `boolean` | Export inquiry availability |
| `isNew` | `boolean` | New badge |
| `isBest` | `boolean` | Curated best badge |
| `sortOrder` | `number` | Manual display order |
| `descriptionKo`, `descriptionEn`, `descriptionJa` | `string` | Localized description |
| `createdAt` | `timestamp` | Created time |
| `updatedAt` | `timestamp` | Updated time |

### Example Document

```js
products/NB-001
{
  productId: "NB-001",
  code: "NB-001",
  nameKo: "실버 베이직 볼 바벨",
  nameEn: "Silver Basic Ball Barbell",
  nameJa: "シルバー ベーシック ボールバーベル",
  categoryId: "barbell",
  collectionIds: ["daily-basics"],
  material: "Surgical Steel",
  colors: ["Silver"],
  sizes: ["6mm", "8mm"],
  moqDefault: 20,
  leadTime: "7-14 days",
  origin: "KR",
  imageSet: {
    thumb: "https://cdn.example.com/products/NB-001/thumb/thumb.webp",
    card: "https://cdn.example.com/products/NB-001/card/card.webp",
    detail: "https://cdn.example.com/products/NB-001/detail/detail.webp",
    zoom: "https://cdn.example.com/products/NB-001/zoom/zoom.webp"
  },
  imageAlt: { ko: "실버 볼 바벨", en: "Silver ball barbell", ja: "シルバーボールバーベル" },
  isVisible: true,
  isExportAvailable: true,
  isNew: true,
  isBest: true,
  sortOrder: 10,
  descriptionKo: "데일리 피어싱",
  descriptionEn: "A daily piercing essential.",
  descriptionJa: "デイリーピアス",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permissions

- Everyone may read documents where `isVisible == true`.
- Only `admin` may write products.

### Mock Mapping

`src/data/catalog.js` exports `mockProducts`. Version 1 already uses the same product and `imageSet` field names; localized descriptions may be added when Product Detail content is expanded.

## `productPrices`

### Purpose

Stores protected market-specific prices and Inquiry conditions separately from products.

### Document ID Rule

Use `{productId}_{market}`: `productPrices/NB-001_JP`.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `productId` | `string` | Related product |
| `market` | `string` | `KR`, `JP`, `US`, or `GLOBAL` |
| `currency` | `string` | `KRW`, `JPY`, or `USD` |
| `wholesalePrice` | `number` | Base wholesale price |
| `retailPrice` | `number` | Optional reference price |
| `moq` | `number` | Market MOQ |
| `minOrderAmount` | `number` | Optional product-level minimum |
| `visibleTo` | `string` | `approved_only` |
| `isActive` | `boolean` | Active price record |
| `updatedAt` | `timestamp` | Updated time |

### Example Document

```js
productPrices/NB-001_JP
{
  productId: "NB-001",
  market: "JP",
  currency: "JPY",
  wholesalePrice: 1250,
  retailPrice: 3900,
  moq: 20,
  minOrderAmount: 0,
  visibleTo: "approved_only",
  isActive: true,
  updatedAt: Timestamp
}
```

### Permissions

- `guest` and `pending` must never read prices.
- An approved Buyer may read active records for their assigned market only.
- Only `admin` may write prices.

### Mock Mapping

`src/data/catalog.js` exports `mockProductPrices` with uppercase markets and the `visibleTo: "approved_only"` representation used by this final schema.

## `categories`

### Purpose

Stores localized catalog navigation categories.

### Document ID Rule

Use the slug-like category ID: `categories/{categoryId}`.

### Fields

| Field | Type |
| --- | --- |
| `categoryId` | `string` |
| `nameKo`, `nameEn`, `nameJa` | `string` |
| `slug` | `string` |
| `coverUrl` | `string` |
| `isVisible` | `boolean` |
| `sortOrder` | `number` |
| `createdAt` | `timestamp` |
| `updatedAt` | `timestamp` |

### Example Document

```js
categories/barbell
{
  categoryId: "barbell",
  nameKo: "바벨",
  nameEn: "Barbells",
  nameJa: "バーベル",
  slug: "barbell",
  coverUrl: "https://cdn.example.com/categories/barbell/cover.webp",
  isVisible: true,
  sortOrder: 10,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permissions

- Everyone may read visible categories. Only `admin` may write.

### Mock Mapping

`src/data/catalog.js` exports `mockCategories`. Localized labels and image metadata remain a version 1 expansion point.

## `collections`

### Purpose

Stores curated product groupings for editorial catalog presentation.

### Document ID Rule

Use the collection slug: `collections/{collectionId}`.

### Fields

| Field | Type |
| --- | --- |
| `collectionId` | `string` |
| `titleKo`, `titleEn`, `titleJa` | `string` |
| `slug` | `string` |
| `coverUrl` | `string` |
| `productIds` | `string[]` |
| `isVisible` | `boolean` |
| `sortOrder` | `number` |
| `createdAt` | `timestamp` |
| `updatedAt` | `timestamp` |

### Example Document

```js
collections/daily-basics
{
  collectionId: "daily-basics",
  titleKo: "데일리 베이직",
  titleEn: "Daily Basics",
  titleJa: "デイリーベーシック",
  slug: "daily-basics",
  coverUrl: "https://cdn.example.com/collections/daily-basics/cover.webp",
  productIds: ["NB-001"],
  isVisible: true,
  sortOrder: 10,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permissions

- Everyone may read visible collections. Only `admin` may write.

### Mock Mapping

Version 1 product records already include `collectionIds`; a dedicated mock collection list is not yet required.

## `inquiries`

### Purpose

Stores Request Quote submissions as Buyer-facing snapshots. Future price changes must not alter existing Inquiries.

### Document ID Rule

Use the generated Inquiry number: `inquiries/{inquiryId}`, such as `inquiries/INQ-20260601-001`.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `inquiryId` | `string` | Inquiry number |
| `buyerId` | `string` | Buyer UID |
| `buyerCompanyName` | `string` | Company snapshot |
| `buyerCountry` | `string` | Country snapshot |
| `buyerLanguage` | `string` | Language snapshot |
| `currency` | `string` | Inquiry currency |
| `status` | `string` | `requested`, `checking`, `quoted`, `confirmed`, or `cancelled` |
| `items` | `map[]` | Item snapshots |
| `totalItems` | `number` | Distinct rows |
| `totalQuantity` | `number` | Requested units |
| `estimatedTotal` | `number` | Estimated value |
| `requestMemo` | `string` | Buyer memo |
| `adminMemo` | `string` | Internal memo |
| `createdAt` | `timestamp` | Created time |
| `updatedAt` | `timestamp` | Updated time |

Each `items` entry contains:

```js
{
  productId: string,
  productCode: string,
  productName: string,
  thumbnailUrl: string,
  material: string,
  color: string,
  size: string,
  quantity: number,
  moq: number,
  priceSnapshot: number,
  subtotal: number
}
```

### Example Document

```js
inquiries/INQ-20260601-001
{
  inquiryId: "INQ-20260601-001",
  buyerId: "buyer_tokyo_001",
  buyerCompanyName: "Tokyo Piercing Lab",
  buyerCountry: "JP",
  buyerLanguage: "ja",
  currency: "JPY",
  status: "requested",
  items: [{
    productId: "NB-001",
    productCode: "NB-001",
    productName: "Silver Basic Ball Barbell",
    thumbnailUrl: "https://cdn.example.com/products/NB-001/thumb/thumb.webp",
    material: "Surgical Steel",
    color: "Silver",
    size: "6mm",
    quantity: 40,
    moq: 20,
    priceSnapshot: 1100,
    subtotal: 44000
  }],
  totalItems: 1,
  totalQuantity: 40,
  estimatedTotal: 44000,
  requestMemo: "Please confirm lead time.",
  adminMemo: "",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permissions

- Only approved Buyers may create Inquiries for their own UID.
- Buyers may read their own Inquiries only.
- Only `admin` may update workflow status and `adminMemo`.
- Trusted server logic must recalculate prices, MOQ, discounts, and totals before persistence.

### Mock Mapping

`src/data/catalog.js` exports `mockInquiries`; `src/commerce/CommerceContext.jsx` builds the same snapshot shape in `submitRequestQuote`.

## `banners`

### Purpose

Stores public responsive banner metadata.

### Document ID Rule

Use a stable slug: `banners/{bannerId}`.

### Fields

| Field | Type |
| --- | --- |
| `bannerId` | `string` |
| `titleKo`, `titleEn`, `titleJa` | `string` |
| `subtitleKo`, `subtitleEn`, `subtitleJa` | `string` |
| `desktopImageUrl` | `string` |
| `mobileImageUrl` | `string` |
| `linkType` | `string` |
| `linkValue` | `string` |
| `isVisible` | `boolean` |
| `sortOrder` | `number` |
| `startsAt` | `timestamp \| null` |
| `endsAt` | `timestamp \| null` |
| `createdAt` | `timestamp` |
| `updatedAt` | `timestamp` |

### Example Document

```js
banners/summer-edit
{
  bannerId: "summer-edit",
  titleKo: "서머 피어싱",
  titleEn: "Summer Piercing Edit",
  titleJa: "サマーピアス",
  subtitleKo: "글로벌 바이어 셀렉션",
  subtitleEn: "Curated styles for global buyers",
  subtitleJa: "海外バイヤー向けセレクション",
  desktopImageUrl: "https://cdn.example.com/banners/summer-edit/desktop.webp",
  mobileImageUrl: "https://cdn.example.com/banners/summer-edit/mobile.webp",
  linkType: "collection",
  linkValue: "summer-edit",
  isVisible: true,
  sortOrder: 10,
  startsAt: null,
  endsAt: null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permissions

- Everyone may read visible banners. Only `admin` may write.

### Mock Mapping

No banner mock collection exists yet. Home banner content is static until editorial controls are introduced.

## `catalogFiles`

### Purpose

Stores downloadable PDF catalog metadata. PDF binaries remain in Storage.

### Document ID Rule

Use a stable file slug: `catalogFiles/{fileId}`.

### Fields

| Field | Type |
| --- | --- |
| `fileId` | `string` |
| `titleKo`, `titleEn`, `titleJa` | `string` |
| `fileUrl` | `string` |
| `market` | `string` | `KR`, `JP`, `US`, or `GLOBAL` |
| `priceIncluded` | `boolean` |
| `visibleTo` | `string` | `public` or `approved_only` |
| `uploadedAt` | `timestamp` |
| `version` | `string` | Catalog release version |

### Example Document

```js
catalogFiles/noblesse-jp-catalog
{
  fileId: "noblesse-jp-catalog",
  titleKo: "노블레스 일본 카탈로그",
  titleEn: "Noblesse JP Buyer Catalog",
  titleJa: "ノブレス日本カタログ",
  fileUrl: "https://cdn.example.com/catalogs/jp/noblesse-jp-catalog.pdf",
  market: "JP",
  priceIncluded: true,
  visibleTo: "approved_only",
  uploadedAt: Timestamp,
  version: "2026-06"
}
```

### Permissions

- Public catalogs without prices may be readable by everyone.
- Market catalogs and price-included PDFs require an approved Buyer in the matching market or `admin`.
- Only `admin` may write metadata.

### Mock Mapping

No PDF catalog mock collection exists yet. Add metadata mocks only when download UI is introduced.
