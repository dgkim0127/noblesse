# Stage 00 — 범위·도메인 결정 고정

## 목표

코드를 만들기 전에 프로젝트 경계와 핵심 도메인을 고정한다.

## Codex 작업

1. 현재 저장소가 POS가 아닌 새 웹 저장소인지 확인한다.
2. 다음 ADR을 작성한다.
   - `0001-project-boundary.md`
   - `0002-product-variant-series.md`
   - `0003-money-timezone-tenancy.md`
   - `0004-out-of-scope.md`
3. 다음 가정을 명시한다.
   - single store initially
   - KRW integer money
   - Asia/Seoul
   - product → option → variant/SKU
   - derived sold-out/low-stock
   - archive instead of hard delete
4. 미결정 사항 목록을 작성하되 상품관리 MVP를 막는 항목과 막지 않는 항목을 분리한다.
5. 코드나 UI는 만들지 않는다.

## 완료 게이트

- 새 웹 저장소임이 문서에 명시됨
- POS 코드 의존성 0
- 1차 포함/제외 범위가 한 페이지에서 확인 가능
- 옵션과 상품 시리즈의 의미가 분리됨

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
