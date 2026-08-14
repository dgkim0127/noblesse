# Stage 04 — 상품 도메인 데이터베이스

## 목표

상품관리 전 영역의 데이터 기준을 migration으로 만든다.

## 구현 범위

`spec/04_SUPABASE_SCHEMA.sql`을 검토해 순서 있는 migration으로 분해한다.

- categories
- shipping_profiles
- products
- product_option_groups/values
- product_variants
- inventory_levels/movements
- media_assets/product_media
- status history/audit_logs
- product_relations
- product_series/items
- templates
- notices/assignments
- import_jobs/rows

## 필수 제약

- store-scoped unique SKU, slug, product code
- integer money
- reserved <= on_hand
- soft delete/archive
- version optimistic lock
- immutable audit log
- useful indexes
- updated_at trigger

## 완료 게이트

- reset→migration→seed 두 번 연속 성공
- constraint tests
- two-store RLS tests
- generated DB types
- 주요 product list query의 explain 기록

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
