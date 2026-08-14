# PORS 태블릿 POS 앱 상세 인수인계

확인일: 2026-08-14

## 앱의 역할

PORS는 `dgkim0127/pors`의 태블릿 POS 앱이다. React/Vite 기반 PWA를
Capacitor Android로 포장하며 다음 현장 업무를 담당한다.

- 판매 입력과 거래처별 할인
- VAT 계산
- 품목, 카테고리, 거래처, 작성자 관리
- 판매 내역과 영수증 출력
- 별도 메뉴의 Noblesse 웹 견적 조회/준비

Noblesse 웹사이트의 구매자 UI나 route를 PORS 저장소에 넣지 않는다.
Noblesse 웹은 PORS 판매 원본을 직접 수정하지 않는다.

## B 컴퓨터에 복원된 작업공간

| 경로 | 브랜치/HEAD | 상태 |
| --- | --- | --- |
| `C:\Users\MINE\Documents\Codex\pors` | `main` / `8ce2214b3ebde8300aaea68bb6256cf887a8652f` | clean, `origin/main` 추적 |
| `C:\Users\MINE\Documents\Codex\pors-online-quote-workspace` | `codex/pors-quote-list-compact` / `380b175b626cd7732c619b15d177c2bc59e20249` | clean, 원격 branch 추적 |

원격 저장소: `https://github.com/dgkim0127/pors.git`

`pors-online-quote-workspace`는 같은 clone에 연결된 Git worktree다. 두 경로에서
동시에 같은 branch를 checkout하거나 같은 파일을 따로 수정하지 않는다.

## 2026-08-14 원격 상태

- 기본 branch: `main`
- PR #1 `codex/online-quote-workspace`: merged
- PR #2 `codex/pors-production-api-config`: merged
- PR #3 `codex/pors-app-1.0.4`: merged
- PR #4 `codex/pors-loginless-read`: merged
- PR #5 `codex/pors-quote-list-compact`: OPEN Draft, merge state CLEAN
- PR #5 status checks: 없음
- PR #5는 `main` 대비 10개 파일, 약 `+2690/-884` 변경

PR #5는 commit이 많이 쌓인 큰 branch다. CLEAN은 Git 충돌이 없다는 뜻일
뿐이며 비즈니스 계약, 보안, 운영 준비 완료를 의미하지 않는다.

## 현재 B 컴퓨터 검증

`pors-online-quote-workspace`에서 다음을 실행했다.

```powershell
npm.cmd ci
npm.cmd run verify
```

결과:

- calculation tests 통과
- history retention tests 통과
- online quote workspace tests 통과
- Vite build 통과
- worktree clean
- 설치 audit: 6건(낮음 1, 높음 4, 치명적 1)
- non-module script bundle 경고 존재

`npm audit fix` 또는 강제 upgrade는 실행하지 않았다. 의존성 보안 수정은
앱 동작과 APK baseline을 깨뜨릴 수 있어 별도 작업으로 검토한다.

## Firebase 판매 데이터 계약

PORS가 판매 원본을 소유한다. 주요 collection은 다음과 같다.

- `sales`
- `categories`
- `subcategories`
- `items`
- `customers`
- `writers`
- `deletion_logs`
- legacy `piercing_pos/pors_state`

판매는 `createdAt`, 거래처 식별/이름, 중첩 `totals`, `lines[]`를 사용하고
line 합계는 `price * quantity`에서 계산된다. 기기 로컬/legacy 캐시는 최근
500건으로 제한할 수 있지만 Firebase `sales` 원본을 자르거나 삭제하는
규칙은 아니다.

## APK 기준 이력

사용자가 기준으로 지정한 과거 APK:

- A 컴퓨터 경로: `D:\pors\android\app\build\outputs\apk\release\pors-pos-1.0.5.apk`
- package: `com.piercingpos.app`
- version: `1.0.5`, versionCode 6

그 APK의 embedded asset과 일치하는 source는 commit `b5fc814`, branch
`codex/pors-loginless-read`로 확인됐다. 이 기준에서 수량 입력 두 곳을
최대 9,999로 바꾸고 version `1.0.6`, versionCode 7로 재빌드한 기록이 있다.

- Android resource hash 351개가 1.0.5와 동일
- 공개 asset 중 `assets/public/standalone.js`만 변경
- 당시 signature 검증 통과
- 당시 SHA-256:
  `38EB11644D2F193D2E3F4CCCF1675D78F7C6A3F5FBE2B70710FA38C85C1CBF17`

