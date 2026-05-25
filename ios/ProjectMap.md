# PDB Project Map

## 목적

PDB는 서버 없이 iPhone 내부 DB로 차량 번호, 차종, 카테고리, 촬영일을 관리하는 현장용 주차 차량 DB 앱이다.

## 개발 방향

- iOS 먼저 구현한다.
- Android는 이후 같은 CSV 규격을 공유하는 별도 앱으로 확장한다.
- 네트워크 없이 카메라, OCR, 등록, 조회, 수정, 통계, 파일 내보내기와 불러오기가 동작해야 한다.
- App Store 또는 TestFlight 심사를 고려하되, 우선 내부 제한 사용자 사용을 기준으로 한다.

## 작업 규칙

- 변경 사항이 필요할 때는 이 문서를 먼저 확인한다.
- 앱 구조와 관련 모듈을 파악한 뒤 필요한 파일만 좁게 읽는다.
- `rg`, 심볼 검색, 관련 문서를 우선 사용해 빠르게 수정한다.
- 전체 코드 탐색은 필요한 경우에만 제한적으로 수행한다.
- 토큰 사용을 최소화하고, 수정 후 영향 범위에 맞는 최소 검증을 수행한다.
- 기능, 구조, 데이터 형식, 심사 대응, OCR 흐름 등 변경 사항이 생기면 관련 기술문서도 같은 작업 안에서 반드시 갱신한다.

## 폴더 맵

```text
ios/
  AppReviewPreparation.md
  ProjectMap.md
  ParkingLocalApp.xcodeproj/
  ParkingLocalApp/
    App/
    Assets.xcassets/
    Data/
    Domain/
    Features/
      Camera/
      Settings/
      Statistics/
      VehicleForm/
    OCR/
  ParkingLocalAppTests/
docs/
  index.html
  privacy.html
  support.html
  code-audit-2026-05-25.md
android/
  AndroidDevelopment.md
  GooglePlayPreparation.md
  app/
    src/main/java/com/pdb/younggwang/localapp/ui/
```

## 주요 모듈

- `App`: 앱 진입점과 전역 상태 연결
- `Domain`: 차량 모델, 카테고리, 번호판 정규화와 검증
- `Data`: 로컬 DB 저장, CSV 파싱과 내보내기, 충돌 해소
- `OCR`: Vision OCR, 번호판 후보 생성, 한국 번호판 규칙 보정, 디버그 저장
- `Features/Camera`: 카메라 프리뷰, 가이드 프레임, 촬영, 핀치 줌, OCR 결과 UI
- `Features/Statistics`: 차량 통계와 주차 공간 현황
- `Features/VehicleForm`: 차량 등록과 수정 입력 화면
- `Features/Settings`: CSV 공유, OCR 디버그 옵션, 앱 정보
- `android`: iOS와 같은 기능과 CSV 규격을 따르는 Android 앱

## 차량 등록 흐름

1. 앱은 카메라 화면으로 시작한다.
2. 사용자가 번호판을 가이드 프레임 안에 맞춘다.
3. 촬영하면 온디바이스 OCR을 실행한다.
4. OCR 후보를 한국 번호판 규칙과 기존 DB 후보로 보정한다.
5. 이미 등록된 차량이면 등록됨 플로팅만 표시하고 다음 촬영으로 돌아간다.
6. 미등록 차량이면 차량 번호, 차종, 카테고리를 입력한다.
7. 차종은 기존 입력 이력 기반으로 자동 추천한다.
8. 저장 시 로컬 DB와 통계를 즉시 갱신한다.

## CSV 흐름

1. 내보내기는 UTF-8 CSV를 생성하고 iOS 공유 시트를 사용한다.
2. 가져오기는 사용자 선택 파일을 파싱한다.
3. 차량번호, 차종, 카테고리가 완전히 같으면 기존 데이터를 유지한다.
4. 차량번호는 같지만 차종 또는 카테고리가 다르면 충돌 목록을 보여준다.
5. 사용자는 기존 값 유지 또는 가져온 값 덮어쓰기를 선택한다.
6. 같은 CSV 규격을 쓰면 향후 Android 앱에서도 가져올 수 있다.

## OCR 개선 맵

