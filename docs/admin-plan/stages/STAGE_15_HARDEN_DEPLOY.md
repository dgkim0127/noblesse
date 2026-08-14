# Stage 15 — 보안·성능·접근성·배포

## 목표

상품관리 MVP를 운영 배포 가능한 수준으로 검증한다.

## 구현 범위

- permission/RLS regression
- immutable audit verification
- CSP/security headers
- HTML sanitizer abuse cases
- MIME bypass tests
- rate limits
- request ID and error logging
- full E2E
- axe
- visual regression 1920/1440/1280/1024
- 10,000 product performance
- explain/index tuning
- staging/production separation
- backup/restore drill
- deployment and rollback runbook

## 완료 게이트

- critical security issue 0
- critical accessibility issue 0
- required E2E 100%
- fake data/unimplemented controls 0
- backup restore demonstrated
- production migration procedure approved

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
