# Codex Skill Workflow for Noblesse

이 문서는 Noblesse B2B 구매자몰을 계속 제작할 때 사용할 Codex 스킬 흐름입니다. 목적은 네이버쇼핑식 탐색 UX를 참고하되, 일본 거래처용 도매 주문 흐름에 맞게 디자인, 데이터, 구현, 검증을 반복 가능하게 만드는 것입니다.

## 1. Design System and Figma

사용 스킬:
- `figma:figma-generate-design`
- `figma:figma-use`

적용 시점:
- 구매자 홈, 상품 카드, 장바구니, 주문 요청 화면의 시각 구조를 정리할 때
- 컴포넌트 토큰, spacing, 색상, 상태 뱃지, 반응형 프레임을 Figma로 넘길 때

현재 디자인 원칙:
- 검색창이 첫 화면의 중심이어야 한다.
- 큰 히어로보다 아이콘 카테고리, 추천 모듈, 베스트 피드가 먼저 보이게 한다.
- 관리자 상태, Firebase 상태, 운영 패널은 구매자 화면에서 렌더링하지 않는다.
- B2B 정보는 조용하게 표시한다: 거래처 등급, 할인율, 최소 주문 금액, MOQ.

Figma 전달용 프레임:
- Desktop: 1440px, sticky header, 4-column product grid, compact cart summary
- Tablet: 1024px, 2-column product grid, cart below feed
- Mobile: 390px, search second row, horizontal category chips, 1-column product cards, bottom cart bar

## 2. Product Data and Spreadsheet

사용 스킬:
- `spreadsheets:Spreadsheets`

적용 시점:
- 상품을 대량 등록하기 전
- 일본어 상품명, MOQ, 도매가, 소재, 게이지, 상태를 정리할 때
- Firestore import 전 데이터 검수표가 필요할 때

기본 템플릿:
- `data/product-import-template.csv`

필수 필드:
- `id`
- `ko`
- `ja`
- `category`
- `subcategory`
- `material`
- `size`
- `gauge`
- `wholesale`
- `retail`
- `vat`
- `moq`
- `status`
- `rank`
- `isNew`
- `isRestocked`
- `tags`
- `imageUrl`

검수 규칙:
- `status`는 `판매중`, `품절`, `숨김` 중 하나로 맞춘다.
- `moq`는 1 이상 숫자로 입력한다.
- `wholesale`은 도매가, `retail`은 참고 소비자가로 분리한다.
- `tags`는 쉼표 대신 세미콜론으로 구분한다. 예: `베스트;추천;MOQ특가`
- `imageUrl`은 지금 비워도 되지만 Firebase Storage 전환을 고려해 필드는 유지한다.

## 3. Visual Assets

사용 스킬:
- `imagegen`

적용 시점:
- 카테고리 대표 이미지, 시즌 배너, 소재별 썸네일이 필요할 때
- 실제 상품 사진이 준비되기 전 임시 비주얼 방향을 잡을 때

권장 프롬프트 방향:
- 밝은 배경의 피어싱 주얼리 제품 사진
- B2B 도매몰 느낌의 깔끔한 카탈로그 이미지
- 과한 패션 화보보다 상품 형태가 명확히 보이는 이미지

이미지 파일 배치:
- 정적 샘플: `public/assets/`
- React import가 필요한 소스 이미지: `src/assets/`
- 실제 운영 상품 이미지는 Firestore의 `imageUrl`과 Firebase Storage URL을 기준으로 연결한다.

## 4. React Implementation Quality

사용 스킬:
- `vercel:react-best-practices`

적용 시점:
- JSX 컴포넌트를 2개 이상 수정한 뒤
- 상태, 필터, 장바구니 로직을 바꾼 뒤
- 반응형 UI가 복잡해질 때

체크리스트:
- 구매자 화면과 관리자 화면은 분리한다.
- 상품 카드, 추천 섹션, 장바구니 요약, 필터 컨트롤은 독립 컴포넌트로 유지한다.
- 파생 데이터는 `useMemo`로 계산한다.
- 이벤트 핸들러는 MOQ 보정과 최소 주문 금액 정책을 깨지 않게 한다.
- 버튼에는 실제 `button` 요소를 쓰고 접근 가능한 텍스트를 유지한다.

## 5. Browser Verification

사용 스킬:
- `browser:browser`
- `vercel:agent-browser-verify`
- `vercel:verification`

적용 시점:
- 화면 레이아웃을 바꾼 뒤
- dev server가 켜져 있을 때 `http://localhost:5173/`에서 직접 확인할 때

검증해야 할 폭:
- Desktop: 1440 x 900
- Tablet: 1024 x 768
- Mobile: 390 x 844

검증 항목:
- 검색창, 아이콘 카테고리, 상품 카드, 장바구니 바가 겹치지 않는다.
- 추천 검색어 클릭 시 검색어가 적용된다.
- 아이콘 카테고리 클릭 시 필터가 적용된다.
- 품절 제외, 소재, 게이지, MOQ, 정렬이 동시에 동작한다.
- 최소 주문 금액 미달이면 주문 요청 버튼이 비활성화된다.
- 주문 요청 저장 실패 시 사용자에게 메시지가 보인다.

## 6. Deployment

사용 스킬:
- `vercel:deployments-cicd`
- `vercel:env-vars`
- `vercel:vercel-storage` 또는 Firebase 설정 문서

적용 시점:
- 실제 배포 URL이 필요할 때
- Firebase 환경 변수를 Vercel에 넣을 때
- 이미지 저장소, 주문 데이터, 권한 정책을 운영 기준으로 다듬을 때

배포 전 필수 확인:
- `npm.cmd run lint`
- `npm.cmd run build`
- Firebase 환경 변수 입력
- Firestore security rules 운영 권한 분리
- 관리자/거래처 역할 분리

