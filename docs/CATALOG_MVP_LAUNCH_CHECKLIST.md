# Catalog MVP Launch Checklist

## Production URL

- `https://noblesse.web.app`

## Required QA Already Completed

- Local browser QA: `docs/CATALOG_MVP_BROWSER_QA_REPORT.md`
- Production browser QA: `docs/CATALOG_MVP_PRODUCTION_QA_REPORT.md`
- Contact production QA: `docs/CATALOG_MVP_CONTACT_PRODUCTION_QA_REPORT.md`
- Real-device QA report: `docs/CATALOG_MVP_REAL_DEVICE_QA_REPORT.md`
- Mobile overflow QA report: `docs/CATALOG_MVP_MOBILE_OVERFLOW_QA_REPORT.md`
- S24 Ultra UI follow-up report: `docs/CATALOG_MVP_S24_ULTRA_UI_QA_REPORT.md`
- S24 Ultra production QA report: `docs/CATALOG_MVP_S24_ULTRA_PRODUCTION_QA_REPORT.md`
- Locale brand QA report: `docs/CATALOG_MVP_LOCALE_BRAND_QA_REPORT.md`
- Search and brand production QA report: `docs/CATALOG_MVP_SEARCH_BRAND_PRODUCTION_QA_REPORT.md`

## Final Manual Checks Before Sharing Link

- Open `https://noblesse.web.app`.
- Open `/products`.
- Open `/products/NB-001`.
- Open `/register`.
- Confirm contact email is visible on register.
- Confirm `mailto:` uses `dgkim0127@gmail.com`.
- Confirm no checkout/cart/payment/direct-buy wording.
- Confirm inquiry is not final order.
- Confirm mobile layout on phone.
- Confirm no text overflow.
- Confirm no horizontal scroll.
- Confirm email wraps safely.
- Confirm CTA buttons do not overflow.
- Confirm viewer/status labels fit on Samsung Galaxy S24 Ultra width.
- Confirm language switch/dropdown fits on mobile.
- Confirm compact header search panel is readable after scroll.
- Confirm locale header brand labels follow the 30D brand rule: KR `귀족`, EN `Noblesse`, JP `貴族`, CN `贵族`, without category wording.
- Confirm 30D locale brand production QA is recorded in `docs/CATALOG_MVP_LOCALE_BRAND_QA_REPORT.md`.
- Confirm search placeholder animation is visible in top search and compact search.
- Confirm typing in search hides the animated placeholder.
- Confirm search placeholder has no mobile overflow.
- Confirm search and brand production QA is recorded in `docs/CATALOG_MVP_SEARCH_BRAND_PRODUCTION_QA_REPORT.md`.
- Confirm product code/material/color/size/MOQ is visible.
- Record the real-device result in `docs/CATALOG_MVP_REAL_DEVICE_QA_REPORT.md` before external sharing.

## If Anything Changes Later

Re-run QA if any of these change:

- Contact email.
- Header/footer copy.
- Product detail copy.
- Register/inquiry copy.
- Firebase Hosting config.
- Product data.
- Image data.
- Inquiry CTA.
- Locale copy.

## Shareable Summary

Noblesse is currently live as a domestic and international B2B piercing catalog and trade inquiry site.

URL:
`https://noblesse.web.app`

Contact:
`dgkim0127@gmail.com`

Important:
Catalog inquiry is not a final order. Noblesse will manually review trade inquiries and reply with conditions or quotation details.
