# 귀족회사 로컬 자산과 이전 누락 목록

확인 기준일: 2026-08-14

## 이 문서의 의미

Git에 있는 코드만 옮기면 회사 자료 전체가 이전되는 것이 아니다. 촬영 RAW,
상품 상세페이지, ZIP 카탈로그, APK, 명함, 사업자료, 환경설정은 별도 자산이다.
이 문서는 B 컴퓨터에서 실제 확인된 로컬 자산과 아직 A 컴퓨터에서 가져와야
하는 항목을 구분한다.

## B 컴퓨터에 있는 대용량 상품 사진 자산

경로: `C:\Users\MINE\Desktop\귀걸이`

| 항목 | 현재 확인값 |
| --- | ---: |
| 전체 파일 | 1,127개 |
| 전체 크기 | 2,130,024,531 bytes, 약 2.13GB |
| Sony RAW `.ARW` | 60개 |
| JPEG | 639개 |
| PNG | 240개 |
| JSON | 122개 |
| Markdown | 60개 |
| 상품별 생성 결과 | `001_1`부터 `060_126`까지 60개 |
| `00_long_detail.jpg` | 60개 |
| `01_main_product.jpg` | 60개 |

생성 결과 경로에는 다음 통제 파일이 있다.

- `generated_detail_pages\manifest.json`
- `generated_detail_pages\imagegen_jobs.json`
- `blingping_detail_pipeline.py`
- `make_earring_detail_pages.py`

최근 사진 작업은 `020_52` 제품의 앞·뒤 깊이 곡선과 상세페이지 재조립을
다뤘다. 생성본과 원본을 구분하고 RAW를 덮어쓰지 않는다.

이 폴더는 Git에 넣지 않는다. 접근이 제한된 클라우드/object storage 또는
외장 SSD에 원본과 검증용 manifest/hash를 함께 이중 백업한다.

## Downloads의 상품 ZIP

현재 `C:\Users\MINE\Downloads` 최상위에는 ZIP 787개, 총 약 9.67GB가 있다.
여기에는 회사 상품과 무관한 대용량 ZIP도 섞여 있으므로 787개 전체를
상품 카탈로그라고 간주하지 않는다.

과거 읽기 전용 감사에서 따로 식별한 상품 ZIP 묶음은 다음과 같다.

- 상품 ZIP 743개
- 총 약 340,461,796 bytes
- 내부 항목 3,325개, JPEG 3,324개
- 빈 ZIP 0개, 동일 ZIP 중복 0개
- nested ZIP 예외 1개
- 괄호 숫자 ID 594개 중 unique 272개
- 가격·파일명 확인 후 publish 가능 후보 726개, 보류 17개

이 수치는 과거 감사 결과다. 현재 Downloads 전체와 동일하다고 가정하지
말고, 실제 상품 ZIP 743개를 다시 식별할 수 있는 목록과 해시 manifest를
만들어야 한다. 괄호 숫자를 고유 product code로 사용하지 않는다.

## 브랜드·사업 문서

| 경로 | 파일/크기 | 취급 |
| --- | --- | --- |
| `C:\Users\MINE\Desktop\명함` | 27개, 11,980,803 bytes | 개인정보 가능, private 보관 |
| `C:\Users\MINE\Desktop\비지니스` | 4개, 6,709,320 bytes | 출장·사업자료 가능, private 보관 |

이 폴더의 문서·이미지를 공개 Git에 넣지 않는다. 복사 전 담당자 이름,
전화번호, 이메일, 주소, 계좌, 비용자료가 들어 있는지 분류한다.

`C:\Users\MINE\Desktop\KDG`와 `KDG.zip`도 확인했지만 현재 내용은
`Portal to the Future`라는 개인 포트폴리오형 웹 자산으로 보이며 Noblesse,
귀족, 피어싱 표식은 발견되지 않았다. 사용자가 회사 자산이라고 확인하기
전에는 귀족회사 이전 범위에서 제외한다.

## 코드이지만 로컬에만 안전하게 남아 있는 항목

| 항목 | 현재 위험 | 필요한 조치 |
| --- | --- | --- |
| `product_s` | dirty 2파일, 다른 GitHub 소유자 | 변경 출처 확인, private remote 권한 확인, 별도 commit/push |
| Blingping | clean commit 있으나 일반 remote 없음 | private remote 또는 공식 Sites source 복구 절차 확정 |
| 사진 pipeline | 대용량 원본과 script가 한 로컬 폴더 | code와 manifest는 별도 보존, binary는 대용량 백업 |

## A 컴퓨터에서 아직 가져와야 하는 항목

최우선은 `D:\noblesse-procurement`다.

- 전체 source와 숨김 파일을 포함한 프로젝트 구조
- 현재 branch, commit, remote, dirty diff
- 앱 전용 `AGENTS.md`와 handoff
- 현재 source 기준 test/analyze/build 결과
- 필요한 경우 기준 APK와 version 정보
- Firebase project 연결 정보의 이름·절차만 문서화
- 환경변수, PIN, API key, service account, signing key는 별도 안전 경로로 이전

A 컴퓨터에서 추가로 찾을 항목:

- 최종 로고 원본과 export 묶음
- B에 없는 상품 RAW/촬영 source와 상품 ZIP
- 사업자·계약·상표·수출·통관 자료
- APK/설치파일과 어떤 source commit에서 만들었는지에 대한 기록
- PostgreSQL dump가 있다면 schema/data 구분, 암호화 여부, 복원 절차

## 권장 이전 방식

| 자료 | 권장 방식 |
| --- | --- |
| 코드·비민감 문서 | 시스템별 private Git 저장소 |
| RAW/JPEG/PNG/ZIP | 외장 SSD + private cloud/object storage 이중 백업 |
| APK·release artifact | private release storage와 source commit 표시 |
| DB dump | 암호화 저장, 별도 key 관리, restore rehearsal |
| 환경변수·PIN·API key | password manager 또는 승인된 secret manager |
| 명함·사업문서 | 접근 제한 문서 보관소 |

복사 후 원본과 대상에서 파일 수, 총 bytes, SHA-256 manifest를 비교한다.
검증이 끝나기 전에는 A 컴퓨터 원본을 삭제하지 않는다.

## 완료 판정

다음이 모두 충족돼야 `회사 자료 이전 완료`라고 말할 수 있다.

- 각 코드 저장소를 B에서 clone하고 branch/commit을 확인함
- dirty 변경이 누락 없이 commit되거나 별도 patch로 보존됨
- 대용량 자산이 두 군데 이상에 있고 hash 검증이 일치함
- 발주 앱 source와 필요한 release artifact가 복원됨
- secret은 Git 없이 B에서 다시 안전하게 주입됨
- 회사 시스템별 handoff와 실제 경로가 일치함
- 대표 화면/API/데이터 흐름을 시스템별로 다시 검증함
