# Catalog MVP S24 Ultra UI QA Report

## Scope

- Samsung Galaxy S24 Ultra real-device follow-up QA.
- Catalog-first MVP visible UI only.
- No deploy in this step.
- No API/Auth/DB/backend/provider change.
- No Firebase `/api` rewrite.

## Production Follow-up

- 30C deployed the 30B mobile UI fixes to Noblesse Hosting only.
- Production recheck report: `docs/CATALOG_MVP_S24_ULTRA_PRODUCTION_QA_REPORT.md`
- Production URL: `https://noblesse.web.app`
- Production QA status: Go.

## Device

- Device: Samsung Galaxy S24 Ultra
- Browser: user real-device browser check
- Date: 2026-06-15
- Production URL reference: `https://noblesse.web.app`

## Issues Reported

- Header viewer/status label was too long on mobile, especially the guest preview state.
- Mobile language switch/dropdown looked awkward and needed a clearer tap target.
- EN/JP/CN brand/header/logo area still used piercing-category words as part of the brand label.
- Compact header search panel was hard to read after scrolling and tapping search.

## Fixes Applied

- Added compact mobile viewer labels for the preview state switcher.
- Kept full viewer labels on wider screens while using shorter labels on mobile.
- Made the compact language switch explicitly tappable with an open state.
- Improved compact language dropdown spacing, background, and z-index.
- Changed header/logo/footer brand display to `귀족` for KR and `Noblesse` for non-KR locales.
- Removed brand-like `Noblesse Piercing`, `貴族ピアス`, and `高贵的穿孔` from prominent home brand surfaces.
- Kept piercing-category wording where it describes catalog products or categories.
- Constrained the compact search panel to the mobile viewport with internal scrolling.

## Routes To Recheck

- `/`
- `/products`
- `/products/NB-001`
- `/register`
- `/en`
- `/en/products/NB-001`
- `/jp`
- `/jp/products/NB-001`
- `/cn`
- `/cn/products/NB-001`

## Mobile/Layout Checks

- Header brand label remains centered and readable in local preview.
- Viewer/status buttons wrap without horizontal overflow in local preview.
- Language switch opens by tap and stays inside the viewport in local preview.
- Compact search panel is readable after scroll and stays inside the viewport in local preview.
- No checkout/cart/payment/direct-buy wording was found in checked local preview routes.

## Local Preview QA

- Viewport widths checked: 360, 375, 390, 412, 430.
- Routes checked across mobile widths: `/`, `/products/NB-001`, `/register`, `/en`, `/en/products/NB-001`, `/en/register`, `/jp`, `/jp/products/NB-001`, `/jp/register`, `/cn`, `/cn/products/NB-001`, `/cn/register`.
- Result: no document-level horizontal overflow found.
- Result: no forbidden checkout/cart/payment/direct-buy visible wording found.
- Result: EN/JP/CN home header and H1 brand labels show `Noblesse`.
- Result: compact search panel fits inside the mobile viewport.
- Result: compact language dropdown fits inside the mobile viewport and opens by tap.

## Go / No-Go

- S24 Ultra UI follow-up: Go for local preview QA after the fixes.
- Production sharing remains tied to the next approved deploy and production recheck.
