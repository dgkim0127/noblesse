# Stage 11 — 미디어 보관함·템플릿·상품 공지

## 목표

상품 등록의 반복 작업을 독립 관리 도구로 만든다.

## 구현 범위

### Media library
- search/tag/usage/unused
- attach to product
- referenced delete guard

### Templates
- shipping
- return/exchange
- description
- legal notice
- option
- copy-on-apply semantics

### Product notices
- title/content
- active range
- priority
- all-products or assignments
- scheduled publish and expiry

## 완료 게이트

- product form에서 실제 적용 가능
- template 수정이 기존 상품을 자동 변경하지 않음
- notice date boundary test
- references and permissions tested

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
