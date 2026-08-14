# Stage 14 — CSV 상품 일괄등록

## 목표

대량 상품을 운영 테이블에 직접 넣지 않고 검증 후 반영한다.

## 구현 범위

- template download
- new/update mode
- signed upload
- staging import job
- async validation
- row/column errors
- preview
- commit valid rows
- result CSV
- progress/cancel
- idempotency
- audit log

## 규칙

- UTF-8
- max 500 rows
- formula injection protection
- no immediate production write
- external image URL disabled by default
- update key explicit

## 완료 게이트

- mixed valid/invalid partial success
- same job replay safe
- result file identifies every failed row
- 500-row performance documented

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
