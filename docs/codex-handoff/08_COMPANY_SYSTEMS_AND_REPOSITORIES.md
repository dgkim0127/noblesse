# 귀족회사 시스템·저장소 지도

확인 기준일: 2026-08-14

## B 컴퓨터에서 확인된 작업공간

| 시스템 | B 컴퓨터 경로 | 원격/branch | 현재 상태 |
| --- | --- | --- | --- |
| Noblesse 인수인계 | `C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle` | `dgkim0127/noblesse`, `codex/workspace-sync-20260814` | clean 기준으로 시작, 회사 문서 작성 중 |
| PORS main | `C:\Users\MINE\Documents\Codex\pors` | `dgkim0127/pors`, `main` | clean, HEAD `8ce2214` |
| PORS 온라인 견적 | `C:\Users\MINE\Documents\Codex\pors-online-quote-workspace` | `codex/pors-quote-list-compact` | clean, HEAD `380b175`, 검증 통과 |
| 상품관리 앱 | `C:\Users\MINE\doq\product_s` | `dgkim0127-rgb/product_s`, `master` | **dirty**, HEAD `c061151` |
| Blingping | `C:\Users\MINE\Documents\Codex\2026-07-14\sites-plugin-sites-openai-bundled-3` | 일반 Git remote 없음, `main` | clean, HEAD `3dd5716` |
| 발주 앱 | 과거 `D:\noblesse-procurement` | 원격 미확인 | B source 없음 |

이 표의 `clean`은 source 복구 또는 운영 준비 완료를 뜻하지 않는다.

## Noblesse 저장소

- GitHub: `https://github.com/dgkim0127/noblesse.git`
- 운영 기준 `origin/main`: 확인 당시 `a6d2832`, PR #32 merge
- 인수인계 branch: `codex/workspace-sync-20260814`
- 인수인계 branch HEAD는 최신 main과 큰 차이가 있는 과거 계열이다.

열린 Draft PR:

| PR | branch | base | 주제 |
| --- | --- | --- | --- |
| #21 | `codex/pc-picking-quotation` | `main` | PC 견적 피킹 작업공간 |
| #33 | `codex/pors-device-read-fallback` | `main` | PORS device UUID fallback |
| #34 | `codex/signup-email-conflict` | `main` | 중복 이메일 가입 복구 |
| #35 | `codex/admin-buyer-delete` | PR #34 branch | 관리자 Buyer 삭제 |
| #36 | `codex/account-recent-products` | PR #35 branch | 최근 본 상품 |

PR #34 -> #35 -> #36은 서로 의존하는 연쇄 branch다. 각각을 독립 PR처럼
main에 합치지 않는다. #21과 #33도 현재 코드·API·배포 상태를 재검증하기
전에는 merge하지 않는다.

과거에 병합된 업무에는 B2B 카탈로그, PostgreSQL schema/analytics,
Firebase import 계획, admin 운영화, Buyer 견적 수락, 옵션, 로그인, 견적
목록·요청·피킹·PDF, 성능·반응형·상품등록, PORS 읽기/쓰기 범위가 포함된다.
`merged`는 현재 운영 데이터와 end-to-end가 준비됐다는 뜻은 아니다.

## PORS 저장소

- GitHub: `https://github.com/dgkim0127/pors.git`
- main과 온라인 견적 전용 작업공간을 분리한다.
- 온라인 견적 branch의 `npm.cmd run verify`는 2026-08-14 B 컴퓨터에서
  calculation, history retention, online quote tests와 Vite build를 통과했다.
- dependency audit에는 위험 항목이 남아 있으며 강제 audit fix를 하지 않는다.

Draft PR #5의 과거 구현에는 견적 인쇄 시 PORS `sales` 등록 및 재확정 시
sale 갱신이 포함된다. 현재 회사 계약은 기존 영수증을 사람이 수동 연결하고
온라인 견적이 매출·영수증·결제·재고를 자동 생성하지 않는 것이다. 이
충돌을 먼저 설계 결정으로 해결해야 하며 PR을 그대로 merge하지 않는다.

## Flutter 발주 앱

현재 B 컴퓨터에 source와 Git remote가 없다. 대화에는 demo, Firebase,
사무실 챙김과 매장 컬러별 수령, lifecycle, PDF, 26개 tests 등의 기록이
있지만 현재 checkout에서 재검증할 수 없다.

A 컴퓨터 source를 새 private repository로 안전하게 옮긴 뒤 별도 경로에
clone한다. PIN, Firebase credential, signing key를 Git에 넣지 않는다.

## `product_s` 상품관리 앱

- Flutter + Firebase 상품·재고·직원 관리 앱
- remote 소유자는 현재 로그인 계정 `dgkim0127`과 다른 `dgkim0127-rgb`
- 수정 파일:
  - `lib/pages/admin_home.dart`
  - `lib/pages/product_edit_page.dart`
- 현재 diff를 보존하고 출처·의도를 확인하기 전에는 format, restore, commit,
  push를 하지 않는다.

상세 규칙은 해당 source의 `AGENTS.md`와 `11_PRODUCT_S_APP_HANDOFF.md`를
함께 따른다.

## Blingping B2C

- Cloudflare Workers, D1, R2 기반 별도 소비자 쇼핑몰
- source는 clean이고 마지막 commit은 `3dd5716`
- 일반 Git remote가 없어 Codex Sites 전용 저장소 이력 외에는 다른 컴퓨터가
  평범한 `git clone`으로 복원할 수 없다.
- 과거 private 배포 성공 기록은 있으나 이메일 provider, 사업자·법무 내용,
  고객지원/반품 주소가 최종화되지 않아 public 운영 준비 완료가 아니다.

## PostgreSQL·Firebase·배포

- PostgreSQL 17 설치 대화가 있었지만 B 컴퓨터의 설치 버전, 서비스, port,
  database, schema, 데이터 존재 여부는 아직 확정하지 않았다.
- Noblesse에는 PostgreSQL schema/analytics와 Firebase import/Functions 관련
  병합 이력이 있으나 실제 production 데이터 투영과 배포 상태를 별도로
  확인해야 한다.
- Firebase rules, App Check, Storage, Functions, Hosting, signing, 환경변수는
  시스템마다 다르다. 한 프로젝트의 설정을 다른 앱에 복사하지 않는다.
- 운영 배포, DB migration, 실제 데이터 변경은 사용자 명시 승인 전 금지다.

## 안전한 재개 명령

각 작업공간에서 수정 전에 다음만 확인한다.

```powershell
git status --short --branch
git remote -v
git log -1 --oneline
git fetch --prune
```

dirty 작업공간에서는 `pull`, branch 전환, formatter, dependency upgrade를
먼저 실행하지 않는다. 별도 clean clone/worktree가 필요하면 사용자에게
대상 저장소와 branch를 보고한 뒤 만든다.
