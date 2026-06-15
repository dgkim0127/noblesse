# Catalog MVP Search and Brand Production QA Report

## Scope

- Search placeholder animation production QA.
- Brand locale production QA.
- URL: `https://noblesse.web.app`
- Noblesse hosting target only.
- No backend/API/DB/Auth connection.
- No `/api` rewrite.

## Brand Rule

- KR: `귀족`
- EN: `Noblesse`
- JP: `貴族`
- CN: `贵族`

## Search Placeholder Expected Behavior

- Top search placeholder animates by character.
- Compact search placeholder animates by character.
- Placeholder hides when user types.
- Placeholder does not block input.
- No mobile overflow.

## Routes Checked

- `/`
- `/en`
- `/jp`
- `/cn`
- `/products/NB-001`
- `/en/products/NB-001`
- `/jp/products/NB-001`
- `/cn/products/NB-001`
- `/register`
- `/en/register`
- `/jp/register`
- `/cn/register`

## Results

- KR brand: Go. Header, compact header, H1, footer, and brand home labels use `귀족`.
- EN brand: Go. Header, compact header, H1, footer, and brand home labels use `Noblesse`.
- JP brand: Go. Header, compact header, H1, footer, and brand home labels use `貴族`.
- CN brand: Go. Header, compact header, H1, footer, and brand home labels use `贵族`.
- H1/accessibility duplicate: Go. No duplicate brand strings such as `귀족귀족`, `貴族貴族`, `贵族贵族`, or `NoblesseNoblesse` were observed.
- Top search animation: Go. Placeholder characters use `search-placeholder-letter-in`.
- Compact search animation: Go. Placeholder characters use `search-placeholder-letter-in`.
- Typing hides placeholder: Go. Animated placeholder is removed when text is entered.
- Mobile overflow: Go. Checked at mobile width; no document-level horizontal overflow.
- Forbidden checkout/cart/payment wording: Go. No forbidden direct-purchase wording observed in checked routes.

## Deploy Command

- `firebase.cmd deploy --only hosting:noblesse --project pors-piercing-pos`

## Deploy Log Check

- Hosting target: `hosting[noblesse]`.
- Hosting URL: `https://noblesse.web.app`
- Firestore rules deployed: No.
- Storage rules deployed: No.
- POS/default site touched: No.

## Go / No-Go

- Search/brand production QA: Go.
