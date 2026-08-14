# `product_s` 상품관리 Flutter 앱 인수인계

확인 기준일: 2026-08-14

## 역할

`product_s`는 Noblesse 웹과 별도로 운영되는 Flutter + Firebase 기반
상품·재고·직원 관리 앱이다.

- 관리자와 직원 권한 분기
- 상품과 재고 관리
- 직원 결정과 수수료
- 사용자 권한
- 모바일·태블릿·데스크톱 반응형 UI
- Firebase Auth, Firestore, Storage, Functions

Noblesse B2B 웹이나 발주 앱과 데이터가 연결될 수 있어도 source와 작업
규칙은 분리한다.

## 현재 B 컴퓨터 상태

- 경로: `C:\Users\MINE\doq\product_s`
- remote: `https://github.com/dgkim0127-rgb/product_s.git`
- branch: `master`
- HEAD: `c061151f2bb5533ca09873156dd2a1ecbe38e6df`
- 상태: **dirty**
- 수정 파일:
  - `lib/pages/admin_home.dart`
  - `lib/pages/product_edit_page.dart`

현재 GitHub CLI 로그인 계정은 `dgkim0127`이므로 `dgkim0127-rgb` 저장소에
write 권한이 있다고 확인되지 않았다. 사용자 로컬 변경을 stage, restore,
format, commit, push하지 않는다.

Firebase 연결 파일 일부가 Git에 추적될 수 있다. 공개 가능한 client config와
실제 secret을 구분해 security review를 거친다. service account, private key,
admin credential은 절대 commit하지 않는다.

## 앱 전용 강한 규칙

source의 `AGENTS.md`가 이 앱 작업의 최상위 규칙이다.

명시적 요청 없이 다음을 바꾸지 않는다.

- 가격 계산
- 수수료 계산
- role 판정과 관리자/직원 분기
- Firestore collection/document 구조
- Firebase Functions endpoint와 API 계약
- 로그인·인증 흐름
- build/Firebase 설정과 새 dependency

UI는 기존 디자인을 유지하며 최소 수정한다. 모바일 overflow, dialog,
DataTable, Row, GridView, popup, bottom sheet를 우선 확인하고 desktop 동작을
깨지 않는다.

## 과거 관련 작업

- 작업 `019da8b3-0d34-7a62-b223-6f6c05a123db`:
  초기 프로젝트 구조와 모바일 UI 위험 진단
- 작업 `019da8cf-3d62-73b2-87c9-72e79cf244f6`:
  PDF preview dialog 반응형, staff decision 화면과 인쇄 버튼 관련 수정

현재 dirty 파일 두 개가 위 대화의 전체 결과라고 단정할 수 없다. 다른 화면
수정은 이미 commit됐거나 별도 상태일 수 있으므로 Git log와 diff로 확인한다.

## 안전한 다음 순서

1. 현재 두 파일의 diff를 읽기 전용으로 백업·검토한다.
2. 변경을 만든 컴퓨터와 목적을 확인한다.
3. `dgkim0127-rgb` write 권한 또는 새 private 저장소 소유 방향을 정한다.
4. 사용자가 변경 범위를 승인한 뒤 앱 전용 검증을 실행한다.
5. 관련 파일만 명시적으로 stage하고 별도 branch에 commit한다.
6. Firebase emulator/preview부터 확인하며 production 데이터는 변경하지 않는다.

현재 상태에서 `git pull`, branch 전환, `flutter format .`, dependency upgrade를
먼저 하면 사용자 diff가 커지거나 충돌할 수 있다.

## B 컴퓨터 Codex 시작 문장

```text
C:\Users\MINE\doq\product_s\AGENTS.md와
C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle\docs\codex-handoff\11_PRODUCT_S_APP_HANDOFF.md를
전부 읽어줘. 현재 master에 admin_home.dart와 product_edit_page.dart의 사용자
수정이 남아 있으므로 파일을 바꾸거나 format, restore, commit, push하지 마.
우선 Git diff, remote 권한, Flutter/Firebase 구조와 실행 가능 여부를
읽기 전용으로 점검하고 결과만 한국어로 보고해줘.
```