현재 B 컴퓨터의 Git clone에는 1.0.5/1.0.6 APK 파일이 없다. GitHub에도 APK가
추적되지 않는다. 정확한 APK artifact가 필요하면 A 컴퓨터에서 파일을 별도
복사하거나, 기준 commit과 서명 조건을 확인한 뒤 다시 빌드해야 한다.

새 APK 요청에서는 항상 preview를 먼저 확인하고, 사용자가 지정한 APK와
source asset을 비교한 뒤 빌드한다. 단지 더 최신 commit이라는 이유로 다른
UI를 가진 source에서 빌드하지 않는다.

## 온라인 견적의 확인된 기능

PR #5에는 다음 변화가 포함돼 있다.

- 웹 견적 목록/2열 카드와 상세 화면
- device credential 기반 읽기/쓰기
- 사진 경로와 Noblesse product image 처리
- 요청/준비/부분취소 수량 제어
- 준비 상태와 준비 선택 필수 처리
- 서버 가격 미리보기와 내부 확정 payload 처리
- finalized 견적 수정 모드
- 영수증 형태의 합계/출력 UI
- 모바일 action row와 compact history card 스타일

과거 preview에서 `/api/pors/quotes`가 HTTP 200과 `quotes: []`를 반환한 적이
있다. 이것은 화면 오류가 아니라 backend adapter가 표시할 관리자 견적을
0건 반환한 상태였다. 가짜 견적/판매 데이터를 만들지 않는다.

## 병합 전 반드시 해결할 계약 충돌

현재 PR #5의 `docs/WEB_QUOTE_DATA_CONTRACT.md`와 commit 이력에는 다음 동작이
들어 있다.

- 첫 `영수증 출력` 시 deterministic ID로 PORS `sales` 등록
- 재출력 시 중복 판매 방지
- 재확정 뒤 출력 시 기존 sale의 line/total 갱신
- receipt linker UI 제거 commit

하지만 가장 최근 사용자 확정 계약은 다음과 같다.

- 자동 sale/order/payment/receipt/stock 생성 또는 변경 금지
- PORS에서 이미 만든 기존 영수증을 사람이 명시적으로 연결
- 온라인 견적 할인 0%, VAT 10%, 서버 가격 사용

따라서 PR #5는 현재 상태로 merge하거나 APK로 배포하면 안 된다. 특히 다음
commit/코드를 먼저 비교한다.

- `d96c983`: printed quote를 sales에 동기화
- `03e974e`: receipt linker section 제거
- `src/online-quotes.js`
- `src/standalone.js`
- `docs/WEB_QUOTE_DATA_CONTRACT.md`

어떤 계약을 최종으로 쓸지 사용자 확인을 받은 뒤, 자동 판매 등록을 제거하고
기존 영수증 수동 연결을 복원하는 방향이 현재 인수인계의 기본값이다.

## 보안과 운영 차단점

- managed device token, Firebase key, DB 자격 증명을 문서/Git에 넣지 않는다.
- 현재 README에는 개발용 기본 관리자키 안내가 있으므로 운영 보안 기준으로
  그대로 사용하지 않는다.
- 실제 device provisioning과 token rotation 절차를 검증해야 한다.
- PR #5에는 자동 checks가 없다.
- audit의 high/critical 의존성을 별도로 검토해야 한다.
- signed production APK, 실제 태블릿, 프린터, 오프라인/충돌 E2E를 새로
  검증해야 한다.
- 운영 Noblesse API를 preview가 호출하지 않도록 목적지를 먼저 확인한다.

## B 컴퓨터 Codex 시작 문장

```text
먼저 C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle\docs\codex-handoff\05_PORS_APP_HANDOFF.md를 전부 읽어줘.
작업공간은 C:\Users\MINE\Documents\Codex\pors-online-quote-workspace야.
아직 수정하지 말고 branch, status, origin, PR #5와 main 차이, 테스트 상태를
확인해줘. 특히 자동 sales 등록과 기존 영수증 수동 연결의 계약 충돌을
파일과 commit 기준으로 보고해줘. main 병합, PR 상태 변경, APK 빌드,
운영 API 호출, 배포는 내가 승인하기 전까지 하지 마.
```

관련 Codex 작업 ID: `019ea4c4-fb26-73f3-ace3-7aa2a5d0e597`
