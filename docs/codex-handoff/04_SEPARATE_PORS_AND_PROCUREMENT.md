# 별도 PORS와 Flutter 조달 앱 경계

이 문서는 두 앱의 경계만 빠르게 확인하는 개요다. 실제 재개 전에는
`05_PORS_APP_HANDOFF.md`와 `06_PROCUREMENT_APP_HANDOFF.md`를 각각 읽는다.

## 공통 원칙

PORS, Noblesse 웹, Flutter 조달 앱은 이름과 데이터가 연결될 수 있어도
서로 다른 저장소/작업공간이다. 한 저장소의 브랜치나 지시를 다른 저장소에
적용하지 않는다.

## PORS 저장소

관련 Codex 작업 ID: `019ea4c4-fb26-73f3-ace3-7aa2a5d0e597`

과거 주요 기록:

- Firebase/PORS 데이터 구조 문서화
- 사용자가 지정한 APK 기준 소스와 비교 후 재빌드
- 온라인 견적 목록이 비어 있는 원인 점검
- `/api/pors/quotes`가 HTTP 200과 `quotes: []`를 반환한 경우가 있었음

빈 목록은 당시 backend/data workflow에 견적 데이터가 없다는 증거였고,
렌더링 실패라는 뜻은 아니었다. 화면을 채우기 위해 실제 주문, 영수증,
결제, 재고 데이터를 임의 생성하지 않는다.

온라인 견적을 재개할 때 기존 `D:\pors`를 사용하지 않는다. 사용자가
지정한 전용 clean checkout인 `D:\pors-online-quote-workspace`의 원격과
브랜치를 B 컴퓨터에서 새 경로로 복원한다. 일반 PORS의 가게별 할인은
유지하지만 Noblesse 온라인 견적에는 0% 할인 계약을 적용한다.

APK 요청이 다시 들어오면 다음 순서를 지킨다.

1. 사용자가 지정한 기준 APK의 버전/제목/본문을 확인한다.
2. 그 APK와 일치하는 소스 checkout을 식별한다.
3. 새 소스가 아니라 기준과 맞는 소스에서 preview를 먼저 비교한다.
4. 승인 후 APK를 빌드한다.

테스트나 HTTP 200만으로 운영 준비 완료라고 말하지 않는다. signing,
배포 설정, 실제 데이터, end-to-end 증거를 별도로 확인한다.

## Flutter 조달 앱

관련 Codex 작업 ID: `019fb0f6-3599-7520-8d7f-1d042e41b863`

과거 A 컴퓨터 경로는 `D:\noblesse-procurement`였다. 이 앱은 Noblesse
웹사이트도 아니고 PORS 본체도 아닌 별도 Flutter 프로토타입이다.

확인된 방향:

- `APP_DEMO=true`를 사용한 브라우저 데모
- Firebase 기반 미래 아키텍처 문서
- receiver lifecycle 변경을 catalog와 order item에 함께 반영
- discontinued 상품 카드 상태를 catalog 기준으로 렌더링
- 관련 widget test와 로컬 검증 기록

아직 운영 출시로 보지 않는 이유:

- 실제 Firebase backend 경로 미검증
- rules/App Check/실데이터 흐름 미검증
- signed release/APK 배포 경로 미검증
- 브라우저 데모 통과가 모바일 운영 준비를 의미하지 않음

이 앱을 B 컴퓨터로 옮길 때는 Noblesse 웹 체크포인트 안에 폴더를 만들지
말고 별도 저장소를 clone한다. 원격 URL과 branch를 현재 증거로 확인한 뒤
설치/테스트를 실행한다.

2026-08-14 확인 결과 PORS는 GitHub에서 B 컴퓨터로 복원했지만, Flutter
발주 앱에 해당하는 원격 저장소는 `dgkim0127` 계정에서 찾지 못했다. 따라서
발주 앱 설명은 이어갈 수 있어도 소스 수정은 아직 할 수 없다.

## PostgreSQL 17 작업

사이드바에 `PostgreSQL 17 설치` 작업이 있었지만, 이 인수인계 작성 시점에
정확한 설치 결과, 서비스 이름, 포트, 데이터베이스 이름, 계정 설정을
안전하게 복원할 기록은 확보하지 못했다. 다음 값을 추측하지 않는다.

- 비밀번호
- 포트
- Windows 서비스 이름
- 데이터 경로
- 기존 database/schema 존재 여부

B 컴퓨터에서는 먼저 읽기 전용으로 설치 여부와 버전을 조사하고, 별도
PostgreSQL 작업으로 진행한다. Noblesse migration을 자동 실행하지 않는다.
