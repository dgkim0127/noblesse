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

## Locale Copy Checks

- KR/EN/JP/CN header, footer, and CTA copy are checked.
- No locale implies instant purchase, payment, or cart behavior.
- JP/CN copy does not remain global-member-only when the intended audience is domestic/international B2B trade inquiry.
- Member price wording is softened toward trade terms where possible during the current MVP.

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

## Contact Channel Checks

- Primary contact email is visible where intended.
- `mailto:dgkim0127@gmail.com` works where used.
- No placeholder email appears in user-facing UI.
- No `.example` placeholder email remains in user-facing UI.
- Inquiry CTA leads to a real channel or an intentionally manual path.
- No fake contact destination is used.
- Inquiry CTA still leads to `/register` or valid email contact.
- Contact channel must be rechecked after production deploy.
- Contact production QA report: `docs/CATALOG_MVP_CONTACT_PRODUCTION_QA_REPORT.md`

## Technical Checks

- `npm run build`
- No Firebase rewrite
- No deploy unless separately approved
- No backend dependency required for current catalog MVP

## Browser QA

- Local browser QA report: `docs/CATALOG_MVP_BROWSER_QA_REPORT.md`
- Production browser QA report: `docs/CATALOG_MVP_PRODUCTION_QA_REPORT.md`
- Contact production QA report: `docs/CATALOG_MVP_CONTACT_PRODUCTION_QA_REPORT.md`
- Mobile overflow QA report: `docs/CATALOG_MVP_MOBILE_OVERFLOW_QA_REPORT.md`
- Launch freeze: `docs/CATALOG_MVP_LAUNCH_FREEZE.md`
- Launch checklist: `docs/CATALOG_MVP_LAUNCH_CHECKLIST.md`
- Local browser QA is required before deployment.
- Production browser QA is required after Noblesse Hosting deploy.
- Desktop and mobile widths should be checked on KR/EN/JP/CN key catalog and inquiry routes.

## Mobile Overflow Checks

- No document-level horizontal scroll.
- No CTA/button text overflow.
- Long locale copy wraps within its container.
- Email/contact links wrap safely.
- Product detail titles/specs/CTA do not overflow.
