# 2. Codex 실행 운영서

## 1. 저장소 배치

새 저장소 예시:

```text
piercing-store/
  app/
  src/
  supabase/
  tests/
  docs/admin-plan/
```

이 패키지 전체를 `docs/admin-plan/` 아래에 복사한다. 기존 POS 저장소에는 넣지 않는다.

## 2. 각 단계 실행법

한 번에 하나의 단계만 실행한다.

```text
1. main 최신화
2. 단계 전용 브랜치 생성
3. 해당 STAGE 문서를 Codex에 전달
4. Codex가 코드 변경 전 조사 결과를 먼저 출력
5. 변경 파일 검토
6. 구현
7. lint/typecheck/unit/integration/E2E 실행
8. 브라우저에서 수동 확인
9. 완료 게이트 검토
10. PR 생성
11. merge 후 체크리스트 갱신
```

브랜치 이름:

```text
stage/00-scope-lock
stage/01-bootstrap
stage/02-auth-tenancy
stage/03-admin-shell
stage/04-product-schema
stage/05-reference-data
stage/06-product-list-read
stage/07-product-draft-form
stage/08-variants-inventory
stage/09-media-content-publish
stage/10-product-operations
stage/11-reusable-tools
stage/12-relations-series
stage/13-dashboard
stage/14-csv-import
stage/15-hardening-deploy
```

## 3. Codex가 변경 전에 반드시 보고할 것

1. 현재 요구사항 요약
2. 기존 파일 조사 결과
3. 수정·생성·삭제할 파일
4. DB migration
5. API 변화
6. UI 변화
7. 보안 위험
8. 테스트 계획
9. 범위 밖으로 남길 항목

계획이 단계 범위를 넘어가면 구현을 시작하지 않고 범위를 줄인다.

## 4. Codex가 변경 후 반드시 보고할 것

1. 실제 변경 파일
2. migration 적용 순서
3. 실행 명령
4. 테스트 명령과 결과
5. 수동 확인 경로
6. 스크린샷
7. 미완료 항목
8. 새로 생긴 위험
9. 다음 단계가 사용할 계약

## 5. 금지 규칙

- 여러 단계를 한 PR에 합치지 않는다.
- mock count를 production 경로에 남기지 않는다.
- 동작하지 않는 메뉴와 버튼을 노출하지 않는다.
- 데이터가 없을 때 무조건 `0`으로 처리하지 않는다.
- 브라우저에서 service-role key를 사용하지 않는다.
- 관리자 공용 비밀번호를 코드에 넣지 않는다.
- DB 변경을 수동 SQL로만 적용하지 않는다.
- 테이블 전체를 클라이언트로 내려 필터링하지 않는다.
- 가격을 float로 저장하지 않는다.
- 재고를 이력 없이 덮어쓰지 않는다.
- 게시검증을 클라이언트에만 두지 않는다.
- 상품·옵션·SKU 저장을 여러 비원자적 요청으로 방치하지 않는다.

## 6. 단계 실패 시

다음 중 하나라도 발생하면 merge하지 않는다.

- type error
- migration 재적용 실패
- RLS 테스트 실패
- 테스트를 삭제하거나 skip해서 통과
- 미구현 버튼
- 다른 단계 기능을 선행 구현
- 서버 검증 없음
- 권한을 UI 숨김으로만 처리
- count와 list total 불일치
- 409 충돌 데이터 손실
- 파일 업로드 검증 누락

## 7. PR 크기

권장:

- 변경 파일 5~25개
- 핵심 로직 1개
- migration 1개 묶음
- 리뷰 가능한 화면 1~3개

PR이 지나치게 커지면 하위 PR로 분할한다. 특히 단계 8, 9, 11은 구현 중 필요하면 `A/B`로 나눈다.
