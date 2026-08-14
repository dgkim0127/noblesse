# Stage 05 — 카테고리·배송정보·미디어 업로드 기반

## 목표

상품등록이 의존하는 기준정보를 먼저 완성한다.

## 카테고리

- 최대 4단계 tree
- 검색/등록/수정/정렬/활성화
- slug
- 연결 상품 수
- 사용 중 삭제 차단

## 배송정보

- 무료/정액/조건부 무료
- 무료 기준금액
- 제주/도서 추가비
- 출고 소요일
- 출고지/반품지
- 반품비/교환비
- 사용 중 삭제 차단, 비활성화

## 미디어 기반

- private bucket
- signed upload
- store-scoped object path
- MIME/size/dimension validation
- upload READY/FAILED
- signed preview URL

## 완료 게이트

- PRODUCT_MANAGER CRUD 가능
- VIEWER read-only
- 다른 매장 참조 불가
- 사용 중 삭제 차단 integration test
- 업로드 위장 파일 차단 테스트

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
