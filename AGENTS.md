# Project Identity

This repository is for the Noblesse Piercing website.

Noblesse Piercing is a premium B2B piercing catalog website for global buyers.
It should look like a refined jewelry brand shopping site, but the business
flow must remain B2B.

This is not:

- a mobile app
- a POS system
- a shopping live platform
- a review-centered marketplace
- an instant checkout store

# Brand

Brand name:

- Noblesse Piercing

Korean name:

- 귀족 피어싱

Brand labels:

- 피어싱
- Piercing
- ピアス
- 冲孔

Colors:

- Main: `#ff8fa9`
- Secondary: `#2a234f`

Mood:

- noble but not heavy
- modern luxury
- image-centered piercing and jewelry brand
- premium but practical B2B catalog

# Core UX Flow

Use this flow:

```text
Entry
-> Hero / Event Banner
-> Recommended Products / Collections
-> Category or Search
-> Product Card
-> Product Detail
-> Inquiry List
-> Request Quote
-> My Inquiries
```

Do not use a direct purchase flow.

# Do Not Build

Do not implement:

- Shopping live
- Review-centered features
- Instant purchase
- Payment
- Buy Now
- Pay Now
- Checkout
- Coupon system
- Point system
- Real-time ranking
- Mobile app / APK / Capacitor structure

# Required Terminology

Use:

- Inquiry List
- Request Quote
- My Inquiries
- Quote Requested
- Buyer
- Buyer Approval
- Approved Buyer Price
- Price available after approval

Korean terms:

- 견적 리스트
- 견적 요청
- 내 견적 요청
- 승인 후 가격 확인 가능

Do not use in user-facing UI:

- Cart
- Checkout
- Buy Now
- Pay Now
- Payment
- 장바구니
- 주문/결제
- 구매하기
- 결제하기

# User States

Support these mock user states first:

- `guest`
- `pending`
- `approved`
- `admin`

Rules:

- `guest` can browse products but cannot see prices or request quotes.
- `pending` can browse products but sees approval waiting messages.
- `approved` can see prices, use Inquiry List, and submit Request Quote.
- `admin` will be handled later.

# Image and Data Policy

Do not store image binary data in Firestore.

Use this structure:

- Firestore stores product metadata and image URLs only.
- Firebase Storage stores actual image files.
- Firebase Hosting serves the website through CDN.
- Product images should be prepared as WebP files in multiple sizes.

Product image sizes:

- thumb: 300px WebP
- card: 600px WebP
- detail: 1200px WebP
- zoom: 1800px WebP

Product data should use:

```js
imageSet: {
  thumb: string,
  card: string,
  detail: string,
  zoom: string
}
```

Use `imageSet` by screen:

- Product Card: `imageSet.card`
- Product List: `imageSet.card`
- Product Detail: `imageSet.detail`
- Product Detail zoom or gallery: `imageSet.zoom`
- Inquiry List: `imageSet.thumb`
- My Inquiries: `imageSet.thumb`

# Layout Rule

For each page, consider and structure content by:

- Top
- Middle
- Bottom
- Left
- Right
- Image Area

# Common Header

The common header should include:

- left: Noblesse logo or elegant text logo fallback
- center: Noblesse Piercing brand name
- nearby labels: 피어싱 / Piercing / ピアス / 冲孔
- centered rounded search bar
- search icon inside the right side of the search bar
- right: Inquiry List icon
- login or my page link
- optional notification icon without emphasis

Search placeholder:

```text
피어싱, 소재, 스타일을 검색해보세요
```

# First Version Scope

Use mock data first.
Mock data must follow the same shape as the future Firestore schema.

Do not connect Firebase yet.
Do not add real authentication yet.
Do not add real payment.
Do not add an admin dashboard unless explicitly requested.

Prioritize:

1. Home
2. Product List
3. Product Detail
4. Inquiry List
5. Login / Sign Up

Then expand:

6. Search Results
7. Category
8. My Page / My Inquiries
9. Event / Collection
10. Language / Market Selection

# Pages

Core pages:

- Home
- Product List
- Product Detail
- Inquiry List
- Request Quote
- My Inquiries
- Inquiry Detail
- Login
- Register
- Account / Profile
- Search Results
- Category
- Events / Collections
- Language / Market Selection

# Route Direction

Use these routes:

- `/`
- `/products`
- `/products/:productId`
- `/search`
- `/categories`
- `/events`
- `/login`
- `/register`
- `/account`
- `/language`
- `/inquiry-list`
- `/request-quote`
- `/my-inquiries`
- `/my-inquiries/:inquiryId`

Do not create payment routes.

Redirect old routes if needed:

- `/cart` -> `/inquiry-list`
- `/order-request` -> `/request-quote`
- `/orders` -> `/my-inquiries`
- `/orders/:orderId` -> `/my-inquiries/:inquiryId`

# Design Direction

Style:

- Premium jewelry brand
- Clean B2B catalog
- White or ivory background
- Main color: `#ff8fa9`
- Secondary color: `#2a234f`
- Large product images
- Clear spacing
- Rounded premium buttons
- Soft card corners
- Subtle shadows only
- Mobile responsive layout

Responsive rules:

- Desktop: 4-column product grid
- Tablet: 3-column product grid
- Mobile: 2-column product grid
- Search bar must not break on mobile.
- Product detail stacks image -> info -> CTA on mobile.
- Inquiry List has a fixed bottom Request Quote CTA on mobile.

# Technical Direction

Use the current stack:

- Vite
- React
- React Router
- Firebase architecture documents for the future integration
- Existing `src` structure where possible

Prefer:

- plain CSS or CSS modules unless a framework already exists
- mock data under `src/data`
- reusable components under `src/components`
- pages under `src/pages`
- services under `src/services`

Avoid:

- recreating the project from scratch
- adding Capacitor or APK files
- adding payment dependencies
- adding unnecessary dependencies
- adding complex state libraries unless required

# Validation

Before finishing any task, check:

- `npm install` works
- `npm run dev` works
- `npm run build` works
- no payment or checkout wording appears in user-facing UI
- no app, APK, or Capacitor setup is introduced
- main pages are responsive
- user status UI differences are visible
- Inquiry List and Request Quote flow is clear
- `guest` and `pending` users cannot see approved buyer prices

Do not merge changes into `main` directly.
