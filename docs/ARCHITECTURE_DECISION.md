# Noblesse Data Architecture Decision

## Project Reality

Noblesse Piercing looks like a lightweight premium catalog website, but the business logic is closer to a B2B wholesale transaction system.

The system needs:

- Buyer approval
- Market-specific prices
- MOQ
- Request Quote
- Admin confirmed quote
- Price snapshot
- Product performance analytics
- Buyer activity analytics
- Market/category/product reporting

## Core Problem

Client-side price calculation cannot be trusted. Users can manipulate browser-side values.

Therefore:

- Client-side price is only a display reference.
- `priceSnapshot` records the requested price at inquiry time.
- `adminQuote` stores the final confirmed quote.
- Future server-side validation is required.
- The final confirmed quote must be calculated by trusted server logic or an admin-confirmed workflow.

## Option A: Firebase-only

### Description

Firebase-only means using:

- Firebase Auth for Buyer and admin identity
- Firestore for catalog, Buyer profile, Inquiry, and quote workflow data
- Firebase Storage for product and banner images
- Firebase Hosting for the React website
- Cloud Functions for price, MOQ, discount, and market validation

### Pros

- Fast MVP path
- Simple integration with the current React website
- Good for catalog display
- Easy image and auth setup
- Cloud Functions can protect the Request Quote creation path

### Cons

- Complex analytics are harder than SQL
- Aggregations are limited compared with PostgreSQL
- Relationship-heavy data becomes harder to query
- Product, Buyer, market, and category reporting may require extra denormalized collections
- Long-term operational dashboards may require BigQuery export or separate analytics storage

### Best For

- 1st version
- Simple catalog
- Request Quote MVP
- Buyer approval prototype
- Image-centered product browsing

### Risks

- Long-term reporting may become difficult.
- Product performance analysis may require BigQuery, scheduled exports, or a separate SQL database.
- Firestore document shape must be carefully denormalized for every report.
- Price validation still requires trusted Cloud Functions; client-side totals are not enough.

## Option B: PostgreSQL

### Description

PostgreSQL means using:

- PostgreSQL as the main operational database
- External auth or a future backend-owned auth integration
- Firebase Storage or another CDN-backed image storage option
- pgAdmin4 for database inspection and local operation
- SQL views or materialized views for analytics
- Backend API or server-side services for trusted writes

### Pros

- Strong relational data model
- Better for `inquiries`, `inquiry_items`, `admin_quotes`, and `admin_quote_items`
- Better for product, Buyer, market, and category analytics
- Easier reporting with SQL
- pgAdmin4 can inspect and manage data directly during development
- SQL constraints and indexes can protect data integrity

### Cons

- More setup than Firebase
- Requires backend API and a clear security model
- Direct client database writes are dangerous if not protected
- Needs stricter schema design before production
- Storage/auth integration must be planned carefully

### Best For

- Real B2B wholesale system
- Product performance tracking
- Market-specific reporting
- Long-term admin dashboard
- Quote conversion analysis
- Buyer activity analytics

## Option C: Hybrid

### Description

Hybrid means using:

- React frontend
- Firebase Storage for images, if desired
- Firebase Auth or another auth provider
- PostgreSQL for business data
- pgAdmin4 for database management
- Server-side validation for Request Quote and admin quote confirmation

### Pros

- Keeps image delivery simple
- Uses SQL for complex business data
- Good long-term structure
- Allows a gradual migration from mock data to production data
- Keeps catalog UX flexible while giving the admin side stronger reporting

### Cons

- More moving parts
- Auth integration must be designed carefully
- More deployment complexity
- Requires clear ownership boundaries between Storage, auth, and business data

## Recommendation

Recommended path:

- 1st version can keep the current React UI and mock structure.
- For real production business data, use PostgreSQL if analytics and wholesale reporting are important.
- Firebase may still be used for Storage/Hosting if desired.
- Do not rely on client-side price calculation.
- Add server-side validation before storing final Inquiry and quote data.
- Treat `priceSnapshot` as the Buyer-facing requested price at Inquiry time, not the final confirmed price.
- Store final admin-confirmed quote data separately through `adminQuote`/`adminQuoteItems` or PostgreSQL `admin_quotes`/`admin_quote_items`.

## Final Decision

PostgreSQL is the required production business database for Noblesse Piercing.

- Firebase may remain for Hosting and optionally Storage.
- Firestore is not the long-term source of truth for business transactions.
- Product, Buyer, price, Inquiry, Inquiry Item, Admin Quote, and Analytics data belong in PostgreSQL.
- Supabase is not required for the primary plan.
- The PostgreSQL provider is undecided.
- pgAdmin4 is a PostgreSQL management tool, not a database.
- Browser-side price calculation is never trusted.
- Server-side validation must validate price, MOQ, Buyer status, market, discount, and totals.

## Final Direction

The strongest long-term architecture for Noblesse is:

```text
React website
-> Auth provider
-> API / server-side validation
-> PostgreSQL business data
-> Storage/CDN for image files
-> SQL views for admin analytics
```

This keeps the website premium and simple for Buyers while giving the business a reliable operational data model for wholesale pricing, Requests Quote, quote confirmation, and reporting.

## Service Layer Plan

Current `src/services` uses mock data.

Future service responsibilities:

- `productService` can call a PostgreSQL-backed API.
- `pricingService` must not expose protected prices to `guest` or `pending` users.
- `inquiryService.submitRequestQuote()` should call a trusted endpoint.

Trusted Request Quote creation should:

- validate Buyer status
- reload `product_prices`
- validate MOQ and minimum amount rules
- recalculate `price_snapshot` and `subtotal`
- insert `inquiries` and `inquiry_items` in a transaction

Do not execute SQL directly from React components. Do not put database connection strings or privileged server keys in frontend code.

## 22A PostgreSQL-only Update

Noblesse no longer requires Supabase as the primary backend platform.

- Firebase Hosting remains the frontend hosting path.
- PostgreSQL remains required for production business data.
- Supabase-specific Auth/RLS/SQL Editor workflows are historical unless Supabase is later selected only as a managed PostgreSQL provider.
- A backend API is mandatory before real frontend writes.
- Direct browser database access is prohibited.
- POS/APK files and existing POS hosting must remain separate.
