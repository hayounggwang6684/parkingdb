# 주차 차량 관리 웹 앱

Supabase에 차량 DB를 저장하고, 모바일 웹 카메라 화면에서 차량 등록 여부를 확인하는 MVP입니다.

## 준비

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. `.env.example`을 참고해서 `.env`를 만듭니다.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
VITE_EDIT_ACCESS_CODE=0000
```

## 실행

```bash
npm install
npm run dev
```

## Cloudflare Pages 자동 배포 설정

Cloudflare Pages에서 GitHub 저장소를 연결할 때 아래 값을 사용합니다.

```text
Build command: npm run build
Build output directory: dist
```

환경 변수에는 아래 두 값을 추가합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_EDIT_ACCESS_CODE
```

직접 업로드 배포가 필요하면 Cloudflare 로그인 후 아래 명령을 사용합니다.

```bash
npm run deploy:cloudflare
```

## MVP 흐름

- 차량번호와 차종을 등록합니다.
- 앱을 실행하면 바로 카메라 화면이 열립니다.
- 사용자가 차량 전면을 촬영합니다.
- `tesseract.js` OCR로 번호판 후보를 읽고 DB와 대조합니다.
- 등록 차량이면 카메라 화면에 등록 차량 안내를 표시하고 계속 촬영할 수 있습니다.
- 신규 차량이면 등록 입력창으로 전환합니다.
- OCR 결과가 틀릴 수 있으므로 신규 등록창에서 차량번호를 수정할 수 있습니다.

## 다음 단계

- 서버 OCR 또는 번호판 인식 API 연결
- 관리자 로그인 추가
- RLS 정책을 로그인 사용자 기준으로 강화
- 입차/출차 기록 테이블 추가

## OCR 참고 후보

- Korean License Plate Recognition: https://github.com/NinV/Korean-License-Plate-Recognition
- Korean_license_plate_recognition: https://github.com/RoadoneP/Korean_license_plate_recognition
- Open LPR: https://github.com/faisalthaheem/open-lpr
- YOLO License Plate Detection Web App: https://github.com/ierolsen/YOLO-License-Plate-Detection-Web-App
