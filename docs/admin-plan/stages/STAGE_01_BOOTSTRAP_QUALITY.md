# Stage 01 — 프로젝트 부트스트랩과 품질 파이프라인

## 목표

실행·검사·배포 가능한 최소 웹 프로젝트를 만든다.

## 구현 범위

- Next.js App Router, TypeScript strict
- 패키지 매니저와 lockfile
- 환경변수 런타임/빌드 검증
- ESLint, formatter
- unit test
- Playwright smoke test
- CI
- `/login`, `/admin` 임시 라우트
- global error, not-found
- 개발·테스트·운영 env 문서

## 제외

- 실제 인증
- DB 테이블
- 관리자 디자인 완성
- 상품 기능

## 완료 게이트

- fresh clone 후 설치와 build 성공
- lint/typecheck/unit/E2E 모두 성공
- CI에서 같은 명령 성공
- secret가 저장소에 커밋되지 않음

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
