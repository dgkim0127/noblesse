# Codex 마스터 실행 지시

이 저장소는 피어싱 자사몰 웹 관리자다. 기존 POS/APK 프로젝트와 분리되어 있다.

## 문서 읽기 순서

1. `docs/admin-plan/README.md`
2. `docs/admin-plan/01_EXECUTION_ROADMAP.md`
3. `docs/admin-plan/02_CODEX_RUNBOOK.md`
4. 현재 전달된 `docs/admin-plan/stages/STAGE_XX_....md`
5. 해당 기능과 관련된 `docs/admin-plan/spec/` 문서

## 절대 규칙

- 현재 전달된 Stage만 구현한다.
- 다음 Stage를 선행하지 않는다.
- 코드 변경 전에 조사·계획·파일 목록·테스트 계획을 보고한다.
- DB 변경은 migration이다.
- 서버 검증, 권한 검사, RLS를 생략하지 않는다.
- 브라우저에 service-role key를 노출하지 않는다.
- 가짜 숫자, mock count, 무반응 버튼을 production 경로에 남기지 않는다.
- 품절/재고부족을 수동 상품 상태로 저장하지 않는다.
- 가격을 float로 저장하지 않는다.
- 재고를 이력 없이 덮어쓰지 않는다.
- 상품과 SKU를 hard delete하지 않는다.
- 화면이 아니라 업무 규칙을 우선한다.

## 완료 보고

`docs/admin-plan/templates/STAGE_RESULT_TEMPLATE.md` 형식으로 보고한다. 완료 게이트가 하나라도 실패하면 완료라고 선언하지 않는다.
