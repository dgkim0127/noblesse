# 상품 카드 가격, 다국어 통화, 상품 상세 QA

## 상품 카드 가격 표시 결정

상품 카드는 다음 원칙을 따른다.

- `오팔` 같은 불확실한 색상 요약 메타데이터를 기본 표시하지 않는다.
- 실제 가격이 매핑되었으면 실제 가격을 보여준다.
- 가격행이 아직 완전히 로드/매핑되지 않았으면 `가격 미등록`처럼 단정하지
  않고 `가격 확인 중` 또는 `Price being confirmed` 같은 중립 문구를 쓴다.
- `guest`와 `pending`에게 승인 구매자 가격을 노출하지 않는다.

별도 작업공간 `D:\codex-temp-noblesse-npi-market-prices`, branch
`codex/product-image-hover-zoom-20260811`에서 카드 메타데이터와 테스트를
수정한 기록이 있다.

- commit `e0a99cd`: 카드 색상 요약 제거와 중립 가격 상태 문구
- 당시 727개 상품 preview에서 첫 카드 `₩1,800` 확인
- 테스트 6개, lint, build 통과
- 운영 배포는 하지 않음

이후 같은 별도 작업공간에서 시장/언어별 통화 표시 작업이 진행되었다.

- 한국: KRW
- 영어권: USD
- 일본: JPY
- 대만: TWD
- 관련 commit `2b4c2f1` push 기록
- frontend 290 tests, backend tests, lint, 일반 production bundle 통과 기록
- production build는 필요한 운영 환경값이 없어 중단된 기록
- 한국 `₩1,800`은 화면 확인
- 영어/일본어/대만 실제 통화는 변경된 Backend 배포가 필요하지만 배포하지
  않았으므로 운영 확인 완료로 간주하지 않음

재개 시 해당 브랜치와 commit이 원격에 실제 존재하는지 확인하고, 현재
운영 API/Backend 버전이 그 계약을 제공하는지 먼저 비교한다.

## 상품 상세 페이지 QA 기록

별도 `D:\noblesse-main-work`에서 `src/App.css`와
`src/pages/ProductDetailPage.jsx`의 기존 변경을 검증한 작업이 있었다.

- `git diff --check` 통과, 줄바꿈 경고만 존재
- frontend 144/144 tests 통과
- lint 통과
- build 통과, 기존 큰 chunk 경고만 존재
- `/products/:productId` 확인
- `/zh-TW/products/:productId` 확인
- legacy `/cn`이 query/hash를 보존해 `zh-TW`로 canonicalize됨
- API 모드에서 gallery, info panel, option, 승인 가격 제한 확인
- 직접 구매 CTA 없음
- 해당 확인 시 콘솔 오류 없음

하지만 이 기록에서는 최종 commit/push가 확인되지 않았고, 모든 반응형
크기를 완료했다고 볼 증거도 부족했다. 당시 깨끗한 트리만 허용한 site-wide
QA는 tracked 변경 때문에 `STOPPED_WORKTREE_DIRTY`로 올바르게 중단되었다.

## QA에서 반복하지 않을 실수

- `.pd-page`는 loading shell에도 있으므로 그것만 기다리지 않는다.
- `.pd-panel`과 `.pd-gallery`가 실제 데이터로 채워질 때까지 제한된 retry로
  기다린다.
- 브라우저 도구의 요청 viewport와 CSS `window.innerWidth`가 다를 수 있다.
  반응형 결과에는 실제 `window.innerWidth`를 기록한다.
- HTTP 200이나 저장 toast만으로 올바른 화면/버전을 증명하지 않는다.
- API 모드와 mock 모드를 구분한다.

당시 GET-only API 모드 확인에 사용한 환경 방향은 다음과 같았다.

```text
VITE_NOBLESSE_DATA_MODE=api
VITE_API_BASE_URL=https://noblesse.web.app/api
```

이 값은 당시 기록이다. 현재 API 목적지와 배포 상태를 확인하지 않고 운영
쓰기 요청을 보내지 않는다. preview용 임시 env 파일은 Git에 올리지 않는다.

## clean-tree 중단 규칙

요청이 docs-only 또는 read-only이고 tracked/staged diff가 있으면 먼저
아래 명령으로 확인하고, 허용 범위가 아니면 작업을 중단한다.

```powershell
git status --short
git diff --cached --name-only
git diff --name-only
```

사용자가 특정 dirty 파일만 승인했다면 그 파일만 수정/검증/스테이징한다.
`.firebase/`, `operator-input/`, 임시 파일, secret은 제외한다.

## 관련 작업 ID

- 상품 가격/통화: `019fcb74-e509-7a63-9821-3c7bd1692efe`
- 상품 상세 QA: `019f3f84-6ea3-79b2-b95c-abce30768705`
