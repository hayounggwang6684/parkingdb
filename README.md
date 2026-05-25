# Parking Local App

iPhone과 Android 로컬 앱으로 진행하는 주차 차량 관리 프로젝트입니다.

## 방향

- iOS 먼저 개발하고, Android 앱은 같은 기능과 CSV 규격으로 확장합니다.
- 서버 없이 앱 내부 로컬 DB에 차량 정보를 저장합니다.
- CSV 파일로 내보내기와 불러오기를 지원합니다.
- 앱 첫 화면은 카메라 화면입니다.
- OCR은 번호판 탐지, 전처리, 한국 번호판 규칙 후처리 순서로 고도화합니다.
- TestFlight와 내부 제한 사용자 배포를 우선 고려합니다.

## 백업

기존 웹앱은 아래 폴더에 백업했습니다.

```text
backups/webapp-2026-05-22
```

## iOS 프로젝트

```text
ParkingLocalApp.xcodeproj
ParkingLocalApp/
```

Xcode에서 `ParkingLocalApp.xcodeproj`를 열어 개발을 진행합니다.

## Android 프로젝트

```text
android/
```

Android Studio에서 `android` 폴더를 열어 개발을 진행합니다.

## 문서

- `ios/ProjectMap.md`: 프로젝트 구조, 주요 흐름, 현재 검증 상태
- `ios/AppReviewPreparation.md`: App Review, TestFlight, 권한, 개인정보, 수출 규정 준비
- `android/GooglePlayPreparation.md`: Google Play 공개, Data safety, 폐쇄 테스트 준비
- `docs/store-submission-checklist.md`: App Store와 Google Play 공통 제출 체크리스트
- `ios/ParkingLocalApp/OCR/OCRPipeline.md`: OCR 처리 흐름과 개선 계획
- `ios/ParkingLocalApp/Data/CSVFormat.md`: iOS와 향후 Android가 공유할 CSV 호환 규격
- `android/AndroidDevelopment.md`: Android 구현 맵과 UI 검증 기준
- `docs/privacy.html`: App Store 제출용 개인정보 처리방침
- `docs/support.html`: App Store 제출용 지원 페이지

## 현재 구현 범위

- 카메라 시작 화면, 번호판 가이드 프레임, OCR 결과 플로팅 표시
- Apple Vision 기반 온디바이스 OCR과 한국 번호판 규칙 후처리
- OCR 디버그 정보와 실패 크롭 저장 옵션
- 로컬 차량 DB, 중복 처리, 차량 등록/수정, 차종 자동완성
- 통계 화면, 주차 공간 현황, 세부 항목 수정
- CSV 내보내기/불러오기와 충돌 병합
- Debug 빌드, 테스트, Release 빌드 검증
- Android 초기 로컬 앱 골격, 차량 등록/수정, 통계, 주차공간, CSV 흐름
- Android CameraX 실시간 카메라 프리뷰
- Android ML Kit Korean Text Recognition OCR 연결
- Android 실기기 설치와 실행 확인
- Android Debug/Release 빌드 검증
- Android 카메라 UI를 iPhone 앱 구조로 정렬

## GitHub Pages

App Store Connect와 Google Play Console에 넣을 공개 URL은 GitHub Pages로 제공한다.

```text
https://<github-user>.github.io/<repository>/privacy.html
https://<github-user>.github.io/<repository>/support.html
```

GitHub Pages 설정은 저장소의 `docs` 폴더를 배포 대상으로 지정한다.
