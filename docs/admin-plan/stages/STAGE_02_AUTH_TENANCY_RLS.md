# Stage 02 — 인증·매장·역할·RLS

## 목표

웹 관리자 접근과 데이터 격리를 먼저 완성한다.

## 구현 범위

- Supabase browser/server client 분리
- Auth 로그인, 로그아웃, 비밀번호 재설정
- stores, profiles, store_members migration
- OWNER, ADMIN, PRODUCT_MANAGER, VIEWER
- 서버 권한 검사 함수
- `/admin/**` 보호
- 활성 매장 로딩
- 기본 RLS
- 두 매장 seed와 교차 접근 integration test

## 보안 규칙

- service-role key는 서버의 제한된 관리 작업 외 사용 금지
- 사용자 역할을 client claim만 믿지 않음
- UI 숨김과 별개로 API와 DB에서 write 차단
- 비활성 매장/멤버 접근 차단

## 완료 게이트

- A 매장 사용자가 B 매장을 읽거나 수정하지 못함
- VIEWER write 요청이 서버/DB에서 실패
- 로그인 후 원래 경로 복귀
- 세션 만료 처리

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
