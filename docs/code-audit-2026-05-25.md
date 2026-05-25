# Code Audit 2026-05-25

## Scope

- iOS camera and OCR flow
- Android camera, OCR, settings, CSV import flow
- Shared project documentation

## Fixed Findings

- iOS camera zoom input was handled by multiple gesture paths. It is now handled only by `PinchZoomGestureLayer`.
- Android OCR image decoding and preprocessing could block UI work. It now runs on a dedicated background executor and posts only final results to the main thread.
- Android OCR candidate bitmaps are recycled after each ML Kit OCR pass to reduce memory pressure.
- Android OCR candidates are deduplicated by plate value, keeping the highest score.
- Android repeated imperative UI builders were moved into `ui/PdbViewFactory.kt`.
- Android camera permission and CSV file import were moved from deprecated activity callbacks to Activity Result API.

## Verification

- iOS Debug build: passed
- iOS Release build: passed
- Android Debug build: passed
- Android Release build: passed
- Android latest Debug APK install: passed
- Android app launch and process check: passed

## Remaining Risks

- Android `MainActivity` still owns several screen flows. Next split should move camera, statistics, settings, and vehicle form into focused classes or screens.
- OCR accuracy still needs real failed crop samples from parking lot conditions.
- iOS simulator service was unavailable in this environment, so simulator unit tests were not run during this pass.

## Next Refactor Targets

- Split Android statistics and parking capacity screen rendering from `MainActivity`.
- Split Android vehicle form and duplicate handling from `MainActivity`.
- Add small pure Kotlin tests for CSV merge, vehicle number normalization, and OCR candidate scoring.
- Add iOS unit tests for OCR post-processing and CSV conflict resolution.
