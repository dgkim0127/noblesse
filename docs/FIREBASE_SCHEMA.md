# Firebase Firestore Schema

This document defines the future Firestore schema for the Noblesse B2B piercing catalog website.
Version 1 must use mock data with the same field names before any live Firebase connection is added.

## General Conventions

- Store timestamps as Firestore `Timestamp`.
- Store money as integer minor-free amounts in the document currency, such as `1200` for JPY 1,200.
- Store image URLs only. Image binary files belong in Firebase Storage.
- Use `guest`, `pending`, `approved`, and `admin` as the supported user states.
- Keep public product metadata separate from protected Buyer pricing.

## `users`

### Purpose

Stores Buyer profiles, Buyer Approval state, assigned market, currency, and account-specific pricing conditions.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `uid` | `string` | Firebase Authentication UID |
| `email` | `string` | Buyer login email |
| `companyName` | `string` | Buyer company name |
| `contactName` | `string` | Primary contact person |
| `country` | `string` | Buyer country code, such as `JP` |
| `preferredLanguage` | `string` | UI and communication language, such as `ja` |
| `phone` | `string` | Contact phone number |
| `messengerType` | `string` | Preferred messenger, such as `LINE` or `WhatsApp` |
| `messengerId` | `string` | Messenger account identifier |
| `salesChannel` | `string` | Buyer sales channel, such as `online_store` |
| `businessNumber` | `string` | Business registration or tax identifier |
| `role` | `string` | Account role: `guest`, `pending`, `approved`, or `admin` |
| `status` | `string` | Operational account status: `pending`, `approved`, or `blocked` |
| `assignedMarket` | `string` | Pricing market, such as `jp` or `us` |
| `currency` | `string` | Buyer currency, such as `JPY` or `USD` |
| `discountRate` | `number` | Buyer-specific discount percentage |
| `minOrderAmount` | `number` | Minimum Request Quote amount |
| `createdAt` | `timestamp` | Profile creation time |
| `updatedAt` | `timestamp` | Latest profile update time |
| `approvedAt` | `timestamp \| null` | Buyer Approval time |
| `approvedBy` | `string \| null` | Admin UID that approved the Buyer |

### Example Document

```js
users/{uid}
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
  role: "approved",
  status: "approved",
  assignedMarket: "jp",
  currency: "JPY",
  discountRate: 12,
  minOrderAmount: 30000,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  approvedAt: Timestamp,
  approvedBy: "admin_001"
}
```

### Permission Considerations

- A Buyer may read their own profile.
- A Buyer must not change `role`, `status`, `assignedMarket`, `discountRate`, `minOrderAmount`, `approvedAt`, or `approvedBy`.
- Only `admin` may list all users or change Buyer Approval fields.

## `products`

### Purpose

Stores public product metadata for catalog browsing. It does not contain protected Buyer pricing.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `productId` | `string` | Stable product identifier |
| `code` | `string` | Buyer-facing product code |
| `nameKo` | `string` | Korean product name |
| `nameEn` | `string` | English product name |
| `nameJa` | `string` | Japanese product name |
| `categoryId` | `string` | Primary category ID |
| `collectionIds` | `string[]` | Editorial collection IDs |
| `material` | `string` | Main material |
| `colors` | `string[]` | Available color labels |
| `sizes` | `string[]` | Available size labels |
| `moqDefault` | `number` | Default MOQ used for catalog guidance |
| `leadTime` | `string` | Typical lead time label |
| `origin` | `string` | Country of origin |
| `imageSet` | `map` | Storage or CDN URLs for `thumb`, `card`, `detail`, and `zoom` |
| `imageAlt` | `map` | Localized image alternative text |
| `isVisible` | `boolean` | Public catalog visibility |
| `isExportAvailable` | `boolean` | Whether export inquiry is available |
| `isNew` | `boolean` | New product badge |
| `isBest` | `boolean` | Curated best product badge |
| `sortOrder` | `number` | Manual display order |
| `createdAt` | `timestamp` | Creation time |
| `updatedAt` | `timestamp` | Latest update time |

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
  colors: ["silver"],
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
  imageAlt: {
    ko: "실버 베이직 볼 바벨 피어싱",
    en: "Silver basic ball barbell piercing",
    ja: "シルバー ベーシック ボールバーベル"
  },
  isVisible: true,
  isExportAvailable: true,
  isNew: true,
  isBest: false,
  sortOrder: 10,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permission Considerations

- `guest`, `pending`, and `approved` may read documents where `isVisible == true`.
- Only `admin` may create, update, hide, or reorder products.
- Product documents must never contain protected wholesale prices.

