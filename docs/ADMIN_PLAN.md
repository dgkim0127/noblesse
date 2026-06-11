# Admin Plan

## Purpose

The Noblesse admin area is a first-stage preview for operating the B2B catalog flow.
It supports internal review of wholesale member access, Request Quote records, Admin Quote drafts, product metadata, market prices, and analytics previews.

The current implementation is mock data only. It does not connect to real Auth, PostgreSQL, Supabase, Firebase data services, or any production credential.

## First Preview Scope

- Admin Dashboard
- Buyer Approval
- Buyer detail preview
- Product Management preview
- Price Management preview
- Inquiry Management
- Inquiry detail preview
- Admin Quotes list preview
- Admin Quote draft preview
- Analytics Dashboard preview
- 20A admin UX refinement for search, filters, workflow cards, and preview guidance

## Buyer Approval

The first preview lets an admin review mock wholesale member records in these states:

- pending
- approved
- blocked

Approve and Block controls change local UI state only. Production must verify admin role through Auth and server-side role checks before any member access state changes.
Buyer Approval now includes list search/filter preview and a detail checklist for review readiness.

## Product Management

Product Management displays product metadata from mock data:

- product code
- localized names
- category
- material
- colors
- sizes
- MOQ default
- visibility flags
- export availability
- new and best flags

Product creation, image upload, and Storage integration are intentionally out of scope for this preview.
The preview aligns product metadata with future PostgreSQL/Supabase product and catalog records.
Product Management search and category/material filters are preview-only helpers.

## Price Management

Price Management displays market price rows separated from product metadata.

Production price changes must be validated and written through trusted admin API/RPC. Client-side values must never be treated as final authority.
Price Management includes market tabs, search, and active-only filtering for preview review.

## Inquiry Management

Inquiry Management lets admins review Request Quote records and item snapshots.
The item snapshot preserves:

- productCode
- productName
- color
- size
- quantity
- MOQ
- priceSnapshot
- subtotal

priceSnapshot is a reference captured at request time. Admin Quote is the final quotation basis after Noblesse review.
Inquiry detail includes a review workflow preview: Requested, Checking, Admin Quote, and Confirmed or Cancelled.

## Admin Quote

Admin Quote preview is generated from a Request Quote record.
It includes requested quantities, confirmed quantities, requested priceSnapshot, confirmed unit price, confirmed subtotal, lead time, shipping note, and admin memo.

The `/admin/quotes` route provides an Admin Quotes list preview. The `/admin/quotes/:inquiryId` route provides the individual Admin Quote draft preview.
The Quotes list shows requested total, draft total, and the difference for quick review.

Save Draft Preview and Send Quote Preview change local UI state only. They do not send email, messenger messages, or write production data.

## Analytics Dashboard

Analytics preview cards are prepared for future PostgreSQL/Supabase views:

- v_top_requested_products_30d
- v_top_requested_products_by_market
- v_buyer_inquiry_summary
- v_category_inquiry_summary
- v_quote_conversion_monthly
- v_popular_option_combinations
- v_monthly_inquiry_trend

The current dashboard reads mock summaries only.
Dashboard cards include pending buyers, requested inquiries, quoted inquiries, confirmed inquiries, and estimated request total.
20A dashboard cards also show pending buyer review, active price markets, open Request Quotes, draft Admin Quotes, and analytics views ready.

## Production Connection Plan

Production admin functions require:

- real Auth
- server-side role validation
- trusted admin API/RPC
- PostgreSQL/Supabase read models for analytics
- protected writes for member review, price changes, and Admin Quote state
- audit history for admin actions

See `docs/ADMIN_API_PLAN.md` for the future trusted API/RPC operation design.

Admin role must not be trusted from client viewerState. viewerState is only a mock preview tool.
Firebase/Firestore is not the production business source of truth for admin operations.
Direct client writes are prohibited. Audit logs will be required before real admin operations.

## Current Safety Boundary

- mock data only
- current admin screens are mock preview only
- no production write path
- no credential usage
- no direct PostgreSQL connection
- no real Auth connection
- no Hosting release step in this phase
- no POS, APK, or mobile runtime file changes
