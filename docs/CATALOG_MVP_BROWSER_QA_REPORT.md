# Catalog MVP Browser QA Report

## Scope

- Local browser QA on Vite preview at `http://127.0.0.1:4173`.
- No deploy.
- No API connection.
- No DB/Auth connection.
- No Firebase Hosting rewrite change.

## Routes Checked

- `/`
- `/products`
- `/products/NB-001`
- `/register`
- `/approval-pending`
- `/inquiry-list`
- `/request-quote`
- `/my-inquiries`
- `/en`
- `/en/products`
- `/en/products/NB-001`
- `/en/register`
- `/jp`
- `/jp/products`
- `/jp/products/NB-001`
- `/jp/register`
- `/cn`
- `/cn/products`
- `/cn/products/NB-001`
- `/cn/register`

## Locale Checks

- KR: Pass. Domestic/international B2B catalog and trade inquiry positioning is visible on Home, Products, Product Detail, Register, and inquiry routes.
- EN: Pass. Home, Products, Product Detail, and Register use domestic/global B2B catalog and trade inquiry language.
- JP: Pass. Home, Products, Product Detail, and Register use domestic/overseas B2B trade inquiry language; old membership-request wording was not visible.
- CN: Pass. Home, Products, Product Detail, and Register use domestic/overseas B2B trade inquiry language; old membership-price wording was not visible.

## Copy Results

- Catalog/inquiry positioning: Pass. The site reads as a B2B product catalog with trade/order inquiry CTAs.
- Domestic/international B2B wording: Pass. KR/EN/JP/CN key routes mention domestic and international B2B buyers or trade partners.
- Final order disclaimer: Pass. Product Detail, Register, Approval Pending, and Inquiry List clarify that inquiry/quote flow is not a final order.
- Forbidden checkout/cart/payment wording: Pass in browser visible text for checked routes.

## Product Results

- Product code: Pass. Product Detail shows `NB-001` and localized product-code labels.
- Material: Pass. Product Detail shows material in KR/EN/JP/CN.
- Color/size: Pass. Product Detail shows color and size in KR/EN/JP/CN.
- MOQ: Pass. Product list/detail and register copy surface MOQ or localized minimum-quantity language.
- Inquiry CTA: Pass. Product cards/detail use product inquiry or trade-condition inquiry language, not instant-purchase language.

## Mobile/Layout Results

- Header: Pass. Mobile viewport showed no horizontal overflow on checked KR/EN/JP/CN routes.
- Product cards: Pass. Mobile product grids kept catalog cards readable and inquiry CTAs visible.
- Product detail: Pass. Mobile Product Detail preserved product code, material, color/size, MOQ, and inquiry CTA.
- Register/inquiry pages: Pass. Mobile Register and inquiry routes kept trade-inquiry/manual-follow-up wording readable.

## Issues Found

Fixed:

- EN/JP/CN Products pages still showed Korean page, search, filter, category, and CTA copy.
- Home banner and collection copy still used member/global-member wording instead of B2B buyer/trade inquiry wording.
- Product detail descriptions used generic global catalog wording instead of B2B catalog wording.
- Request Quote and Account copy still had member-profile labels where trade-partner wording was clearer.

Deferred:

- Some product names remain English in CN routes because the current mock product data does not include Chinese product names.
- DB-backed catalog runtime QA remains a later step; current Catalog MVP continues to use mock fallback data.

## Go / No-Go

- Catalog MVP local browser QA: Go.

## Production Follow-up

- Production QA was completed after Noblesse Hosting deploy.
- Report: `docs/CATALOG_MVP_PRODUCTION_QA_REPORT.md`
