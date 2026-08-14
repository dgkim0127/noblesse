# 귀족회사 브랜드·상품·시장 인수인계

확인 기준일: 2026-08-14

## 현재 확정된 브랜드 기준

Noblesse 웹의 최상위 기준은 루트 `AGENTS.md`다.

- 영문 브랜드: `Noblesse Piercing`
- 한국어 브랜드: `귀족`
- `피어싱`은 브랜드명이 아니라 카테고리·서비스 설명으로 사용
- 기본 색상: main `#ff8fa9`, secondary `#2a234f`
- 방향: 무겁지 않은 귀족적 분위기, 현대적 럭셔리, 이미지 중심,
  실무적인 글로벌 B2B 카탈로그

과거 모바일 디자인 대화에서 제안된 deep navy purple `#2e2564`, coral pink
`#fc8f9b`, cream ivory `#fcf7f3`는 디자인 탐색안이다. 현재 `AGENTS.md`의
색상을 자동으로 대체하지 않는다.

## B2B Buyer 흐름

```text
Entry
-> Hero / Event Banner
-> Recommended Products / Collections
-> Category or Search
-> Product Detail
-> Inquiry List
-> Request Quote
-> My Inquiries
```

- `guest`: 상품 탐색 가능, 가격·견적 불가
- `pending`: 승인 대기 안내, 가격·견적 불가
- `approved`: 승인 가격, 견적 리스트, 견적 요청 가능
- `admin`: 별도 운영 콘솔에서 이후 처리

관리자 화면은 구매자 쇼핑 화면의 복제가 아니라 밝고 밀도 높은 운영
콘솔 방향이다. 좁은 사이드바, 표와 상태 가독성, 상품·Buyer·견적 처리
효율을 우선한다.

## 상품 정보와 이미지 기준

Firestore에는 이미지 binary가 아니라 metadata와 URL만 저장한다. 실제
이미지는 Storage/CDN에 두고 다음 `imageSet` 구조를 사용한다.

```js
imageSet: {
  thumb: string,
  card: string,
  detail: string,
  zoom: string
}
```

- thumb: 300px WebP
- card: 600px WebP
- detail: 1200px WebP
- zoom: 1800px WebP

과거 상세페이지 설계 대화에서는 핵심 상품 데이터와 표현 preset을 분리하는
`detailPreset` 및 content block 방향을 논의했다. 이 설계는 기존 코드와
schema를 확인한 뒤에만 적용하며 대화만 보고 새 schema를 확정하지 않는다.

## 상품 분류·필터 후보

대화에서 정리된 후보 축은 다음과 같다.

- 재질
- 카테고리
- 장식
- 구조
- 형태
- 가격대
- 진주·아크릴 등 소재별 조건부 속성
- stone 크기·색상, bar 규격, parts 정보

상품 ZIP의 괄호 숫자는 중복이 많아 안정적인 product code로 사용할 수 없다.
실제 고유 ID, SKU, legacy 번호의 관계를 데이터 import 전에 명시적으로
정리해야 한다.

## 가격과 견적 정책

- 일반 PORS의 매장별 할인은 유지한다.
- Noblesse 온라인 견적은 할인 0%, VAT 10%다.
- 고객이 보내는 단가나 합계는 신뢰하지 않고 서버가 요청 시점에 계산한다.
- 수동 가격 override를 온라인 견적에 추가하지 않는다.
- 가격 데이터가 로드·연결되지 않은 경우 `가격 미등록`처럼 단정하지 않고
  언어별 중립 문구인 `가격 확인 중` 계열을 사용한다.
- 상품 카드에서 확실하지 않은 색상 요약 metadata를 기본 노출하지 않는다.

과거 시장별 가격 대화에는 fixed/manual과 FX 자동 가격, 변동 deadband,
circuit breaker, stale 기준이 포함된 구현 보고가 있다. 현재 원격 branch와
과거 대화의 commit이 정확히 일치한다고 확인되지 않았으므로 운영 정책으로
간주하지 않는다. `03_CATALOG_PRICING_AND_PRODUCT_QA.md`와 현재 코드를 함께
검증해야 한다.

## 일본·해외시장 기록

과거 대화에는 다음 조사·기획이 있다.

- 일본 도매 진출과 SUPER DELIVERY 검토
- 일본 Buyer 대상 브랜드명·표기·소개 문구
- 도쿄 상점 후보와 출장 동선
- 일본·미국·대만 시장가격 준비
- Buyer outreach 메시지와 자료 구성
- 사업자·통신판매·법적 고지 관련 검토

이 기록은 출발점이지 2026-08-14 현재의 확정 사실이 아니다. 상점 영업 상태,
플랫폼 조건, 세금, 통관, 광고·표시 의무, 개인정보·전자상거래 법규는 실행
시점에 공식 기관과 해당 플랫폼 자료로 다시 확인한다.

재질과 알레르기 관련 표현은 시험성적서·공급자 사양 없이 `무조건 안전`,
`알레르기 없음`, `완전 nickel-free`처럼 단정하지 않는다. 확인 가능한 재질,
도금, 규격과 시험 범위만 표시한다.

## 브랜드·사업 원본 자료

B 컴퓨터에는 다음 로컬 폴더가 있다.

- `C:\Users\MINE\Desktop\명함`: 27개 파일, 약 11.98MB
- `C:\Users\MINE\Desktop\비지니스`: 4개 파일, 약 6.71MB

이 폴더는 회사 자료일 가능성이 높지만 개인 이름, 연락처, 출장 정산 등
민감정보를 포함할 수 있다. 공개 Git에 올리지 않고 `09_LOCAL_ASSETS_AND_TRANSFER_GAPS.md`
절차로 별도 보존한다.

로고·앱 아이콘·상세페이지 관련 ChatGPT 대화에는 첨부 이미지가 있었다.
대화의 이미지 참조만으로 원본 파일이 이전됐다고 보지 않는다. 최종 선택된
로고 source와 export 파일은 별도 브랜드 자산 폴더로 수집해야 한다.

## B2B와 B2C 분리

| 항목 | Noblesse Piercing | Blingping |
| --- | --- | --- |
| 고객 | 승인 기반 글로벌 Buyer | 일반 소비자 |
| 핵심 흐름 | 견적 요청 | 주문·입금·배송 |
| 가격 | 승인 후 가격 | 소비자 판매가격 |
| 결제 | 직접 결제 금지 | provider 연동 별도 범위 |
| 반품/배송 | 견적 웹 핵심이 아님 | 운영 도메인에 포함 |
| 저장소 | `dgkim0127/noblesse` | 현재 B 로컬, 일반 remote 없음 |

두 브랜드가 같은 상품 사진이나 재고 원천을 참조할 수 있어도 고객 UX,
가격, 주문 계약과 개인정보 처리는 분리한다.
