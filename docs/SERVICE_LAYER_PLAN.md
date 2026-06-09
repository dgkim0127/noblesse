# Service Layer Plan

This document defines how the current mock service layer can later move to PostgreSQL/Supabase without changing the Noblesse buyer-facing flow.

## Current State

- `src/services` uses mock data.
- `src/commerce/CommerceContext.jsx` coordinates viewer state, products, prices, Inquiry List, and Request Quote.
- The React website does not connect to Supabase or PostgreSQL.
- Buyer-facing price calculations are display-only.

## Future Service Direction

Future services may be split into:

- `productService`: reads public product metadata.
- `pricingService`: reads protected market prices only for approved Buyers.
- `buyerService`: reads Buyer profile, status, market, and discount rules.
- `inquiryService`: submits Request Quote payloads through a trusted endpoint.
- `analyticsService`: reads admin-only PostgreSQL views.

## Trusted Request Quote Flow

`submitRequestQuote()` should eventually call a trusted endpoint.

The trusted endpoint must:

1. Validate Buyer status.
2. Validate assigned market.
3. Reload `product_prices`.
4. Validate MOQ and minimum amount rules.
5. Apply approved Buyer discount rules.
6. Recalculate `price_snapshot`.
7. Recalculate item subtotals and Inquiry totals.
8. Insert `inquiries` and `inquiry_items` in one transaction.

## Forbidden Frontend Patterns

Do not:

- execute SQL directly from React components
- put a database connection string in frontend code
- put privileged server keys in frontend code
- trust browser-calculated price, MOQ, discount, or total values
- expose protected prices to `guest` or `pending` users

## Safe Frontend Pattern

The frontend can:

- show public product metadata
- show protected prices only after trusted Buyer approval state is available
- build a draft Inquiry List in local UI state
- submit a Request Quote payload to a trusted endpoint
- show returned Inquiry and quote status

The server or trusted database layer owns final validation and persistence.
