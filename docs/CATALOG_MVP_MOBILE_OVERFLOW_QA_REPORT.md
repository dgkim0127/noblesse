# Catalog MVP Mobile Overflow QA Report

## Scope

- Mobile text/layout overflow QA.
- Local preview.
- No deploy.
- No API/Auth/DB/backend change.

## Viewports Checked

- 360px
- 375px
- 390px
- 414px

## Routes Checked

- `/`
- `/products`
- `/products/NB-001`
- `/register`
- `/approval-pending`
- `/account`
- `/request-quote`
- `/en`
- `/en/products/NB-001`
- `/en/register`
- `/jp`
- `/jp/products/NB-001`
- `/jp/register`
- `/cn`
- `/cn/products/NB-001`
- `/cn/register`

## Issues Found

- Route: shared mobile layout and header/preview controls.
  - Viewport: narrow mobile widths.
  - Issue: mock viewer-state preview buttons could clip long labels on mobile.
  - Fixed by: allowing preview controls to wrap and size as flexible segmented controls.
- Route: `/`, `/jp`, and other Home locale routes.
  - Viewport: narrow mobile widths.
  - Issue: animated hero copy used no-wrap ScrambleText visual spans, which could create internal text overflow for long KR/JP/CN/EN copy.
  - Fixed by: allowing hero ScrambleText visual and measurement layers to wrap inside the hero copy only.
- Route: product detail, register, approval, account, and request-quote surfaces.
  - Viewport: narrow mobile widths.
  - Issue: long CTA labels, email address, product names, and locale strings needed stronger wrapping guarantees.
  - Fixed by: adding text wrapping, min-width, and button/link width safeguards.

## Fix Summary

- CSS fixes:
  - Added broader box/text wrapping safeguards.
  - Added max-width constraints for media.
  - Allowed primary/secondary CTA labels to wrap safely.
  - Added mobile wrapping for account/auth/agreement action groups.
  - Added `approval-page` layout rules for inquiry-gated pages.
  - Allowed preview-bar controls to wrap instead of clipping.
  - Allowed hero ScrambleText copy to wrap within the hero area.
- Copy fixes:
  - None.
- Deferred:
  - Horizontal category/filter rails remain intentionally scrollable within their own controls; they do not create page-level horizontal overflow.
  - Top marquee and carousel text are intentionally clipped within their own containers and were excluded from overflow failure criteria.

## Results

- Horizontal overflow: Pass. No document-level horizontal overflow found across 64 route/viewport checks.
- CTA overflow: Pass. No CTA overflow found across checked routes.
- Email wrapping: Pass. `dgkim0127@gmail.com` wraps safely where present.
- Product detail: Pass. Product title/spec/CTA did not create document or CTA overflow.
- Register/inquiry pages: Pass. Register, approval, account, and request-quote surfaces did not create document, CTA, or email overflow.
- JP/CN long text: Pass. Long locale text wraps safely in the checked routes.

## Go / No-Go

- Mobile overflow QA: Go.
