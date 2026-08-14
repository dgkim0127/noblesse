# Stage 09 — 이미지·상세설명·고시·게시

## 목표

초안을 고객몰에 게시 가능한 완성 상품으로 만든다.

## 구현 범위

- main/gallery/option media
- reorder and alt text
- rich-text editor adapter
- server sanitization
- legal notice dynamic schema
- SEO title/description/keywords
- preview
- publish validation
- ACTIVE/PAUSED/ENDED transitions
- sticky action bar
- section error summary
- upload completion guard

## 게시검증

`spec/09_IMPLEMENTATION_MATRIX.md`의 게시 차단 항목을 서버에서 모두 검사한다.

## 완료 게이트

- draft can remain incomplete
- publish rejects incomplete product
- successful publish transaction
- sanitization test
- upload failure/retry
- preview and public-read DTO consistency

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
