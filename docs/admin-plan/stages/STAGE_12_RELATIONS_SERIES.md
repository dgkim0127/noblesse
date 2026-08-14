# Stage 12 — 연관상품·상품 시리즈

## 목표

교차판매와 별도 상품 간 전환을 지원한다.

## 구현 범위

- SIMILAR
- CROSS_SELL
- UP_SELL
- ACCESSORY
- ordering
- product series
- representative product
- storefront DTO

## 금지

소재·색상·게이지·길이를 series로 만들지 않는다. 이는 option/variant다.

## 완료 게이트

- self-reference rejected
- duplicate relation rejected
- representative belongs to series
- cross-store relation rejected
- archive behavior defined

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
