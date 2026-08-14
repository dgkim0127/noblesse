# Stage 03 — 관리자 셸과 UI 시스템

## 목표

제공 화면의 고밀도 업무 구조를 독자 브랜드로 구현한다.

## 구현 범위

- TopBar
- Sidebar와 실제 연결된 메뉴만 노출
- PageHeader, PageTabs
- Panel, AccordionSection
- FilterPanel, StatusSummary
- DataToolbar, DataTable skeleton
- Loading, Empty, NoResults, Error, Forbidden
- ConfirmDialog, Toast
- StickyActionBar
- 디자인 토큰
- 1440/1280/1024 반응
- 키보드/접근성

## 시각 원칙

- 네이버 로고·명칭·아이콘·문구 복제 금지
- 옅은 회색 배경, 흰색 업무 패널, 약한 1px 경계
- 표와 검색을 중심으로 정보 밀도 유지
- 그림자와 애니메이션 최소화

## 완료 게이트

- Story 또는 개발 경로에서 모든 공통 상태 확인
- 1440/1280/1024 스크린샷
- 미구현 메뉴/버튼 없음
- keyboard focus와 label 확인

## 작업 후 보고 형식

`templates/STAGE_RESULT_TEMPLATE.md`를 사용한다.

## 중단 조건

완료 게이트를 통과하지 못하면 다음 단계로 넘어가지 않는다.
