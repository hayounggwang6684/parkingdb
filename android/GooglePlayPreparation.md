# PDB Google Play Preparation

## App Identity

- App name: parking db maker
- Display name: PDB
- Package name: com.pdb.younggwang.local
- Version name: 0.1.0
- Version code: 1
- Target platform: Android
- Distribution goal: Closed testing first, then production release

## App Purpose

PDB is an offline parking vehicle database app for authorized parking or facility staff.

The app helps staff capture vehicle license plate numbers, register vehicle model and category information, review local vehicle statistics, manage parking space status, and export or import records by CSV.

## Main Features

- Camera-based vehicle plate capture
- On-device OCR using ML Kit Korean Text Recognition
- Korean vehicle plate rule-based post-processing
- Local vehicle database stored on the device
- Vehicle registration and editing
- Vehicle model autocomplete
- Vehicle statistics by category
- Parking space summary and detail editing
- CSV export and import using Android system file picker and share flow
- Optional OCR debug screen for field tuning

## Server And Network Use

The app does not use a developer server.

The app does not require network access for its core vehicle DB features.

Vehicle records are stored locally on the user device. CSV export and import are handled through user-selected files or system sharing.

## Permissions

The app requests only the camera permission.

Camera permission purpose:

차량 번호판을 촬영해 차량 정보를 등록하기 위해 카메라 접근이 필요합니다.

English meaning:

Camera access is required to capture vehicle license plates and register vehicle information.

## Data Stored On Device

The app stores the following vehicle data locally:

- Vehicle plate number
- Vehicle model
- Vehicle category
- Capture date
- Created date
- Updated date
- Parking space summary settings
- Optional OCR debug records
- Optional OCR failed crop images only when the user turns the setting on

Android backup is disabled with `android:allowBackup="false"` so app data is not automatically backed up through Android system backup.

## Data Safety Form Guidance

Suggested Google Play Data safety answers:

- Data collection: No data is collected by the developer.
- Data sharing: No data is shared by the developer.
- Data encrypted in transit: Not applicable for local-only app data.
- Users can request data deletion: Not applicable for developer-side data because no server-side data is collected. Users can delete local app data by deleting the app or clearing app storage.
- Location: Not collected.
- Personal info: Not collected.
- Photos and videos: Not collected by the developer. Camera is used for on-device plate OCR only. Images are not uploaded.
- Files and docs: User-selected CSV files can be imported or exported by the user. Files are not sent to the developer.
- App activity: Not collected by the developer.
- Diagnostics: Not collected by the developer.

If Play Console asks whether license plate records are user data, answer based on local-only handling:

The user creates vehicle records inside the app. The developer does not collect or transmit those records. Records stay on device unless the user exports CSV through Android sharing.

## Privacy Policy URL

Use the same public GitHub Pages privacy policy as iOS.

Placeholder URL:

`https://<github-user>.github.io/<repository>/privacy.html`

Before production release, replace this with the final GitHub Pages URL and confirm it opens without login.

## Store Listing Draft

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

## Review Notes

Suggested Google Play review note:

PDB is an offline parking vehicle database app for authorized facility or parking staff. The app uses the Android device camera to capture vehicle license plates and performs OCR on device using ML Kit Korean Text Recognition. No developer server is used. Vehicle records are stored locally on the device and can be exported or imported by CSV only when the user chooses to do so. OCR failed crop storage is disabled by default and can only be enabled manually in Settings.

## Test Instructions

1. Launch the app.
2. Allow camera permission.
3. Capture a vehicle plate or use manual input if OCR fails.
4. Enter vehicle model and category, then save.
5. Swipe from right to left to open the statistics screen.
6. Tap vehicle count cards to review vehicle lists.
7. Tap a vehicle to edit vehicle number, model, or category.
8. Open Settings to export or import CSV data.
9. Optional: Open OCR debug view from the camera screen after a capture.

## Closed Testing Checklist

- Create the app in Play Console with package name `com.pdb.younggwang.local`.
- Complete App content sections: Privacy policy, App access, Ads, Content rating, Target audience, Data safety.
- Upload an Android App Bundle from `android/app/build/outputs/bundle/release/`.
- Use closed testing before production.
- If the Google Play developer account is a new personal account, prepare at least 12 opted-in testers and run closed testing for at least 14 days before requesting production access.
- Confirm camera permission prompt and OCR flow on a real Android device.

## Release Risk Checklist

- Do not enable OCR failed crop storage by default.
- Confirm the privacy policy says Android and iOS, not only iPhone.
- Confirm no `INTERNET` permission is declared.
- Confirm `android:allowBackup="false"` remains set.
- Confirm release AAB is signed with the upload key before Play upload.
- Prepare screenshots that show camera UI, manual entry, statistics, settings, and CSV flow without exposing real vehicle plate data.
