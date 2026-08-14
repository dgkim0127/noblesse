# 3. 진행 체크리스트

## Stage 0 — 범위

- [ ] 새 웹 저장소가 존재한다.
- [ ] POS 저장소와 분리되어 있다.
- [ ] 단일 매장·KRW·Asia/Seoul 전제가 기록됐다.
- [ ] 옵션/SKU와 상품 시리즈의 차이를 기록했다.
- [ ] 1차 제외 기능을 기록했다.

## Stage 1 — 프로젝트 기반

- [ ] TypeScript strict
- [ ] 환경변수 검증
- [ ] lint
- [ ] typecheck
- [ ] unit test
- [ ] E2E smoke
- [ ] CI
- [ ] build

## Stage 2 — 인증·RLS

- [ ] 로그인/로그아웃
- [ ] 비밀번호 재설정
- [ ] 보호된 `/admin`
- [ ] 매장 멤버
- [ ] 역할 검사
- [ ] 두 매장 격리 테스트
- [ ] VIEWER write 차단

## Stage 3 — 관리자 셸

- [ ] TopBar
- [ ] Sidebar
- [ ] PageHeader
- [ ] Panel
- [ ] FilterPanel
- [ ] StatusSummary
- [ ] DataTable
- [ ] Empty/Error/Loading
- [ ] ConfirmDialog/Toast
- [ ] 1440/1280/1024 확인

## Stage 4 — 상품 DB

- [ ] categories
- [ ] shipping_profiles
- [ ] products
- [ ] option_groups/values
- [ ] variants
- [ ] inventory_levels/movements
- [ ] media
- [ ] audit/status history
- [ ] relations/series/templates/notices
- [ ] import jobs
- [ ] reset→migrate→seed

## Stage 5 — 기준정보

- [ ] 카테고리 CRUD
- [ ] 배송정보 CRUD
- [ ] 참조 중 삭제 차단
- [ ] private media bucket
- [ ] signed upload
- [ ] 파일 검증
- [ ] 매장 경로 격리

## Stage 6 — 상품 목록 읽기

- [ ] URL 필터
- [ ] 상태 count
- [ ] 서버 페이지네이션
- [ ] 서버 정렬
- [ ] 열 설정
- [ ] 가로 스크롤
- [ ] 빈 상태 구분
- [ ] 10,000건 성능
- [ ] count=total

## Stage 7 — 상품 초안

- [ ] 신규
- [ ] 수정
- [ ] 임시저장
- [ ] 재진입
- [ ] 기본 SKU
- [ ] 서버 검증
- [ ] 이탈 경고
- [ ] version 충돌

## Stage 8 — 옵션·재고

- [ ] 옵션 그룹
- [ ] 옵션값
- [ ] 조합 생성
- [ ] 안정 combination key
- [ ] SKU/바코드 고유
- [ ] 가격
- [ ] 보유/예약/안전재고
- [ ] 재고 이동 이력
- [ ] 기존 SKU 보존

## Stage 9 — 콘텐츠·게시

- [ ] 대표/추가/옵션 이미지
- [ ] 이미지 정렬/alt
- [ ] 상세설명
- [ ] HTML 정화
- [ ] 고시정보
- [ ] SEO
- [ ] 미리보기
- [ ] 게시검증
- [ ] 판매상태 전이
- [ ] 하단 고정 작업바

## Stage 10 — 운영 기능

- [ ] 일괄 판매상태
- [ ] 일괄 전시상태
- [ ] 일괄 카테고리
- [ ] 일괄 배송정보
- [ ] 가격/재고 변경
- [ ] 보관/복구
- [ ] 내보내기
- [ ] 부분실패 결과
- [ ] idempotency
- [ ] 감사로그

## Stage 11 — 반복 도구

- [ ] 미디어 보관함
- [ ] 템플릿
- [ ] 상품 공지
- [ ] 상품 폼 연결
- [ ] 참조 무결성
- [ ] 기간 경계

## Stage 12 — 상품 연결

- [ ] 연관상품
- [ ] 자기참조 차단
- [ ] 중복 차단
- [ ] 상품 시리즈
- [ ] 대표상품
- [ ] 고객몰 데이터 계약

## Stage 13 — 대시보드

- [ ] 실제 상품 count
- [ ] 카드 링크
- [ ] count=list total
- [ ] 갱신 시각
- [ ] 오류 상태
- [ ] 미구현 모듈 숨김

## Stage 14 — CSV

- [ ] 양식
- [ ] 업로드
- [ ] staging
- [ ] 검증
- [ ] 미리보기
- [ ] commit
- [ ] 결과 파일
- [ ] idempotency
- [ ] 500행 테스트

## Stage 15 — 운영 배포

- [ ] RLS 회귀
- [ ] 권한 회귀
- [ ] 보안헤더
- [ ] MIME 우회
- [ ] rate limit
- [ ] request ID
- [ ] 접근성
- [ ] 시각 회귀
- [ ] 성능/인덱스
- [ ] 백업/복구
- [ ] 스테이징/운영 분리
- [ ] 미구현 UI 0
