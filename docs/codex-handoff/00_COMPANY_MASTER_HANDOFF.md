# 귀족회사 전체 마스터 인수인계

확인 기준일: 2026-08-14

## 목적

이 문서는 A 컴퓨터와 여러 Codex 작업에 흩어진 귀족회사 관련 내용을
B 컴퓨터에서 이어가기 위한 최상위 지도다. Noblesse 웹사이트 한 개만을
다루지 않고, 아래 업무를 모두 회사 범위로 연결한다.

- Noblesse Piercing 글로벌 B2B 카탈로그와 견적 업무
- PORS 매장 POS와 Noblesse 온라인 견적 연동
- Flutter 발주·수령 프로그램
- Flutter 상품·재고·직원 관리 앱 `product_s`
- 별도 B2C 액세서리몰 Blingping
- 상품 원본 사진, 상세페이지 산출물, 상품 ZIP 카탈로그
- 브랜드·명함·사업자료와 해외시장 조사 기록
- Firebase, PostgreSQL, 배포, 운영 준비 관련 기록

이 인수인계 저장소는 회사의 모든 실행 파일을 한 폴더에 합친 복사본이
아니다. 서로 다른 시스템의 위치, 책임, 현재 상태, 다음 작업 순서를
연결하는 통제 문서다.

## 무엇을 현재 사실로 볼 것인가

충돌하는 기록이 있으면 다음 순서를 따른다.

1. 사용자의 현재 지시
2. 각 실제 저장소의 현재 `AGENTS.md`, Git 상태, 코드와 테스트
3. 이 인수인계 문서에 적힌 검증 날짜와 증거
4. 과거 Codex/ChatGPT 대화의 설계안과 보고

대화에서 구현됐다고 말했더라도 B 컴퓨터에 소스·commit·배포 증거가 없으면
`과거 보고`로만 취급한다. 반대로 현재 Git 코드가 오래된 업무 계약과
충돌하면 자동으로 병합하거나 배포하지 않는다.

## 회사 시스템 지도

| 영역 | 회사 역할 | 현재 B 컴퓨터 상태 | 상세 문서 |
| --- | --- | --- | --- |
| Noblesse 웹 | 글로벌 Buyer용 B2B 카탈로그·견적 | GitHub 체크포인트 복원됨 | `01_NOBLESSE_WEB_AND_READINESS.md` |
| Noblesse-PORS 연동 | 온라인 견적을 PORS에서 읽고 처리 | 양쪽 코드 존재, 계약 충돌 점검 필요 | `02_ONLINE_QUOTE_AND_PORS_INTEGRATION.md` |
| 상품·가격·상세 QA | 상품 카드, 시장별 가격, 이미지, 상세페이지 | 여러 브랜치·로컬 자산으로 분산 | `03_CATALOG_PRICING_AND_PRODUCT_QA.md` |
| PORS | 매장 POS, 영수증, 재고 업무 | GitHub main과 Draft PR 작업공간 복원됨 | `05_PORS_APP_HANDOFF.md` |
| 발주 프로그램 | 사무실 발주와 매장 수령 | 대화만 이전됨, source 없음 | `06_PROCUREMENT_APP_HANDOFF.md` |
| 브랜드·시장 | 브랜드 규칙, 분류, 일본시장, 법무 검토 항목 | 결정과 조사 기록을 요약함 | `07_COMPANY_BRAND_PRODUCTS_MARKETS.md` |
| 저장소 지도 | 저장소, 브랜치, PR, 경계 | 현재 경로와 위험을 정리함 | `08_COMPANY_SYSTEMS_AND_REPOSITORIES.md` |
| 원본 자산 | 촬영 원본, 상세페이지, ZIP, 명함·사업문서 | 일부 B 로컬에만 존재 | `09_LOCAL_ASSETS_AND_TRANSFER_GAPS.md` |
| 대화 색인 | Codex/ChatGPT 작업과 문서의 연결 | ID와 주제만 보존 | `10_CONVERSATION_REGISTRY.md` |
| `product_s` | 상품·재고·직원·수수료 관리 Flutter 앱 | B 로컬 source 있음, dirty | `11_PRODUCT_S_APP_HANDOFF.md` |
| Blingping | 별도 소비자용 B2C 액세서리몰 | B 로컬 source 있음, 원격 없음 | `12_BLINGPING_B2C_HANDOFF.md` |

## 절대 섞으면 안 되는 업무 계약

### Noblesse Piercing B2B

- 한국어 주 브랜드명은 `귀족`, 영문은 `Noblesse Piercing`이다.
- 직접 구매·결제 대신 `견적 리스트 -> 견적 요청 -> 내 견적 요청` 흐름이다.
- 승인된 Buyer만 가격과 견적 기능을 사용한다.
- 온라인 견적은 요청 시점 서버 계산, 할인 0%, VAT 10%가 현재 계약이다.
- 기존 PORS 영수증은 수동 연결한다. 온라인 견적을 이유로 매출·주문·결제·
  영수증·재고를 자동 생성하거나 변경하지 않는다.

