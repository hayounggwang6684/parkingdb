# PDB App Review Preparation

## App Identity

- App name: parking db maker
- Display name: PDB
- Bundle ID: com.PDB.Younggwang.local
- Version: 0.1.0
- Target platform: iPhone
- Distribution goal: TestFlight first, then App Store review or Custom App depending on user scope
- App icon: P letter icon, iPhone icon slots plus `ios-marketing` 1024x1024 slot, no alpha channel

## App Purpose

PDB is an offline parking vehicle database app for authorized parking or facility staff.

The app helps staff capture vehicle license plate numbers, register vehicle model and category information, review local vehicle statistics, and export or import records by CSV.

## Main Features

- Camera-based vehicle plate capture
- On-device OCR using Apple Vision
- Korean vehicle plate rule-based post-processing
- Local vehicle database stored on the device
- Vehicle registration and editing
- Vehicle model autocomplete
- Vehicle statistics by category
- Parking space summary
- CSV export and import using iOS file sharing
- Optional OCR debug screen for field tuning

## Server And Network Use

The app does not use a server.

The app does not require network access for its core features.

All vehicle records are stored locally on the user device. CSV export and import are handled through iOS file sharing and user-selected files.

## Export Compliance

The app does not use non-exempt encryption.

The Xcode build setting sets `INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO` for Debug and Release.

This generates `ITSAppUsesNonExemptEncryption = false` in the built Info.plist and prevents repeatedly answering the export compliance question manually for this app version.

## Data Stored On Device

The app stores the following vehicle data locally:

- Vehicle plate number
- Vehicle model
- Vehicle category
- Capture date
- Created date
- Updated date

The data is used only inside the app unless the user manually exports it as a CSV file.

## Camera Permission Explanation

Suggested camera usage text:

차량 번호판을 촬영해 차량 정보를 등록하기 위해 카메라 접근이 필요합니다.

English meaning:

Camera access is required to capture vehicle license plates and register vehicle information.

## Privacy Summary

The app processes license plate images on device.

OCR is performed on device using Apple Vision. Captured images are not uploaded to a server.

Vehicle database records remain on the device unless the user explicitly exports a CSV file.

## Public Privacy And Support URLs

Use GitHub Pages for App Store public pages.

Placeholder URLs:

- Privacy Policy URL: `https://<github-user>.github.io/<repository>/privacy.html`
- Support URL: `https://<github-user>.github.io/<repository>/support.html`

Source files:

- `docs/privacy.html`
- `docs/support.html`

Before submitting to App Review, replace the placeholders with the final GitHub Pages URLs and confirm both pages open without login.

## App Store Listing Draft

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

## OCR Debug And Crop Storage

The OCR debug feature exists to help authorized staff tune OCR recognition in the field.

OCR failed crop storage is disabled by default.

If the user manually enables "OCR 실패 크롭 저장" in Settings, the app may save cropped plate-region preview images to the app's local Documents folder when OCR recognition fails.

These debug crop images are:

- Stored locally only
- Not uploaded to a server
- Intended for field OCR tuning
- Controlled by a user setting

For App Review or public distribution, keep this option disabled by default.

## App Review Notes

Suggested App Review note:

PDB is an offline parking vehicle database app for authorized facility or parking staff. The app uses the iPhone camera to capture vehicle license plates and performs OCR on device using Apple Vision. No server is used. Vehicle records are stored locally on the device and can be exported or imported by CSV only when the user chooses to do so.

The OCR debug feature is for field tuning. Debug crop image storage is disabled by default and can only be enabled manually in Settings.

## Test Instructions

1. Launch the app.
2. Allow camera permission.
3. Use the camera screen to capture a vehicle plate or use manual input if OCR fails.
4. Enter vehicle model and category, then save.
5. Swipe from right to left to open the statistics screen.
6. Tap vehicle count cards to review vehicle lists.
7. Tap a vehicle to edit vehicle number, model, or category.
8. Open Settings to export or import CSV data.
9. Optional: Open OCR debug view from the camera screen or Settings after a capture.

## Verification Status

- Debug build completed.
- Logic tests completed.
- Release build completed.
- Generated Release Info.plist confirmed `ITSAppUsesNonExemptEncryption = false`.
- Generated Release Info.plist confirmed the camera usage description.
- AppIcon asset catalog includes iPhone size slots and `ios-marketing` 1024x1024 slot.

Remaining real-device checks:

- Camera permission prompt on iPhone
- Pinch zoom on camera preview
- OCR performance with real parking lot diagonal capture
- CSV export and import through iOS share sheet

## App Privacy Answers

Suggested App Privacy guidance:

- Data collection: The app does not collect data to an external server.
- Tracking: No.
- Contact info: No.
- Location: No.
- User content: Vehicle records are created and stored locally by the user.
- Diagnostics: No external diagnostics collection.
- Camera images: Processed on device for OCR. Not uploaded.

If Apple asks about license plate data, explain that it is user-created operational data stored locally on device and shared only when the user manually exports CSV.

## Review Risk Checklist

- OCR failed crop storage must be disabled by default.
- Camera permission text must clearly explain plate capture.
- App should not imply public parking enforcement authority unless the organization owns that use case.
- If distributing outside a private team, provide a privacy policy URL.
- If using TestFlight external testing, provide clear test notes and app usage steps.
- If using Custom App, prepare organization distribution information in Apple Business Manager.
- Store screenshots must not expose real vehicle plate data.
- Privacy policy and support URLs must be public and accessible without login.
