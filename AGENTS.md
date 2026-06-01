# Project identity

This repository is for the Noblesse website.

Noblesse is a B2B piercing catalog website for global buyers.
It is not a mobile app, POS app, shopping live service, review platform, or instant checkout store.

# Core product direction

Build a premium jewelry-style website that works as a wholesale buyer catalog.

The user flow should be:

Home
→ Product List
→ Product Detail
→ Inquiry List
→ Request Quote
→ My Inquiries

The website should look like a refined retail jewelry brand, but the business logic should stay B2B.

# Do not build

Do not implement:

- Shopping live
- Review-centered features
- Instant checkout
- Payment
- Buy Now
- Pay Now
- Checkout
- Coupon system
- Point system
- Real-time ranking
- Mobile app / APK / Capacitor structure

# Required terminology

Use these terms:

- Inquiry List
- Request Quote
- Buyer
- Buyer Approval
- Approved Buyer Price
- Price available after approval
- My Inquiries
- Quote Requested

Do not use:

- Cart
- Checkout
- Buy Now
- Pay Now

# User states

Support these mock user states first:

- guest
- pending
- approved
- admin

Rules:

- guest can browse products but cannot see prices or request quotes.
- pending can browse products but sees approval waiting messages.
- approved can see prices, use Inquiry List, and submit Request Quote.
- admin will be handled later.

# Image and data policy

Do not store image binary data in Firestore.

Use this structure:

- Firestore stores product metadata and image URLs only.
- Firebase Storage stores actual image files.
- Firebase Hosting serves the website through CDN.
- Product images should be prepared as WebP files in multiple sizes.

Image sizes:

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

# First version scope

Use mock data first.
However, mock data must follow the same shape as the future Firestore schema.

Do not connect Firebase yet.
Do not add real authentication yet.
Do not add real payment.
Do not add admin dashboard yet unless explicitly requested.

# Design direction

Style:

- Premium jewelry brand
- Clean B2B catalog
- White or ivory background
- Main color: #ff8fa9
- Secondary color: #2a234f
- Large product images
- Clear spacing
- Mobile responsive layout

Responsive rules:

- Desktop: 4-column product grid
- Tablet: 3-column product grid
- Mobile: 2-column product grid
- Product detail and Inquiry List should have mobile-friendly CTA placement

# Technical direction

Prefer:

- Vite
- React
- Plain CSS or CSS modules unless a framework already exists
- Simple file structure
- Mock data under src/data
- Reusable components under src/components
- Pages under src/pages
- Services under src/services

Avoid unnecessary dependencies.

# Validation

Before finishing, check:

- npm install works
- npm run dev works
- npm run build works
- No payment/checkout wording appears
- No app/APK/Capacitor setup is introduced
- Main pages are responsive
- User status UI differences are visible
