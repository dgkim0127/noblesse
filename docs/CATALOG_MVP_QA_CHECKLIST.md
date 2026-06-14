# Catalog MVP QA Checklist

## Routes

- `/`
- `/products`
- `/products/:productCode`
- `/register`
- `/approval-pending`
- `/inquiry-list`
- `/request-quote`
- `/my-inquiries`

## Copy Checks

- Domestic and international B2B audience is visible.
- Catalog/inquiry positioning is clear.
- No checkout/cart/payment language appears in user-facing UI.
- Inquiry is not positioned as a final order.
- Contact/manual follow-up is clear.

## Product Checks

- Product code is visible.
- Material is visible.
- Color/size options are visible.
- MOQ is visible if available.
- Image and alt text are present.
- Inquiry CTA is visible where the current mock state allows it.

## Inquiry Checks

- Inquiry CTA is available.
- Final order disclaimer is visible.
- Buyer/trade information wording is clear.
- Manual review by Noblesse is clear.

## Technical Checks

- `npm run build`
- No Firebase rewrite
- No deploy unless separately approved
- No backend dependency required for current catalog MVP
