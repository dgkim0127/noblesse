# Stage 13 — 실제 상품 데이터 대시보드

## 목표

완성된 목록 query를 재사용해 스마트스토어형 업무 홈을 구현한다.

## 구현 범위

- all
- draft
- active
- sold out
- low stock
- paused
- display hidden
- incomplete
- task metric cards
- refresh and updated-at
- card→filtered list
- card error state
- feature flag for future modules

## 규칙

- production mock count 금지
- query builder 중복 구현 금지
- 실패를 0으로 표시 금지
- 주문/문의 모듈은 아직 숨김

## 완료 게이트

각 카드에 대해 `count == destination total` 통합 테스트 통과.

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
