# Catalog MVP Launch Freeze

## Launch Status

- Production URL: `https://noblesse.web.app`
- Catalog MVP production QA: Go.
- Contact-channel production QA: Go.
- Real-device QA was recorded in 30B at `docs/CATALOG_MVP_REAL_DEVICE_QA_REPORT.md`; the current entry is pending actual user-provided phone/browser results.
- Mobile overflow fix and local preview QA were completed in 30B; see `docs/CATALOG_MVP_MOBILE_OVERFLOW_QA_REPORT.md`.
- Samsung Galaxy S24 Ultra UI follow-up fixes are recorded in `docs/CATALOG_MVP_S24_ULTRA_UI_QA_REPORT.md`.
- Samsung Galaxy S24 Ultra production recheck after Noblesse Hosting deploy is recorded in `docs/CATALOG_MVP_S24_ULTRA_PRODUCTION_QA_REPORT.md` with status Go.
- Admin automation is now entering planning only; see `docs/ADMIN_MVP_SCOPE.md`.
- Primary contact email: `dgkim0127@gmail.com`
- Current positioning: domestic and international B2B catalog / order inquiry site.
- Current operating model: manual follow-up by Noblesse.

## What Is Frozen

- Catalog-first MVP positioning.
- Domestic/international B2B copy direction.
- Inquiry is not final order disclaimer.
- No checkout/cart/payment/direct-buy behavior.
- Primary contact path:
  - `/register`
  - `mailto:dgkim0127@gmail.com` where intended.
- Firebase Hosting target:
  - `noblesse`
- No `/api` rewrite.
- No backend/API/Auth/DB dependency for current MVP.
- Public catalog behavior should not regress while admin planning proceeds.
- Brand locale rule is frozen as KR `귀족`, EN `Noblesse`, JP `貴族`, CN `贵族`.
- Search placeholder character animation is part of the current catalog UI.
- Brand/search UI changes require search/brand production QA rerun.

## Do Not Change Without Separate Approval

- Firebase Hosting target.
- `.firebaserc` target mapping.
- `/api` rewrite.
- Contact email.
- Checkout/cart/payment wording.
- Request Quote final-order disclaimer.
- Product inquiry CTA wording.
- Mobile layout or text wrapping; any change requires mobile overflow QA rerun.
- POS/APK/Capacitor files.
- Backend provider resources.
- Production DB settings.

## Current Deferred Items

- Real product photos replacing mock/generated imagery.
- Real SKU/product list finalization.
- CN product names currently using English mock product names where no CN name exists.
- Domain/business email replacement for `dgkim0127@gmail.com`.
- Legal review for terms/privacy/contact policy.
- Backend/API/Auth/DB automation.
- Member pricing visibility.
- Request Quote persistence.
- Admin Quote workflow.
- Real operations admin implementation.
- PostgreSQL-backed catalog.
- `audit_logs`-backed admin writes.

## Current Non-goals

- Online checkout.
- Cart.
- Payment.
- Instant purchase.
- Production DB automation.
- Firebase Auth login.
- Cloud Run / Cloud SQL setup.
- Admin Quote automation.
