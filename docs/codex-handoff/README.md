# Noblesse Codex 작업 인수인계 색인

작성 기준일: 2026-08-14

## 이 문서 묶음의 역할

이 폴더는 A 컴퓨터에서 진행한 Noblesse 관련 Codex 작업을 B 컴퓨터에서
안전하게 이어가기 위한 요약본이다. 원본 대화 전문을 복제한 것이 아니라,
다시 작업하는 데 필요한 결정 사항, 작업공간, 브랜치, 검증 결과, 미완료
항목, 금지 사항을 작업별로 정리했다.

현재 B 컴퓨터에서 확인된 체크포인트 복제본은 다음과 같다.

- 로컬 경로: `C:\Users\MINE\Documents\Codex\noblesse-handoff-bundle`
- 저장소: `https://github.com/dgkim0127/noblesse.git`
- 브랜치: `codex/workspace-sync-20260814`
- 최초 스냅샷 커밋: `783530c8e6c729146b8d52b5d1be09976ec113de`

이 브랜치는 오래된 `codex/member-catalog-v1` 계열의 작업 트리를 보존한
체크포인트다. 최신 운영 `main`으로 바로 합치거나 배포할 수 있는 브랜치가
아니다.

## 가장 먼저 읽을 순서

1. 루트 `AGENTS.md`
2. 루트 `CODEX_HANDOFF.md`
3. 이 `README.md`
4. 아래에서 사용자가 선택한 작업 문서 하나

여러 문서의 코드를 한 작업공간에 동시에 섞지 않는다.

## 작업별 색인

| 구분 | 관련 Codex 작업 | 당시 작업공간 | 상태 | 읽을 문서 |
| --- | --- | --- | --- | --- |
| Noblesse 본체/출시 준비 | `Noblesse-PORS 온라인`, `AGENTS.md 및 현재 프로젝트` 계열 | `D:\noblesse` | 부분 완료, 운영 준비 아님 | `01_NOBLESSE_WEB_AND_READINESS.md` |
| 구매자 견적 리스트 UI | Noblesse 웹 저장소 전용 | `D:\noblesse-main-work` | 과거 성공 및 배포 이력 있음 | `01_NOBLESSE_WEB_AND_READINESS.md` |
| Noblesse-PORS 온라인 견적 | `Noblesse-PORS 온라인`, `pors 앱 저장소 전용` | 별도 두 작업공간 | 부분 완료, 핵심 테스트 1개 실패 기록 | `02_ONLINE_QUOTE_AND_PORS_INTEGRATION.md` |
| 상품 카드 가격/다국어 통화 | 상품 카드 수정 작업 | `D:\codex-temp-noblesse-npi-market-prices` | 코드 push, 운영 Backend 배포 안 함 | `03_CATALOG_PRICING_AND_PRODUCT_QA.md` |
| 상품 상세 QA | `Map site-wide QA...` | `D:\noblesse-main-work` | 일부 검증, commit/push 불명확 | `03_CATALOG_PRICING_AND_PRODUCT_QA.md` |
| PORS 본체 | `pors 앱 저장소 전용` | `D:\pors` 또는 전용 clean checkout | Noblesse 웹과 별도 | `04_SEPARATE_PORS_AND_PROCUREMENT.md` |
| Flutter 조달 앱 | `발주 프로그램 계획 수립` | `D:\noblesse-procurement` | 데모 수준, 출시 경로 미검증 | `04_SEPARATE_PORS_AND_PROCUREMENT.md` |

Codex 작업 ID는 작업을 찾거나 비교할 때만 사용한다.

- 현재 기기 이전 작업: `019ffe2c-435e-7b71-a6cc-2034e1554cde`
- 온라인 견적/상품 가격: `019fcb74-e509-7a63-9821-3c7bd1692efe`
- 출시 준비도: `019fca69-33b1-75f1-bca0-017264153209`
- 상품 상세 QA: `019f3f84-6ea3-79b2-b95c-abce30768705`
- 구매자 견적 리스트: `019e7107-3dd6-7e03-a535-1de34ee38f0e`
- PORS 저장소: `019ea4c4-fb26-73f3-ace3-7aa2a5d0e597`
- Flutter 조달 앱: `019fb0f6-3599-7520-8d7f-1d042e41b863`

