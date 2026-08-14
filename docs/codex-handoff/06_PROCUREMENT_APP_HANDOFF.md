# Flutter 발주 앱 상세 인수인계

확인일: 2026-08-14

## 현재 가장 중요한 상태

발주 앱의 과거 A 컴퓨터 경로는 `D:\noblesse-procurement`다. 현재 B 컴퓨터의
`C:`와 `D:` 후보 경로에는 source가 없고, `dgkim0127` GitHub 저장소 목록에도
`noblesse-procurement` 또는 유사한 원격 저장소가 없다.

따라서 다음 두 가지를 구분한다.

- 대화에서 확정한 기능/상태: 이 문서로 이어갈 수 있음
- 실제 Flutter/Firebase source 수정: A 컴퓨터 source를 이전하기 전에는 불가

대화만 보고 앱을 새로 재작성하지 않는다. 기존 source에는 최근 Firebase
실데이터와 callable Function 변경이 있으므로 재작성하면 데이터 계약과
화면 동작이 달라질 가능성이 크다.

## 앱의 목표와 역할

Noblesse 웹과 분리된 Flutter 발주 프로그램이다.

- 역할 분리: 관리자 / 발주자 / 수령자·매장
- Excel 기반 품번 정보 import/preview
- 품번 검색 후 선택 입력
- 컬러별 수량, 큐 색상, 긴급 여부
- 실시간 공유 발주서
- 사무실 처리 상태와 매장 수령 상태 분리
- A4 PDF와 인쇄 흐름
- 향후 Noblesse 연동 가능성을 고려한 별도 데이터 영역

웹 저장소에 Flutter, APK, Capacitor 파일을 넣지 않는다.

## 주요 source 구조

- `lib/models/procurement_models.dart`
- `lib/services/procurement_repository.dart`
- `lib/services/excel_import_service.dart`
- `lib/services/order_pdf_service.dart`
- `lib/screens/demo_preview_page.dart`
- `functions/src/index.js`
- `firestore.rules`
- `test/widget_test.dart`

Firebase 데이터는 `procurement*` collection으로 격리하고, client 직접 쓰기를
막으며 mutation은 callable Functions를 통한다. Firebase 설정값은
`--dart-define`으로 주입하고 자격 증명을 commit하지 않는다.

## 구현된 것으로 기록된 기본 기능

- Flutter 프로젝트와 역할별 화면
- 발주 model/repository/service
- Excel 선택, preview, import 흐름
- A4 PDF 생성과 printing 연동 골격
- Firebase Auth/Firestore/Functions/Messaging/Storage 의존성
- callable Functions와 Firestore rules
- Firebase 없는 in-memory `APP_DEMO=true` browser demo
- 역할 전환, 발주 입력, lifecycle 변경, 알림, PDF preview

초기 최종 기록은 widget tests 20개 통과였다. 이후 화면/수령 흐름이 추가된
최근 작업에서는 전체 Flutter tests 26개 통과가 보고됐다.

## 상품 lifecycle 규칙

- `단종 예정`: 남은 수량을 유지하고 경고만 표시
- `단종`: 남은 수량을 0으로 만들고 신규 발주 차단
- receiver order item의 오래된 lifecycle이 catalog 상태를 덮지 않아야 함
- lifecycle 변경 시 matching catalog product와 모든 matching order item을
  함께 갱신
- 카드 렌더링은 global catalog lifecycle을 우선
- `단종` 저장 뒤 카드가 실제 빨간 테두리로 보이는지 cache-reset preview로
  검증

저장 toast나 테스트 통과만으로 시각 상태를 확인했다고 말하지 않는다.

## 최근 사무실/매장 수령 흐름

최근 Codex 대화 기준으로 다음 동작까지 구현·검증됐다고 보고됐다.

