# Blingping B2C 액세서리몰 인수인계

확인 기준일: 2026-08-14

## 회사 안에서의 위치

Blingping은 Noblesse Piercing B2B 견적 웹과 별도의 소비자용 액세서리몰이다.
상품·이미지 원천을 공유할 수 있어도 회원, 결제, 주문, 배송, 반품, 법적
동의와 고객 개인정보 처리는 별도 업무다.

Noblesse B2B에 Blingping의 장바구니·직접 결제·쿠폰·리뷰·반품 UX를 적용하지
않는다.

## 현재 B 컴퓨터 source

- 경로:
  `C:\Users\MINE\Documents\Codex\2026-07-14\sites-plugin-sites-openai-bundled-3`
- branch: `main`
- HEAD: `3dd57164889f6e6b85b22f7e98bf16b2d251c5cd`
- commit: `Add consented customer registration flow`
- worktree: clean
- 일반 Git remote: 없음

따라서 이 컴퓨터에서는 source를 읽을 수 있지만, 새 컴퓨터가 평범한 GitHub
clone만으로 복원할 수 있는 상태는 아니다.

## 현재 source의 기능 범위

- Cloudflare Workers runtime
- D1: 상품, 옵션 재고, 주문 원장, 회원, 콘텐츠, 감사 기록
- R2: 상품 이미지와 암호화 운영 snapshot
- 회원 이메일 OTP와 비회원 주문 인증
- 다중 이미지, SKU option 재고, 24시간 재고 예약, 무통장 입금
- 주문·입금·출고·배송완료·취소·반품·재입고 원장
- 주소록, 주문 조회, 회원 탈퇴와 법정 보존 데이터 분리
- role 기반 관리자, 분석, CSV import/export
- legal document와 consent version 관리
- 알림 발송 queue와 provider abstraction

실제 PG 결제, 문자·알림톡, 쿠폰, 포인트, 회원등급, review 자동화는 이후
범위로 기록돼 있다.

## 과거 검증과 배포 기록

과거 작업 `019f5e72-2762-7c03-8460-6596322b1aac`에서 다음이 보고됐다.

- `/login`, `/signup`, 이메일 인증, 필수/선택 동의, 정책 page 구현
- commit `3dd5716`
- lint, build와 8 tests 통과
- stale Playwright server 정리 후 E2E 5/5 통과
- 기존 Sites project에 owner-only private 배포 성공
- home/signup HTTP 200, 상품 8개, 등록 문서 3개 확인

그러나 당시에도 email provider/domain, 사업자·법무 내용, 고객지원·반품
주소가 최종화되지 않아 public 운영 준비 완료가 아니었다. 이 기록은 과거
시점의 증거이며 현재 deployment와 데이터는 새로 확인해야 한다.

## 비밀정보와 개인정보

`.env.example`은 변수 이름만 안내한다. 실제 admin 이메일, auth secret,
개인정보 암호화 key, 이메일 API key, 발신 주소 등은 source·Git·handoff에
복사하지 않는다.

회원 이름·전화번호·주소·주문·환불계좌·동의 기록·email 목록도 테스트나
이전 보고를 위해 출력하지 않는다. D1/R2 snapshot을 옮길 때는 암호화와
접근권한을 먼저 확인한다.

## 안전한 이전·재개 순서

1. 현재 clean commit과 source 전체를 보존한다.
2. 기존 Sites source repository의 공식 복구 방식 또는 별도 private Git
   remote 중 하나를 확정한다.
3. private Git을 쓰면 secret, local D1/R2 data, build output을 제외한다.
4. B와 새 컴퓨터에서 Node 22 환경으로 install, typecheck, lint, unit/E2E를
   다시 실행한다.
5. local preview에서 회원·주문·관리자 flow를 검증한다.
6. production 변경 전 사업자·법무·email·도메인·고객지원 정보를 확정한다.
7. owner-only 정책과 backup/restore를 확인한 뒤 별도 승인으로 배포한다.

현재 일반 remote가 없다고 해서 새 저장소를 자동 생성하거나 public로
push하지 않는다.

## B 컴퓨터 Codex 시작 문장

```text
C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle\docs\codex-handoff\12_BLINGPING_B2C_HANDOFF.md와
Blingping source의 README.md, docs/OPERATIONS.md, .env.example을 읽어줘.
Noblesse B2B와 섞지 말고, 아직 코드를 수정하거나 배포하지 마. 현재 Git
commit, remote 부재, dependency 설치 상태, 비밀정보 제외 상태와 local
preview 검증 절차를 먼저 한국어로 보고해줘.
```
