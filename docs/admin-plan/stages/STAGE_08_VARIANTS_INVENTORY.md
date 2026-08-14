# Stage 08 — 옵션·SKU·재고

## 목표

피어싱의 소재, 색상, 게이지, 길이 등을 조합 가능한 SKU로 구현한다.

## 구현 범위

- option groups max 5
- option values
- drag/sort
- Cartesian variant matrix
- stable combination key
- SKU/barcode/price/active
- on-hand/reserved/low-stock threshold
- inventory adjustment reason
- inventory movement ledger
- mass cell edit
- orphaned variant handling

## 핵심 규칙

- option label 순서 변경이 variant identity를 바꾸지 않음
- 기존 주문 참조 가능 SKU hard delete 금지
- inventory direct overwrite 금지
- unique SKU/barcode server+DB
- available = on_hand - reserved

## 완료 게이트

- 2×3 조합 6개
- duplicate/combination tests
- inventory ledger tests
- removed option value의 기존 SKU 보존 정책 확인

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