1. 사무실 수신 발주에서 컬러별로 챙김 여부를 선택한다.
2. 사무실에서 체크하지 않은 컬러는 매장 화면에서 회색·비활성이다.
3. 사무실에서 체크한 컬러만 매장에서 수령 체크할 수 있다.
4. 사무실 체크를 해제하면 해당 매장 체크도 함께 무효화한다.
5. 서버도 미선택 컬러의 매장 저장을 거부한다.
6. 매장 컬러별 수령 체크는 사무실 챙김 상태와 별도 필드로 저장한다.
7. 수량이 있는 활성 컬러를 모두 받은 경우에만 매장 `OK`가 녹색이 된다.
8. 일부만 받았거나 아직 확인하지 않았으면 `OK`는 회색이다.
9. 기존 전체 `OK` 데이터는 열 때 모든 대상 컬러가 체크된 것으로 호환한다.
10. 발주 내역 카드는 컬러 기준 `챙김 / 미챙김` 수를 표시한다.
11. 컬러 영역을 열면 `수량 -> 최종 수량`과 현재 상태를 함께 보여준다.
12. 최종 수량이 달라졌으면 강조 색으로 표시한다.

가장 최근 copy 방향은 `약속`이라는 단어를 빼고 다음처럼 수량 흐름만
표시하는 것이다.

```text
OR 123개 -> 최종 1개
```

## demo와 실제 Firebase 모드

`APP_DEMO=true`는 새로고침하면 초기 in-memory 데이터로 돌아간다. 과거에
사용자가 입력한 발주가 사라진 것처럼 보인 원인이었다.

이후 실제 Firebase PIN mode로 다시 빌드했고, 새로고침 뒤에도 실제 발주가
유지되는 화면을 확인한 기록이 있다. 최근 작업에서는 다음도 보고됐다.

- 매장 수령 저장 callable Function 추가/변경
- 관련 Firebase Functions 4개 배포 대상 반영
- 미선택 컬러 저장을 서버에서도 차단
- 실제 Firebase 주문 목록 로드 확인
- 전체 Flutter tests 26개 통과

이것은 대화 종료 시점의 과거 증거다. B 컴퓨터에서 source와 설정이 없으므로
현재 배포 상태를 재검증한 것은 아니다. PIN, API key, project credential은
이 문서에 옮기지 않았다.

## 아직 운영 출시로 볼 수 없는 이유

- B 컴퓨터에 source가 없음
- GitHub 원격과 commit/branch 이력이 없음
- analyzer에는 과거 lint/info가 남았던 기록
- 전체 Firebase backend/rules/App Check 운영 검토 불완전
- 실제 Excel 파일 import end-to-end 미검증
- signed APK와 실제 Android 기기 미검증
- FCM 알림 실기기 미검증
- A4 프린터 실제 출력 미검증
- demo preview와 실제 Firebase preview를 혼동할 위험
- 대화에서 일부 Functions 배포는 있었지만 전체 release baseline은 없음

## A 컴퓨터에서 source를 옮길 때

소스가 있는 A 컴퓨터에서 다음을 수행해야 한다. 이 단계는 별도 사용자
승인 후 실행한다.

1. `D:\noblesse-procurement`의 `git status`, 현재 branch, origin을 확인한다.
2. Git 저장소가 아니면 기존 파일을 보존한 채 새 저장소 준비 계획을 세운다.
3. `.env`, Firebase config, PIN, API key, service account, signing key, build
   artifact를 Git에서 제외한다.
4. `AGENTS.md`와 앱 전용 `CODEX_HANDOFF.md`를 추가한다.
5. format, analyze, 26 tests, web build를 현재 source에서 다시 실행한다.
6. `dgkim0127`의 별도 private repository로 push한다.
7. B 컴퓨터의 별도 경로에 clone하고 local Firebase 설정을 안전하게 다시
   주입한다.
8. 실제 Firebase project와 deployed Functions가 source와 같은지 비교한다.

source가 확보되기 전에는 GitHub 저장소를 임의 생성하거나 빈 Flutter 앱을
만들어 대체하지 않는다.

## B 컴퓨터 Codex 시작 문장

```text
C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle\docs\codex-handoff\06_PROCUREMENT_APP_HANDOFF.md를 전부 읽어줘.
현재 B 컴퓨터에는 D:\noblesse-procurement source가 없고 GitHub 원격도
확인되지 않았어. 앱을 새로 만들거나 Firebase를 변경하지 말고, A 컴퓨터에서
source를 안전하게 옮기기 위한 상태 점검과 비밀정보 제외 체크리스트만
한국어로 정리해줘.
```

관련 Codex 작업 ID: `019fb0f6-3599-7520-8d7f-1d042e41b863`