## 작업공간을 섞지 않는 규칙

| 과거 A 컴퓨터 경로 | 역할 | B 컴퓨터에서의 처리 |
| --- | --- | --- |
| `D:\noblesse` | 오래된 Noblesse 체크포인트의 원본 | 현재 C 드라이브 복제본으로 보존됨 |
| `D:\noblesse-main-work` | 당시 최신 운영 기준 웹 작업공간 | 필요할 때 `main` 기준 별도 clean clone 생성 |
| `D:\noblesse-pors-quote-integration` | 온라인 견적용 Noblesse 작업공간 | 해당 원격 브랜치를 별도 clone/worktree로 복원 |
| `D:\pors-online-quote-workspace` | 온라인 견적용 PORS clean 작업공간 | PORS 저장소에서 별도 복원 |
| `D:\codex-temp-noblesse-npi-market-prices` | 상품 가격/카드 전용 작업공간 | 해당 브랜치를 별도 복원 |
| `D:\pors` | 기존 PORS 본체, 과거 dirty 가능 | 온라인 견적 작업에는 사용 금지 |
| `D:\noblesse-procurement` | 별도 Flutter 조달 앱 | Noblesse 웹과 별도 저장소로 취급 |

B 컴퓨터에는 현재 `D:` 드라이브가 확인되지 않았다. 위 경로를 그대로
명령에 넣지 말고, 먼저 실제 존재 여부와 원격 저장소/브랜치를 확인한다.

## B 컴퓨터 Codex에 처음 보낼 문장

아래 문장을 그대로 새 작업에 붙여 넣는다.

```text
이 폴더는 A 컴퓨터에서 옮긴 Noblesse 체크포인트입니다.
AGENTS.md, CODEX_HANDOFF.md, docs/codex-handoff/README.md를 전부 읽어주세요.
아직 코드를 수정하지 말고 현재 절대 경로, git 브랜치, git status,
origin URL, 최신 원격 상태를 먼저 확인해 주세요. README의 D:\ 경로는
A 컴퓨터의 과거 경로이므로 B 컴퓨터에 실제로 존재한다고 가정하지 마세요.
main 병합, PR 생성, 운영 배포, DB migration, Backend/Firebase Hosting 배포는
제가 명시적으로 승인하기 전까지 금지합니다. 확인 결과와 이어갈 수 있는
작업 목록만 한국어로 보고해 주세요.
```

그 다음에는 다음 중 하나만 선택해 지시한다.

```text
docs/codex-handoff/02_ONLINE_QUOTE_AND_PORS_INTEGRATION.md를 읽고,
온라인 견적 작업을 재개하기 위한 읽기 전용 상태 점검만 해줘.
```

또는

```text
docs/codex-handoff/03_CATALOG_PRICING_AND_PRODUCT_QA.md를 읽고,
상품 카드 가격 작업의 원격 브랜치와 현재 검증 상태만 확인해줘.
```

## 공통 금지 사항

- 사용자 승인 없이 `main` 병합 또는 PR 생성
- 운영 배포, Firebase Hosting/Backend 배포
- DB migration 실행 또는 실제 데이터 변경
- 자동 영수증, 매출, 주문, 결제, 재고 변경
- 직접 구매/결제 UX 추가
- 토큰, 비밀번호, API 키, 쿠키를 문서나 Git에 저장
- 서로 다른 작업공간의 변경을 한 브랜치에 합치기

## 기록이 불완전한 작업

사이드바에 보였던 `PostgreSQL 17 설치` 작업은 현재 확보한 Noblesse
작업 기록에서 정확한 설치 결과와 설정값을 복원하지 못했다. 이 문서에는
추측으로 비밀번호, 포트, 서비스 이름을 넣지 않았다. PostgreSQL 작업을
이어갈 때는 B 컴퓨터에서 설치 여부, 버전, 서비스 상태, 포트, 데이터
존재 여부를 읽기 전용으로 다시 확인해야 한다.

`AGENTS.md 및 현재 프로젝트`의 지속 규칙은 루트 `AGENTS.md`에 보존되어
있다. 화면에 보였던 모든 대화 문장을 그대로 보관한 것은 아니므로, 이
문서와 Git 증거가 충돌하면 현재 Git 상태와 사용자 지시를 우선한다.
