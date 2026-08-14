# Stage 06 — 읽기 전용 상품 조회/검색

## 목표

상품 상태와 검색 계약을 입력 화면보다 먼저 고정한다.

## 구현 범위

- `/admin/products`
- query-string filter schema
- status counts
- name/code/SKU/brand/category
- lifecycle/display/inventory state
- date range
- server pagination/sort
- page sizes 20/50/100
- column visibility
- sticky selection/name columns
- horizontal scroll
- initial empty vs no results vs error
- 10,000 product fixture

## 이번 단계 제외

- 상품 등록/수정 버튼
- bulk action
- export

## 핵심 규칙

- URL is source of truth
- search resets page=1
- status count preserves non-status filters
- sold-out and low-stock are derived

## 완료 게이트

- reload/back 유지
- count와 total 일치
- 페이지간 중복/누락 없음
- 10,000건 성능 기록

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