## `productPrices`

### Purpose

Stores protected market-specific pricing and Inquiry conditions separately from public product metadata.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `productId` | `string` | Related product ID |
| `market` | `string` | Assigned market, such as `jp` |
| `currency` | `string` | Price currency |
| `wholesalePrice` | `number` | Base wholesale price before Buyer discount |
| `retailPrice` | `number` | Optional reference retail price |
| `moq` | `number` | Market-specific MOQ |
| `minOrderAmount` | `number` | Optional product-level minimum inquiry amount |
| `visibleTo` | `string[]` | Allowed roles, normally `["approved", "admin"]` |
| `isActive` | `boolean` | Whether the price record is active |
| `updatedAt` | `timestamp` | Latest price update time |

### Example Document

```js
productPrices/NB-001_jp
{
  productId: "NB-001",
  market: "jp",
  currency: "JPY",
  wholesalePrice: 1250,
  retailPrice: 3900,
  moq: 20,
  minOrderAmount: 0,
  visibleTo: ["approved", "admin"],
  isActive: true,
  updatedAt: Timestamp
}
```

### Permission Considerations

- `guest` and `pending` must not read this collection.
- `approved` may read only records matching their `assignedMarket`.
- Only `admin` may write price records.
- Approved Buyer Price is calculated from this base record and the Buyer's `discountRate`.

## `categories`

### Purpose

Stores catalog navigation categories and localized labels.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `categoryId` | `string` | Stable category ID |
| `nameKo` | `string` | Korean label |
| `nameEn` | `string` | English label |
| `nameJa` | `string` | Japanese label |
| `coverUrl` | `string` | Storage or CDN cover image URL |
| `isVisible` | `boolean` | Public visibility |
| `sortOrder` | `number` | Manual display order |
| `createdAt` | `timestamp` | Creation time |
| `updatedAt` | `timestamp` | Latest update time |

### Example Document

