# Catalog MVP Contact Production QA Report

## Scope

- Production contact-channel QA for the Catalog MVP.
- URL: `https://noblesse.web.app`
- Deploy scope: Firebase Hosting target `noblesse` only.
- No backend/API/DB/Auth connection.
- No `/api` rewrite.
- No Firestore rules or Storage rules deploy.

## Deploy Command

- `firebase.cmd deploy --only hosting:noblesse --project pors-piercing-pos`

## Deploy Log Check

- Hosting target: `hosting[noblesse]`
- Hosting URL: `https://noblesse.web.app`
- Firestore rules deployed: No.
- Storage rules deployed: No.
- POS/default site touched: No.
- Temporary Noblesse site touched or deleted: No.

## Contact Source Check

- Primary email: `dgkim0127@gmail.com`
- User-facing `mailto:` destination: `mailto:dgkim0127@gmail.com`
- User-facing fake contact email remaining: No.
- Source `.example` findings: Existing schema/mock asset examples and documentation warning contexts remain; no user-facing fake contact email remains.
- Product detail `.example` finding: `NB-001` still references existing mock CDN image URLs under `cdn.example.com`; this is an image asset placeholder, not a contact channel, and the URL is not visible body text.

## Routes Checked

- `/`
- `/register`
- `/approval-pending`
- `/account`
- `/request-quote`
- `/products/NB-001`
- `/en/register`
- `/jp/register`
- `/cn/register`

## Contact Results

- `/`: Pass. Primary inquiry CTAs route to `/register`; no fake contact email or checkout/payment wording was visible.
- `/register`: Pass. `dgkim0127@gmail.com` is visible and the mail link is exactly `mailto:dgkim0127@gmail.com`.
- `/approval-pending`: Pass. The supplemental email CTA links to `mailto:dgkim0127@gmail.com`; no fake contact email was visible.
- `/account`: Pass. The trade inquiry path remains `/register`; no fake contact email or checkout/payment wording was visible in the default production state.
- `/request-quote`: Pass. The supplemental email CTA links to `mailto:dgkim0127@gmail.com`; the page remains gated as an inquiry flow, not a final order flow.
- `/products/NB-001`: Pass. The product CTA routes to `/register`; no fake contact email or checkout/payment wording was visible.
- `/en/register`: Pass. `dgkim0127@gmail.com` is visible and the mail link is exactly `mailto:dgkim0127@gmail.com`.
- `/jp/register`: Pass. `dgkim0127@gmail.com` is visible and the mail link is exactly `mailto:dgkim0127@gmail.com`.
- `/cn/register`: Pass. `dgkim0127@gmail.com` is visible and the mail link is exactly `mailto:dgkim0127@gmail.com`.

## Copy Results

- Catalog/inquiry positioning: Pass.
- Domestic/international B2B wording: Pass on checked register and inquiry routes.
- Final order disclaimer: Pass where inquiry/quote context is shown.
- Forbidden checkout/cart/payment/direct-buy wording: Pass on checked routes.
- Inquiry CTA behavior: Pass. CTAs lead to `/register` or the real email contact channel.

## Go / No-Go

- Contact-channel production QA: Go.

## Follow-up

- Replace `dgkim0127@gmail.com` with a domain/business email later if available.
- Contact channel is frozen for the current MVP as `dgkim0127@gmail.com` until replaced by a business/domain email.
- Re-run contact-channel QA after any future production deploy that changes inquiry, account, approval, or register copy.
