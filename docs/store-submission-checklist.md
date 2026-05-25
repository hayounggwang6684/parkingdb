# PDB Store Submission Checklist

## Current Release Target

- iOS: App Store Connect submission with TestFlight or direct App Review.
- Android: Google Play Console closed testing first, then production.
- App name: parking db maker
- Display name: PDB
- iOS bundle ID: com.PDB.Younggwang.local
- Android package name: com.pdb.younggwang.local
- Version: 0.1.0

## Public URLs

Use GitHub Pages from the `docs` folder.

- Privacy Policy URL: `https://<github-user>.github.io/<repository>/privacy.html`
- Support URL: `https://<github-user>.github.io/<repository>/support.html`

Before submission:

- Replace placeholders with the final GitHub Pages URL.
- Confirm both pages open in a logged-out browser.
- Confirm the privacy policy covers both iOS and Android.

## App Store Connect Required Items

- App name
- Subtitle
- Category
- Age rating
- Privacy Policy URL
- Support URL
- App Privacy answers
- Camera permission explanation
- Screenshots for required iPhone sizes
- App Review notes
- Export compliance
- Build uploaded from Xcode Organizer

## App Store Metadata Draft

Subtitle:

오프라인 주차 차량 DB

Promotional text:

번호판 OCR, 차량 등록, 주차 통계, CSV 공유를 서버 없이 기기 안에서 처리합니다.

Description:

PDB는 현장 주차 관리자를 위한 오프라인 차량 DB 앱입니다. 카메라로 번호판을 촬영하고 온디바이스 OCR로 차량 번호 후보를 확인한 뒤, 차종과 카테고리를 로컬 DB에 저장할 수 있습니다.

주요 기능:

- 차량 번호판 촬영과 OCR
- 수동 차량 번호 입력
- 차량 번호, 차종, 카테고리 등록과 수정
- 차종 자동완성
- 등록 차량 통계
- 주차 공간 현황 관리
- CSV 내보내기와 불러오기
- OCR 디버그 이력 확인

앱은 서버 없이 동작합니다. 차량 정보는 사용자의 기기 내부에 저장되며, 사용자가 직접 CSV로 내보내는 경우에만 외부 파일로 공유됩니다.

Keywords:

주차,차량관리,번호판,OCR,CSV,parking,vehicle,license plate

Support URL:

`https://<github-user>.github.io/<repository>/support.html`

Privacy Policy URL:

`https://<github-user>.github.io/<repository>/privacy.html`

Review note:

PDB is an offline parking vehicle database app for authorized facility or parking staff. The app uses the iPhone camera to capture vehicle license plates and performs OCR on device using Apple Vision. No server is used. Vehicle records are stored locally on the device and can be exported or imported by CSV only when the user chooses to do so. OCR failed crop image storage is disabled by default and can only be enabled manually in Settings.

## Google Play Required Items

- App name
- Short description
- Full description
- App icon
- Feature graphic
- Phone screenshots
- Privacy policy URL
- Data safety form
- App access declaration
- Ads declaration
- Content rating questionnaire
- Target audience and content
- Android App Bundle
- Closed testing track
- Production access request if required

## Google Play Metadata Draft

Short description:

오프라인 차량 번호판 OCR과 로컬 주차 차량 DB 관리 앱

Full description:

PDB는 현장 주차 관리자를 위한 오프라인 차량 DB 앱입니다. 카메라로 번호판을 촬영하고 온디바이스 OCR로 차량 번호 후보를 확인한 뒤, 차종과 카테고리를 로컬 DB에 저장할 수 있습니다.

주요 기능:

- 차량 번호판 촬영과 OCR
- 수동 차량 번호 입력
- 차량 번호, 차종, 카테고리 등록과 수정
- 차종 자동완성
- 등록 차량 통계
- 주차 공간 현황 관리
- CSV 내보내기와 불러오기
- OCR 디버그 이력 확인

앱은 서버 없이 동작합니다. 차량 정보는 사용자의 기기 내부에 저장되며, 사용자가 직접 CSV로 내보내는 경우에만 외부 파일로 공유됩니다.

Review note:

PDB is an offline parking vehicle database app for authorized facility or parking staff. The app uses the Android device camera to capture vehicle license plates and performs OCR on device using ML Kit Korean Text Recognition. No developer server is used. Vehicle records are stored locally on the device and can be exported or imported by CSV only when the user chooses to do so. OCR failed crop storage is disabled by default and can only be enabled manually in Settings.

## Privacy And Data Answers

Common answer:

- No tracking.
- No ads.
- No developer server.
- No analytics SDK.
- No external diagnostics SDK.
- Camera is used only for on-device license plate OCR.
- Vehicle records stay on device unless the user manually exports CSV.
- OCR failed crop storage is off by default.

Apple App Privacy:

- Tracking: No.
- Data collection by developer: No, because the developer does not collect data from the app.
- Camera images: processed on device only and not uploaded.
- Vehicle records: user-created local operational data, not collected by developer.

Google Play Data safety:

- Data collected: No.
- Data shared: No.
- Security practices: no data transmitted to developer server.
- Deletion: local data can be deleted by deleting app or clearing app storage.

## Screenshot Set

Prepare screenshots without real license plate data.

- Camera screen with guide frame
- Manual vehicle input
- Vehicle statistics screen
- Parking space status screen
- Settings screen
- CSV export or import screen

Asset folders:

- `store-assets/screenshots/app-store/`
- `store-assets/screenshots/play-store/`
- `store-assets/promo/`
- `store-assets/source/`

## Final Preflight

- iOS Release build passes.
- Android Release build passes.
- Android release AAB is generated at `android/app/build/outputs/bundle/release/app-release.aab`.
- iOS App Archive uploads successfully.
- Privacy and support pages are public.
- Camera permission text is clear.
- No real vehicle plate appears in store screenshots.
- CSV import/export tested on both platforms.
- OCR failed crop storage default is OFF.
