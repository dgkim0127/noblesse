# Stage 07 — 상품 초안 등록/수정

## 목표

복잡한 옵션과 미디어 전 단계에서 기본 상품을 안전하게 임시저장한다.

## 구현 범위

- `/admin/products/new`
- `/admin/products/:id/edit`
- category
- name/product code
- brand/manufacturer/model/origin
- base/compare price
- tax type
- sale/preorder dates
- min/max purchase
- shipping profile
- slug
- display status
- single default variant
- explicit Save draft
- unsaved changes guard
- version conflict

## UI 규칙

- 이번 단계에서 동작하지 않는 섹션은 렌더링하지 않음
- error summary에서 field로 이동
- 저장 실패 후 입력값 유지
- 모바일보다 desktop 우선

## 완료 게이트

- create→save draft→list→edit
- incomplete draft accepted
- server-side validation
- 409 conflict E2E
- cross-store ID injection rejected

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
