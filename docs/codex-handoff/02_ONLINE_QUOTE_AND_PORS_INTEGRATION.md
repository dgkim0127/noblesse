# Noblesse-PORS 온라인 견적 연동

## 작업공간과 브랜치

이 기능은 웹 체크포인트와 별도의 두 작업공간에서 진행했다.

| 역할 | A 컴퓨터 과거 경로 | 브랜치 | 당시 상태 |
| --- | --- | --- | --- |
| Noblesse API/관리자/고객 공개 | `D:\noblesse-pors-quote-integration` | `codex/pors-quote-integration` | tracked 8개 수정, 신규 2개, Draft PR #29 |
| PORS 웹 견적 UI | `D:\pors-online-quote-workspace` | `codex/online-quote-workspace` | 당시 clean, Draft PR #1 |

과거 HEAD는 각각 `cc3f508`, `cee7ceb`였지만 이후 원격이 바뀌었을 수 있다.
B 컴퓨터에서 이 브랜치들을 별도 clean clone/worktree로 복원하기 전에는
현재 C 드라이브 체크포인트에 코드를 섞지 않는다. 기존 `D:\pors`는 온라인
견적 구현에 사용하지 않는다.

## 확정된 비즈니스 계약

```text
고객 견적 요청
-> PORS 준비 수량 저장
-> 서버 가격 미리보기
-> 내부 확정
-> 고객 공개/PDF 발행
-> 필요 시 PORS에서 이미 만든 영수증을 수동 연결
```

- 가격은 요청 시점의 서버 가격을 사용한다.
- 금액은 준비 수량으로 계산한다.
- Noblesse 온라인 견적 할인은 항상 0%다.
- VAT는 10%다.
- 단가 수동 override는 거부한다.
- 내부 확정과 고객 공개는 서로 다른 단계다.
- 고객은 최신 공개 문서/PDF만 볼 수 있다.
- 쓰기는 `expectedVersion`과 `idempotencyKey`로 보호한다.
- 오래된 버전 쓰기는 409 충돌로 처리한다.
- 영수증은 PORS에서 먼저 만든 기존 영수증을 사람이 명시적으로 연결한다.
- sale, order, payment, receipt, stock을 자동 생성/변경하지 않는다.
- 일반 PORS 매장의 할인 정책은 유지하되 웹 견적 할인과 분리한다.
- 웹 유입 거래처는 일반 거래처/할인 편집 데이터에 섞지 않고 읽기 전용
  웹 견적 영역에서 식별한다.

## 구현된 것으로 확인된 범위

Noblesse 쪽에는 다음 코드가 상당 부분 존재했다.

- 온라인 견적 목록/상세용 POS API
- 준비 수량 저장
- 서버 가격 미리보기
- 내부 확정과 고객 공개 분리
- PDF 발행/다운로드
- `expectedVersion`, `idempotencyKey`, 409 처리
- 기존 PORS 영수증 수동 연결용 backend 경로

PORS 쪽에는 다음 UI/동작이 존재했다.

- 온라인 견적 목록/상세
- 사진, 상품 코드, 옵션
- 요청/준비/취소 수량과 취소 사유
- 준비 저장, 가격 미리보기, 내부 확정
- 계산 테스트와 온라인 견적 workspace 테스트 통과 기록

주요 Noblesse API 경로:

```text
GET  /admin/pos/quotes
GET  /admin/pos/quotes/:quoteId
PUT  /admin/pos/quotes/:quoteId/picking
POST /admin/pos/quotes/:quoteId/price-preview
POST /admin/pos/quotes/:quoteId/finalize
POST /admin/pos/quotes/:quoteId/publish
POST /admin/pos/quotes/:quoteId/receipt-link
```

주요 Noblesse 파일:

- `backend/src/services/adminPosService.js`
- `backend/src/services/posQuotePricing.js`
- `backend/src/db/queries/adminPosQueries.js`
- `backend/src/routes/adminRoutes.js`
- `src/api/adminApi.js`
- `src/pages/admin/AdminQuotePage.jsx`
- `src/pages/admin/adminPosQuoteCopy.js`
- `backend/migrations/20260730_pos_quote_publication.sql`

주요 PORS 파일:

- `src/online-quotes.js`
- `src/standalone.js`
- `tests/online-quotes.test.mjs`
- `package.json`

## 마지막으로 확인된 차단 요소

Noblesse backend 테스트는 491개 중 490개가 통과하고 1개가 실패했다.

```text
TypeError: Online quotes must use the request-time unit price
```

`backend/tests/adminPosService.test.js`의 내부 확정 fixture가 현재 금지된
`overrideUnitPrice: 1800`을 계속 보낸 것이 원인이었다. 계약을 바꾸지 말고
fixture를 요청 시점 단가 기반으로 수정한 뒤 전체 backend 테스트를 다시
실행하는 것이 첫 구현 작업이다.

그 밖의 미완료/검증 필요 항목:

- 고객 공개 전 문서와 구버전 문서 접근 차단 재검증
- `workflow_version >= 2` 온라인 견적에서 기존 buyer decision API 서버 차단
- PORS 웹 견적 UI의 거래처 연결, 영구 할인 편집, 단가 override 제거
- PORS 고객 공개/PDF 공개와 영수증 연결 UI
- 부분 패치 뒤 남은 legacy/undefined symbol 스캔
- 명시적 preview API가 없을 때 기능 비활성화
- 전체 backend/frontend/PORS 검증 매트릭스
- 준비부터 공개, PDF, 수동 영수증 연결까지 preview E2E
- 논리적 commit/push와 Draft PR 최신 상태 확인

과거 UI 패치에는 `transitionWorkflow`, `openIssueDialog`, `nextAction`,
`publicationBlocked`, `workflowNote` 같은 legacy 이름이 남은 기록이 있다.
수정 직후 focused `rg`와 compile을 먼저 실행한다.

## 재개할 때의 읽기 전용 점검

```powershell
git status --short --branch
git remote -v
git log -5 --oneline --decorate
git diff --stat
git diff --cached --stat
```

그 다음 다음 순서를 지킨다.

1. 두 저장소의 실제 원격 브랜치와 Draft PR을 확인한다.
2. 사용자 변경이 남아 있으면 되돌리거나 덮어쓰지 않는다.
3. Noblesse 실패 테스트를 그대로 재현한다.
4. stale fixture만 작은 범위로 고친다.
5. 전체 backend 테스트 후 PORS `npm test`, `npm run build`, `npm run verify`를
   실행한다. 당시 PORS에는 lint script가 없었다.
6. legacy symbol과 직접 구매/결제 문구를 검사한다.
7. preview 설정과 네트워크 목적지를 확인한 뒤에만 E2E를 한다.

## 절대 하지 않을 것

- `D:\pors`의 기존 dirty 작업을 덮어쓰기
- 기존 미커밋 Noblesse 변경을 임의로 되돌리기
- main 병합, 운영 배포, migration 실행
- Backend/Firebase Hosting 배포
- 단가 override를 다시 허용해 테스트를 억지로 통과시키기
- 온라인 견적에서 할인 또는 영구 거래처 편집 허용
- 자동 매출/주문/결제/영수증/재고 변경
- 빈 PORS 견적 목록을 UI 버그라고 단정하거나 가짜 데이터를 생성

## 관련 작업 ID

- `019fcb74-e509-7a63-9821-3c7bd1692efe`
- QA/중단 당시 기록: `019f3f84-6ea3-79b2-b95c-abce30768705`

이 문서의 상태는 과거 작업 종료 시점 증거다. 완료나 운영 준비 완료로
표현하지 않는다.
