# 귀족회사 Codex·ChatGPT 대화 색인

확인 기준일: 2026-08-14

## 원칙

같은 OpenAI 계정에서 대화 제목이 보이는 것과 로컬 source가 옮겨진 것은
다르다. 이 색인은 어느 대화가 어느 회사 영역을 다뤘는지 연결하며, 실행에
필요한 결정은 다른 handoff 문서에 옮긴다.

대화 원문에는 인증 token, 검색엔진 verification 값, 개인정보, PIN 등이
포함될 수 있어 통째로 Git에 복사하지 않는다.

## 주요 Codex 작업

| 작업 ID | 주제 | 현재 읽을 문서 |
| --- | --- | --- |
| `019ffe2c-435e-7b71-a6cc-2034e1554cde` | 현재 A/B 컴퓨터 이전 | `00_COMPANY_MASTER_HANDOFF.md` |
| `019fcb74-e509-7a63-9821-3c7bd1692efe` | Noblesse-PORS 온라인 견적·가격 | `02_ONLINE_QUOTE_AND_PORS_INTEGRATION.md` |
| `019fca69-33b1-75f1-bca0-017264153209` | Noblesse 운영 준비도 | `01_NOBLESSE_WEB_AND_READINESS.md` |
| `019f3f84-6ea3-79b2-b95c-abce30768705` | 상품 상세 QA | `03_CATALOG_PRICING_AND_PRODUCT_QA.md` |
| `019e7107-3dd6-7e03-a535-1de34ee38f0e` | 견적 리스트 storefront UX | `01_NOBLESSE_WEB_AND_READINESS.md` |
| `019ea4c4-fb26-73f3-ace3-7aa2a5d0e597` | PORS 저장소·APK·견적 목록 | `05_PORS_APP_HANDOFF.md` |
| `019fb0f6-3599-7520-8d7f-1d042e41b863` | Flutter 발주·수령 앱 | `06_PROCUREMENT_APP_HANDOFF.md` |
| `019da8cf-3d62-73b2-87c9-72e79cf244f6` | `product_s` PDF dialog·모바일 UI | `11_PRODUCT_S_APP_HANDOFF.md` |
| `019da8b3-0d34-7a62-b223-6f6c05a123db` | `product_s` 초기 구조·UI 진단 | `11_PRODUCT_S_APP_HANDOFF.md` |
| `019f5e72-2762-7c03-8460-6596322b1aac` | Blingping 가입·동의·private 배포 | `12_BLINGPING_B2C_HANDOFF.md` |
| `019f823b-5eef-7cd0-b6ba-2c76e3482882` | 귀걸이 상세페이지 사진 생성 | `09_LOCAL_ASSETS_AND_TRANSFER_GAPS.md` |

## ChatGPT 프로젝트 `피어싱`의 주요 주제

다음은 대화 제목·내용에서 확인된 회사 지식 영역이다.

- 일본 피어싱 도매 진출과 플랫폼 검토
- 로고와 앱 아이콘 시안
- 상세페이지 이미지와 template/preset 설계
- 밝은 관리자 운영 콘솔 UI 방향
- 사용자 유형, 승인 가격, 시장별 환율 가격 설계
- 상품 taxonomy와 조건부 filter
- DNS와 Search Console verification
- 모바일 branding 색상 탐색
- 사업자·통신판매·법적 준비 안내
- 일본 Buyer outreach, 도쿄 상점·출장 조사

이 중 DNS/Search Console 대화의 실제 verification 값, 사업자·개인정보,
연락처는 인수인계 문서에 옮기지 않았다. 시장·법무·상점 정보는 오래될 수
있으므로 현재 공식 자료로 재검증한다.

## 대화에서 나온 내용의 상태 분류

| 분류 | 예 | 처리 |
| --- | --- | --- |
| 현재 회사 규칙 | B2B 견적 용어, 브랜드명, 금지 기능 | `AGENTS.md` 우선 |
| Git으로 검증 가능 | branch, commit, 테스트, 실제 code | 현재 checkout에서 재확인 |
| 과거 구현 보고 | 발주 앱 26 tests, 일부 Functions 배포 | source 복원 후 재검증 |
| 탐색안 | 보조 색상, 상세 preset, 시장별 정책 | 사용자 선택 전 확정 금지 |
| 시점 민감 조사 | 상점, 플랫폼, 법무, 세금 | 공식 source로 새로 확인 |
| 민감정보 | token, PIN, 개인정보 | Git/채팅 요약에 복사 금지 |

## 새 B컴퓨터 작업에서 쓰는 문장

회사 전체 상태 확인:

```text
docs/codex-handoff/00_COMPANY_MASTER_HANDOFF.md와
10_CONVERSATION_REGISTRY.md를 읽어줘. 과거 대화를 새로 요약해서 추측하지
말고, 문서에 연결된 실제 저장소와 로컬 경로부터 읽기 전용으로 확인해줘.
```

특정 작업 계속하기:

```text
회사 시스템 중 [Noblesse 웹/PORS/발주 앱/product_s/Blingping/상품 사진]만
계속할게. 00 마스터 문서와 해당 상세 문서를 읽고 실제 source, branch,
dirty 상태를 먼저 확인해줘. 다른 시스템은 수정하지 마.
```

원래 대화 자체가 B의 사이드바에 보이면 그 대화를 열어 계속해도 된다.
다만 해당 대화의 작업공간이 A의 `D:\...`를 가리키는 경우 B의 source가
자동 연결된 것은 아니므로, 먼저 B 절대 경로와 Git 상태를 확인한다.