```js
categories/barbell
{
  categoryId: "barbell",
  nameKo: "바벨",
  nameEn: "Barbells",
  nameJa: "バーベル",
  coverUrl: "https://cdn.example.com/categories/barbell/cover.webp",
  isVisible: true,
  sortOrder: 10,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permission Considerations

- All visitors may read visible categories.
- Only `admin` may write categories.

## `collections`

### Purpose

Stores curated product groupings for premium catalog presentation, such as seasonal edits or material collections.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `collectionId` | `string` | Stable collection ID |
| `nameKo` | `string` | Korean title |
| `nameEn` | `string` | English title |
| `nameJa` | `string` | Japanese title |
| `description` | `map` | Localized editorial description |
| `coverUrl` | `string` | Storage or CDN cover image URL |
| `productIds` | `string[]` | Manually curated product IDs |
| `isVisible` | `boolean` | Public visibility |
| `sortOrder` | `number` | Manual display order |
| `createdAt` | `timestamp` | Creation time |
| `updatedAt` | `timestamp` | Latest update time |

### Example Document

```js
collections/daily-basics
{
  collectionId: "daily-basics",
  nameKo: "데일리 베이직",
  nameEn: "Daily Basics",
  nameJa: "デイリーベーシック",
  description: {
    ko: "매일 활용하기 좋은 기본 피어싱",
    en: "Essential piercing styles for daily wear",
    ja: "毎日使いやすいベーシックピアス"
  },
  coverUrl: "https://cdn.example.com/collections/daily-basics/cover.webp",
  productIds: ["NB-001"],
  isVisible: true,
  sortOrder: 10,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permission Considerations

- All visitors may read visible collections.
- Only `admin` may write collections.

## `inquiries`

### Purpose

Stores Request Quote submissions as immutable Buyer-facing snapshots. Future price changes must not alter an existing Inquiry.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `inquiryId` | `string` | Stable Inquiry identifier |
| `buyerId` | `string` | Requesting Buyer UID |
| `buyerCompanyName` | `string` | Buyer company snapshot |
| `buyerCountry` | `string` | Buyer country snapshot |
| `buyerLanguage` | `string` | Buyer language snapshot |
| `currency` | `string` | Inquiry currency |
| `status` | `string` | `requested`, `checking`, `quoted`, `confirmed`, or `cancelled` |
| `items` | `map[]` | Product and price snapshots |
| `totalItems` | `number` | Number of distinct product rows |
| `totalQuantity` | `number` | Sum of requested quantities |
| `estimatedTotal` | `number` | Estimated total before final quote |
| `requestMemo` | `string` | Buyer memo |
| `adminMemo` | `string` | Internal admin memo |
| `createdAt` | `timestamp` | Submission time |
| `updatedAt` | `timestamp` | Latest update time |

Each `items` entry should contain:

| Field | Type | Description |
| --- | --- | --- |
| `productId` | `string` | Product ID snapshot |
| `productCode` | `string` | Product code snapshot |
| `productName` | `string` | Product name snapshot |
| `thumbnailUrl` | `string` | Thumbnail image URL snapshot |
| `material` | `string` | Material snapshot |
| `color` | `string` | Selected color snapshot |
| `size` | `string` | Selected size snapshot |
| `moq` | `number` | Applied MOQ |
| `quantity` | `number` | Requested quantity |
| `priceSnapshot` | `number` | Approved Buyer Price snapshot |
| `subtotal` | `number` | Estimated row subtotal |

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
  items: [
    {
      productId: "NB-001",
      productCode: "NB-001",
      productName: "Silver Basic Ball Barbell",
      thumbnailUrl: "https://cdn.example.com/products/NB-001/thumb/thumb.webp",
      material: "Surgical Steel",
      color: "Silver",
      size: "6mm",
      moq: 20,
      quantity: 40,
      priceSnapshot: 1100,
      subtotal: 44000
    }
  ],
  totalItems: 1,
  totalQuantity: 40,
  estimatedTotal: 44000,
  requestMemo: "Please confirm the available lead time.",
  adminMemo: "",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permission Considerations

- `guest` and `pending` cannot read or create inquiries.
- `approved` may create inquiries for their own `buyerId` and read only their own inquiries.
- Client input must not be trusted for price calculation. Future server-side validation should recalculate price, discount, MOQ, and totals.
- Only `admin` may update status or `adminMemo`.

## `banners`

### Purpose

Stores public website banner metadata and responsive image URLs.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `bannerId` | `string` | Stable banner ID |
| `title` | `map` | Localized title |
| `subtitle` | `map` | Localized supporting text |
| `desktopImageUrl` | `string` | Desktop banner URL |
| `mobileImageUrl` | `string` | Mobile banner URL |
| `linkUrl` | `string` | Internal website link |
| `isVisible` | `boolean` | Public visibility |
| `sortOrder` | `number` | Manual display order |
| `startsAt` | `timestamp \| null` | Optional publishing start |
| `endsAt` | `timestamp \| null` | Optional publishing end |
| `createdAt` | `timestamp` | Creation time |
| `updatedAt` | `timestamp` | Latest update time |

### Example Document

```js
banners/summer-edit
{
  bannerId: "summer-edit",
  title: { en: "Summer Piercing Edit", ja: "サマーピアスセレクション" },
  subtitle: { en: "Curated styles for global buyers", ja: "海外バイヤー向けセレクション" },
  desktopImageUrl: "https://cdn.example.com/banners/summer-edit/desktop.webp",
  mobileImageUrl: "https://cdn.example.com/banners/summer-edit/mobile.webp",
  linkUrl: "/collections/summer-edit",
  isVisible: true,
  sortOrder: 10,
  startsAt: null,
  endsAt: null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Permission Considerations

- All visitors may read visible banners.
- Only `admin` may write banners.

## `catalogFiles`

### Purpose

Stores downloadable public or market-specific PDF catalog metadata. PDF binary files remain in Firebase Storage.

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `catalogFileId` | `string` | Stable catalog file ID |
| `market` | `string` | `public`, `jp`, or `us` |
| `language` | `string` | Catalog language |
| `title` | `string` | Display title |
| `fileUrl` | `string` | Storage or CDN PDF URL |
| `isPublic` | `boolean` | Whether guests may download it |
| `visibleTo` | `string[]` | Allowed roles |
| `version` | `string` | Catalog release version |
| `updatedAt` | `timestamp` | Latest file update time |

### Example Document

```js
catalogFiles/noblesse-jp-catalog
{
  catalogFileId: "noblesse-jp-catalog",
  market: "jp",
  language: "ja",
  title: "Noblesse JP Buyer Catalog",
  fileUrl: "https://cdn.example.com/catalogs/jp/noblesse-jp-catalog.pdf",
  isPublic: false,
  visibleTo: ["approved", "admin"],
  version: "2026-06",
  updatedAt: Timestamp
}
```

### Permission Considerations

- Public catalogs may be read by all visitors.
- Market-specific catalogs may be read only by matching approved Buyers and `admin`.
- Only `admin` may write catalog metadata.