### Blingping B2C

- 회원, 주문, 입금, 배송, 취소, 반품을 다루는 별도 소비자 쇼핑몰이다.
- Noblesse B2B 화면에 장바구니·결제·반품 용어를 역수입하지 않는다.
- 고객 개인정보, 법적 동의, 이메일·결제 provider 설정은 별도 보안 범위다.

### 별도 내부 앱

- PORS, 발주 앱, `product_s`는 서로 다른 앱이자 저장소다.
- Noblesse 웹 저장소 안에 Flutter/APK/Capacitor 구조를 추가하지 않는다.
- 앱의 가격·수수료·권한·Firestore/API 계약은 명시적 요청 없이 바꾸지 않는다.

## 현재 이전 완료 수준

### Git으로 이어갈 수 있음

- Noblesse 인수인계 브랜치:
  `dgkim0127/noblesse`의 `codex/workspace-sync-20260814`
- PORS main과 온라인 견적 Draft PR 작업공간:
  `dgkim0127/pors`

### B 컴퓨터에 있지만 Git만으로 복구할 수 없음

- `C:\Users\MINE\doq\product_s`: 로컬 수정 2개 파일이 남아 있음
- `C:\Users\MINE\Documents\Codex\2026-07-14\sites-plugin-sites-openai-bundled-3`:
  Blingping source는 clean이지만 일반 Git remote가 없음
- `C:\Users\MINE\Desktop\귀걸이`: 촬영·상세페이지 자산 약 2.13GB
- `C:\Users\MINE\Downloads`: 상품 ZIP과 무관한 ZIP이 함께 있는 로컬 보관소
- `C:\Users\MINE\Desktop\명함`, `C:\Users\MINE\Desktop\비지니스`:
  개인정보를 포함할 수 있는 회사 문서

### 아직 A 컴퓨터에서 가져와야 함

- `D:\noblesse-procurement` Flutter 발주 앱 source와 정확한 Git 이력
- 발주 앱의 검증된 release/APK가 필요하다면 그 기준 artifact와 signing 절차
- B 컴퓨터에 없는 추가 원본 디자인·계약·운영자료

## 현재 가장 큰 중단 위험

1. PORS Draft PR #5에는 온라인 견적을 PORS 매출로 자동 등록하는 구현 이력이
   있어 현재의 `기존 영수증 수동 연결` 계약과 충돌할 수 있다.
2. Noblesse 체크포인트는 최신 `main`보다 오래된 계열이다. `main`으로 바로
   병합하거나 배포하면 안 된다.
3. 발주 앱 source가 B 컴퓨터에 없어 대화 설명만으로 재작성하면 안 된다.
4. `product_s`는 사용자 로컬 수정이 남아 있고 원격 소유 계정도 다르다.
5. Blingping은 source는 있으나 일반 Git remote가 없어 다른 컴퓨터에서
   자동 복구할 수 없다.
6. 촬영 원본과 상품 ZIP은 대용량·비Git 자산이다. 한 군데에만 두면 분실된다.
7. 과거 시장·법무·상점 목록·검색엔진 인증 기록은 시점이 지난 정보이므로
   실행 전에 공식 자료로 재검증해야 한다.

## B 컴퓨터 Codex에 처음 보낼 문장

```text
귀족회사 전체 인수인계를 시작할게.
C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle\AGENTS.md,
CODEX_HANDOFF.md,
docs\codex-handoff\00_COMPANY_MASTER_HANDOFF.md,
docs\codex-handoff\README.md를 전부 읽어줘.
아직 코드를 수정하지 말고 회사 시스템별 실제 경로, Git 저장소와 branch,
dirty 여부, local-only 자산, A 컴퓨터에서 아직 가져와야 하는 항목을
읽기 전용으로 확인해줘. Noblesse B2B, PORS, 발주 앱, product_s,
Blingping B2C를 서로 섞지 마. 개인정보나 비밀정보를 출력하지 말고,
main 병합, PR, 배포, DB migration, Firebase 변경도 하지 마.
확인 결과와 안전하게 이어갈 수 있는 작업 목록만 한국어로 보고해줘.
```

그 다음에는 이 문서의 시스템 지도에서 작업 하나를 선택하고 해당 상세
문서만 추가로 읽힌다. 여러 시스템을 한 번에 수정하지 않는다.

## 회사 자료 보존 원칙

- 코드와 비민감 문서는 각 시스템의 private Git 저장소에 보존한다.
- 사진 RAW, 대량 JPEG, ZIP, APK는 Git에 넣지 않고 외장 저장장치나 접근이
  제한된 클라우드 저장소에 이중 백업한다.
- 파일 수, 전체 크기, 해시 목록을 함께 보관해 복사 누락을 검증한다.
- `.env`, service account, signing key, PIN, API key, 세션, 인증 토큰,
  고객·직원 개인정보는 인수인계 Git에 넣지 않는다.
- 대화 원문은 민감정보가 섞일 수 있으므로 통째로 복사하지 않고 결정·상태·
  작업 ID만 이 문서 묶음에 보존한다.