- 현재: Apple Vision OCR, 가이드 영역 크롭, 원근/회전 보정 후보, 대비와 선명도 보정, 한국 번호판 규칙 후처리
- iOS 현재: 실제 기기 OCR 종료 방지를 위해 촬영 해상도와 OCR 전처리 이미지 크기 제한
- Android 현재: CameraX 실시간 프리뷰, ML Kit Korean Text Recognition, 가이드 주변 다중 크롭, 원근/회전 보정 후보, 대비 보정, 한국 번호판 규칙 후보 추출
- 현재: 뒷 4자리 단독 인식은 신규 번호로 확정하지 않고 기존 DB 보정 후보로만 사용
- 현재: OCR 디버그 화면에서 원본 텍스트, 후보 점수, DB 보정 여부를 확인
- 현재: 설정에서 켠 경우에만 실패 크롭 이미지를 로컬 저장
- 다음: 실제 주차장 대각선 촬영 실패 샘플을 수집해 전처리 값 조정
- 다음: Core ML 번호판 탐지 모델 도입 여부 검토
- Android 현재: 뒷 4자리 단독 인식은 기존 DB와 유일하게 매칭될 때만 보정 후보로 사용
- Android 다음: 실제 실패 크롭 이미지를 기준으로 크롭 위치와 대비 보정값 조정

## 주차 공간 현황

- 총 주차면, 사용 가능, 폐쇄 항목을 표시한다.
- 주요 집계는 지면주차, 타워 SUV, 타워 일반, 경차 전용 기준으로 보여준다.
- 세부 항목에서는 장애인, 경차, 일반, 전기차, 폐쇄 사유별 수량을 수정할 수 있다.

## App Review 맵

- 카메라 권한 문구는 차량 번호판 촬영 목적을 명확히 설명한다.
- 서버 사용은 없다.
- OCR과 차량 DB는 온디바이스에서 처리한다.
- CSV는 사용자가 직접 내보내거나 불러올 때만 외부로 이동한다.
- `ITSAppUsesNonExemptEncryption`은 `NO`로 설정해 수출 규정 질문을 자동화한다.
- OCR 실패 크롭 저장은 기본 OFF이며 설정에서 사용자가 직접 켠 경우에만 동작한다.
- 개인정보 처리방침과 지원 페이지는 GitHub Pages의 `docs/privacy.html`, `docs/support.html`로 제공한다.
- 스토어 제출 공통 체크리스트와 메타데이터 초안은 `docs/store-submission-checklist.md`에 유지한다.
- Google Play 제출 준비와 Data safety 초안은 `android/GooglePlayPreparation.md`에 유지한다.
- iOS 앱 아이콘은 iPhone 크기별 슬롯과 `ios-marketing` 1024 슬롯을 모두 명시한다.

## 검증 상태

- Debug iOS 빌드 통과
- Logic test 통과
- Release iOS 빌드 통과
- iOS AppIcon asset catalog의 iPhone 크기별 아이콘과 TestFlight/App Store용 `ios-marketing` 아이콘 검증
- Release Info.plist의 `ITSAppUsesNonExemptEncryption = false` 확인
- 카메라 핀치 줌은 실제 iPhone 현장 테스트가 추가로 필요하다.
- Android Debug 빌드 통과
- Android Release 빌드 통과
- Android Google Play용 Release AAB 생성 통과
- Android 실기기 설치와 실행 확인
- Android CameraX 실시간 프리뷰 확인
- Android 수동 입력 폼 표시 확인
- Android ML Kit OCR 연결 후 즉시 크래시 없음 확인
- Android 카메라 UI를 iPhone 앱 구조에 맞춤
- Android 설정 화면에 번호판 가이드, OCR 실패 크롭 저장, 중복 차량 처리방식, 파일 내보내기와 불러오기, 앱 정보 반영
- Android 카메라 버튼은 다른 UI 요소와 겹치지 않도록 촬영 버튼 좌측에 수동 입력 버튼을 배치하고 하단 안전영역 위로 올림
- Android 핀치 줌은 카메라 화면에서만 처리하고 줌 배율 범위 검증을 추가해 실제 기기 크래시를 방지
- Android 핀치 줌 후 터치 종료 이벤트가 스와이프 화면 전환으로 오인식되지 않도록 차단
- Android OCR은 다중 크롭, 원근/회전 보정, 대비 보정, 후보 점수화, DB 뒷4자리 보정을 적용
- iOS 카메라 핀치 줌 입력은 `PinchZoomGestureLayer` 한 경로로 통일
- Android OCR 이미지 디코딩과 전처리는 UI 스레드 밖에서 실행
- Android 반복 UI 생성 코드는 `ui/PdbViewFactory.kt`로 분리
- Android 카메라 권한과 CSV 파일 선택은 Activity Result API로 전환
- iOS와 Android 카메라 UI는 번호판 가이드 영역 외부를 블러/딤 처리해 번호판 영역에 시선을 집중
- iOS 번호판 블러 투명 창과 가이드 프레임은 `CameraFocusMaskOverlay`에서 같은 `guideRect`로 그림
- Android 번호판 마스크 투명 창과 가이드 프레임은 `PlateFocusMaskView`에서 같은 좌표로 그림
- Android 자동 백업은 로컬 저장 원칙과 개인정보 설명에 맞게 비활성화
