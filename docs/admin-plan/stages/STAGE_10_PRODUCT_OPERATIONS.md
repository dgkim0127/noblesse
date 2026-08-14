# Stage 10 — 상품 목록 운영 기능

## 목표

상품목록을 실제 운영 도구로 완성한다.

## 구현 범위

- edit entry
- bulk sale status
- bulk display status
- bulk category
- bulk shipping profile
- bulk price
- inventory adjustment
- archive/restore
- CSV export
- current-page vs all-results selection
- partial success result
- idempotency key
- audit log
- permission enforcement

## 완료 게이트

- VIEWER API write blocked
- duplicate request safe
- partial failure reason shown per row
- audit log contains before/after
- CSV formula injection test

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
