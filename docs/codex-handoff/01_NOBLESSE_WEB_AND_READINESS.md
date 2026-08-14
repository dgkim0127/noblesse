# Noblesse 웹 본체와 출시 준비도

## 목표와 고정 방향

Noblesse Piercing은 글로벌 바이어용 프리미엄 B2B 피어싱 카탈로그다.
구매 흐름이 아니라 다음 견적 흐름을 유지한다.

```text
상품 탐색 -> 견적 리스트 -> 견적 요청 -> 내 견적 요청
```

구매자 화면은 주얼리 브랜드처럼 이미지 중심이고 세련되어야 하지만,
`바로 구매`, `결제`, 쿠폰, 포인트, 실시간 판매 순위는 만들지 않는다.
`guest`와 `pending`은 승인 구매자 가격을 볼 수 없어야 한다.

## 2026-08-04 준비도 점검 기록

당시 `D:\noblesse`의 오래된 `codex/member-catalog-v1` 계열을 조사한 결과다.
현재 운영 상태를 보증하는 최신 정보가 아니므로 재개 시 다시 확인한다.

- 코드 구현률 추정: 약 60%
- 실제 운영 출시 준비도 추정: 약 30%
- 구매자 상품 탐색, Inquiry List, Request Quote, My Inquiries 골격 존재
- 이메일 가입/인증 골격과 승인 상태별 접근 제어 존재
- 관리자 바이어, 견적, 상품, 가격, 콘텐츠 화면 골격 존재
- 서버 가격/MOQ/합계 재검증과 WebP 4종 공개 조건 존재
- 당시 root lint/build 통과
- 당시 Functions 테스트 6개 통과
- Vite 번들에 큰 chunk 경고 존재

당시 운영 callable 카탈로그 조회는 상품, 카테고리, 컬렉션, 배너, 가격이
모두 0건이었다. 코드 뼈대가 있다고 해서 판매 가능한 데이터가 준비된
것은 아니었다.

## 당시 출시 차단 요소

- 작업 브랜치가 당시 `origin/main`보다 402커밋 뒤처짐
- working tree 변경/미추적 항목이 55개
- 개발 화면과 당시 운영 화면의 헤더, 검색, 히어로 비율이 크게 다름
- 가입부터 승인, 가격, 견적, 관리자 최종금액 공개까지 전체 E2E 미실행
- App Check가 `enforceAppCheck: false`
- Firestore/Storage rules가 전체 차단 placeholder이고 별도 template만 존재
- 카탈로그 실제 데이터와 가격 projection이 비어 있음
- 카탈로그 PDF 직접 업로드와 감사 로그 화면 미완성

`supabase/migrations/20260804_noblesse_b2b.sql`은 설계 자산일 뿐이다.
공유 POS 프로젝트의 규칙과 운영 데이터 구조를 검토하기 전 migration이나
rules를 단독 배포하지 않는다. Supabase secret은 브라우저에 두지 않고
서버 gateway만 사용한다.

## 구매자 견적 리스트 UI의 과거 성공 이력

별도 `D:\noblesse-main-work`에서 Inquiry List를 관리 화면 같은 표 형태에서
스토어프런트형 검토 화면으로 바꾼 작업이 있었다.

- 상품 목록, 수량 조절, 제거, sticky 요약 카드, 견적 CTA 구성
- `장바구니/구매`가 아니라 `견적 리스트/견적 요청` 용어 유지
- `kr`, `en`, `jp`, `cn` 현지화 적용
- 당시 frontend 149 tests, lint, 일반/production build 통과
- commit `eae68ae`가 당시 `origin/main`에 push됨
- 당시 Firebase Hosting target `noblesse` 배포 및 두 경로 HTTP 200 확인

이것은 과거 배포 이력이다. 현재 체크포인트가 최신 운영 코드라는 뜻이
아니며, 새 배포 권한도 아니다. 현재 운영 UI를 바꿀 때는 최신 `origin/main`
기준 clean checkout에서 변경을 재검토한다.

## 안전한 재개 순서

1. 현재 작업공간, 브랜치, status, origin을 읽기 전용으로 확인한다.
2. `git fetch origin --prune` 후 체크포인트와 `origin/main`의 차이를 숫자로
   보고한다. 자동 merge/rebase하지 않는다.
3. 운영 사이트와 현재 branch의 화면/데이터 모드를 분리해서 확인한다.
4. 출시 차단 요소를 최신 증거로 다시 작성한다.
5. 사용자가 기능 하나를 선택하면 최신 운영 기준의 별도 branch에서
   작은 범위로 이식한다.
6. 승인 없이 migration, rules, Functions, Hosting을 배포하지 않는다.

## 완료 주장 전에 필요한 검증

- root install, frontend tests, lint, build
- 실제 데이터가 채워진 화면으로 주요 구매자 흐름 확인
- guest/pending/approved 상태별 가격·CTA 권한 확인
- 모바일/태블릿/데스크톱의 실제 CSS viewport 기록
- 콘솔 오류와 가로 overflow 확인
- API 모드와 mock 모드를 혼동하지 않았는지 확인
- 운영 배포가 필요할 경우 별도 승인과 배포 전후 route 검증

## 관련 작업 ID

- 출시 준비도: `019fca69-33b1-75f1-bca0-017264153209`
- 구매자 견적 리스트: `019e7107-3dd6-7e03-a535-1de34ee38f0e`

기록 기준일 이후 브랜치와 운영 상태는 바뀌었을 수 있으므로 반드시
현재 Git/Firebase 증거로 갱신한다.
