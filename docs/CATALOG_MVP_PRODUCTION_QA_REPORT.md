# Catalog MVP Production QA Report

## Scope

- Firebase Hosting production URL QA.
- URL: `https://noblesse.web.app`
- Noblesse hosting target only.
- No backend/API/DB/Auth connection.
- No `/api` rewrite.

## Deploy Command

- `firebase.cmd deploy --only hosting:noblesse --project pors-piercing-pos`

## Deploy Log Check

- Hosting target: `hosting[noblesse]`
- Hosting URL: `https://noblesse.web.app`
- Firestore rules deployed: No.
- Storage rules deployed: No.
- POS/default site touched: No.

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

## Locale Results

- KR: Pass. Domestic/international B2B catalog and trade inquiry positioning is visible on Home, Products, Product Detail, Register, and inquiry routes.
- EN: Pass. Domestic/global B2B catalog and trade inquiry positioning is visible on Home, Products, Product Detail, and Register.
- JP: Pass. Domestic/overseas B2B trade inquiry positioning is visible on Home, Products, Product Detail, and Register.
- CN: Pass. Domestic/overseas B2B trade inquiry positioning is visible on Home, Products, Product Detail, and Register.

## Copy Results

- Catalog/inquiry positioning: Pass. Production pages read as a B2B catalog and trade/order inquiry site.
- Domestic/international B2B wording: Pass. KR/EN/JP/CN key pages include domestic/international buyer or trade-partner language.
- Final order disclaimer: Pass. Product Detail, Register, and inquiry-gated pages avoid final-order positioning and clarify manual review or follow-up.
- Forbidden checkout/cart/payment wording: Pass. Browser-visible text on checked routes did not contain the forbidden checkout/cart/payment/direct-buy wording.

## Product Results

- Product code: Pass. Product Detail shows `NB-001` and localized product-code labels.
- Material: Pass. Product Detail shows material in KR/EN/JP/CN.
- Color/size: Pass. Product Detail shows color and size in KR/EN/JP/CN.
- MOQ: Pass. Product Detail shows MOQ or localized minimum-quantity guidance; catalog pages keep trade terms inquiry-focused.
- Inquiry CTA: Pass. Product Detail and catalog routes use product inquiry, trade inquiry, or trade-condition inquiry language rather than instant-purchase language.

## Mobile/Layout Results

- Header: Pass. Mobile viewport checks showed no horizontal overflow.
- Product cards: Pass. Production product cards remained readable on mobile and kept inquiry/trade-terms language.
- Product detail: Pass. Product code, material, color/size, MOQ guidance, and inquiry CTA remained visible on mobile.
- Register/inquiry pages: Pass. Trade inquiry/manual follow-up copy remained readable on mobile.

## Issues Found

- Fixed: None during production QA.
- Deferred: CN product names still use English mock product names because the current mock catalog does not include Chinese product-name fields.

## Go / No-Go

- Catalog MVP production QA: Go.
