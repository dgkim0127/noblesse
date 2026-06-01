# Noblesse B2B Catalog

React + Vite 기반의 일본 거래처용 B2B 주문 요청몰입니다. 외형은 주얼리 소매몰처럼 구성하고, 회원 승인 이후에만 회원가, MOQ, 장바구니, 주문 요청 기능을 제공합니다.

## Local Development

```bash
npm install
npm run dev
```

PowerShell에서 `npm` 실행 정책 오류가 나면 `npm.cmd run dev`처럼 `npm.cmd`를 사용하면 됩니다.

## Production Workflow

웹사이트 제작 흐름은 `docs/codex-skill-workflow.md`를 기준으로 진행합니다.

- 디자인/반응형 프레임: `figma:figma-generate-design`, `figma:figma-use`
- 상품 데이터 템플릿: `spreadsheets:Spreadsheets`, `data/product-import-template.csv`
- 상품/배너 이미지 방향: `imagegen`
- React 품질 점검: `vercel:react-best-practices`
- 브라우저 검증: `browser:browser`, `vercel:agent-browser-verify`, `vercel:verification`

네이버쇼핑식 구매자 홈 구조는 `docs/naver-shopping-b2b-ui-plan.md`에 정리되어 있습니다.

## Firebase Setup

1. Firebase Console에서 Web App을 생성합니다.
2. Authentication > Sign-in method에서 Email/Password provider를 활성화합니다.
3. Firestore Database를 생성합니다.
4. Storage를 활성화합니다.
5. `.env.example`을 기준으로 `.env.local`을 만들고 Firebase Web App 값을 입력합니다.
6. `firebase deploy --only firestore:rules,storage,functions`로 Rules와 Callable Functions를 배포합니다.

## Firestore Collections

- `products`: 비회원도 읽을 수 있는 공개 상품 정보
- `productOptions`: 승인 회원만 읽는 옵션, 회원가, MOQ, 재고 상태
- `users`: 역할, 승인 상태, 거래처별 할인율, 최소 주문 금액
- `memberApplications`: 거래처 신청과 사업자 증빙 경로
- `carts/{uid}/items`: 회원별 장바구니
- `orders`: Functions가 생성하는 주문 요청 스냅샷
- `categories`, `banners`, `homeSections`: 홈 운영 데이터

## Firebase Deploy Files

- `firebase.json`: Hosting 및 Firestore rules 연결
- `firestore.rules`: 비회원, 승인 회원, 관리자 역할 기반 규칙
- `storage.rules`: 상품 이미지, 배너, 사업자 증빙 권한 규칙
- `functions/`: 주문 검증, 회원 승인, 주문 상태 변경 Callable Functions
- `.firebaserc.example`: 프로젝트 ID 예시

로컬에서 Firebase 환경 변수가 없으면 승인 회원/비회원 프로토타입 전환 모드로 동작합니다. 운영 환경에서는 이메일 인증, Rules, Functions 배포가 필요합니다.
