# Naver Shopping Inspired B2B UI Plan

Noblesse 구매자몰은 네이버쇼핑의 구조를 그대로 복제하지 않고, 검색 중심 탐색과 피드형 추천 모듈을 B2B 도매 주문에 맞게 해석한다.

## Home Structure

1. Sticky search header
   - 로고는 작게 유지한다.
   - 검색창을 가장 넓고 눈에 띄게 둔다.
   - 내 주문, 거래처, 장바구니는 작은 아이콘 버튼으로 정리한다.

2. Category shortcuts
   - 바벨, 라블렛, 링, 체인, 신상품, 베스트, 재입고, MOQ 특가를 아이콘형 버튼으로 보여준다.
   - 모바일에서는 가로 스크롤 칩으로 유지한다.

3. Benefit strip
   - 큰 히어로 배너 대신 거래처 등급, 할인율, 환율, 최소 주문 금액을 얇게 보여준다.
   - 첫 화면에서 상품 피드가 바로 보이도록 높이를 낮게 유지한다.

4. Featured feed
   - 오늘의 도매 혜택
   - 실시간 베스트
   - 신상품
   - MOQ 낮은 상품
   - 거래처 추천
   - 최근 담은 상품

5. Product grid
   - 검색과 필터가 적용된 전체 카탈로그.
   - 빠른 담기 중심이며 상세 페이지는 다음 단계로 둔다.

6. Cart summary
   - 홈에서는 작고 가볍게 둔다.
   - 주문 단계에서만 상세 수량 조절을 강조한다.

## Interaction Rules

- 검색어는 상품명, 품번, 일본어명, 카테고리, 소재, 게이지에 적용한다.
- 카테고리 아이콘은 필터 상태와 연결한다.
- 판매중이 아닌 상품은 담기 버튼을 비활성화한다.
- 수량은 항상 MOQ 이상, MOQ 배수로 보정한다.
- 최소 주문 금액 전에는 주문 요청 버튼을 막고 부족 금액을 표시한다.

## Responsive Rules

Desktop:
- header 1 row
- 4-column product grid when width allows
- compact cart summary on the side

Tablet:
- 2-column product grid
- cart summary below or side depending on available width
- filters stay compact

Mobile:
- logo/action row + search row
- horizontal category shortcuts
- 1-column product cards
- fixed bottom cart bar
- enough bottom padding so content is not hidden behind the cart bar

