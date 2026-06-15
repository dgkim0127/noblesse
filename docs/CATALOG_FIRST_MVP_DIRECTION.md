# Catalog-first MVP Direction

## Decision

- Noblesse is a domestic and international B2B catalog / order inquiry site.
- Current MVP prioritizes catalog browsing and inquiry flow.
- Backend/Auth/DB automation is deferred.
- Pricing, approval, Request Quote persistence, and Admin Quote automation are later phases.

## Current MVP Goal

- Show the Noblesse brand and product catalog clearly.
- Let domestic and international B2B buyers understand products, materials, options, MOQ, images, and inquiry paths.
- Guide buyers to submit trade or order inquiries for manual follow-up.
- Avoid checkout, payment, cart, or instant-purchase behavior.

## Primary Audience

- 국내 B2B 거래처
- 해외 B2B 바이어
- 도매/유통/샵 운영자
- 피어싱 제품 소싱 담당자

## Current Site Behavior

- Public catalog browsing
- Product detail browsing
- Inquiry CTA
- Buyer/trade inquiry flow
- Manual follow-up by Noblesse

## Not Now

- No online checkout
- No cart
- No payment
- No instant purchase
- No production DB automation
- No real Firebase Auth flow
- No Cloud Run / Cloud SQL production setup
- No Admin Quote automation

## Later

- Approved buyer login
- Member price visibility
- Request Quote persistence
- Admin quote workflow
- PostgreSQL-backed catalog
- `audit_logs`-backed admin writes

## Copy Direction

Use:

- 국내·해외 B2B 카탈로그
- 국내·해외 거래처 문의
- 제품 문의
- 주문 문의
- 견적 문의
- 담당자 확인 후 안내
- MOQ / 소재 / 컬러 / 사이즈
- 거래 조건은 문의 후 안내

Avoid:

- 장바구니
- 결제
- 즉시 구매
- 체크아웃
- 온라인 주문 완료
- 자동 주문 확정
- 카드 결제

Important:

- "주문 문의" is allowed.
- "견적 문의" is allowed.
- Avoid any wording that feels like instant order/payment completion.
- A quote request is not a final order.

## Locale Copy Alignment

- KR, EN, JP, and CN visible copy should all describe Noblesse as a catalog/inquiry site for domestic and international B2B buyers.
- Header, footer, product card, product detail, and registration CTA copy should point to catalog browsing, product inquiry, trade inquiry, and manual follow-up.
- During the current MVP, "member price" language should be softened as "trade terms" where possible.
- JP/CN copy should avoid implying a global member-only site when the intended audience is domestic/international B2B trade inquiry.
