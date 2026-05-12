import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createWorker } from 'tesseract.js';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  CircleAlert,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { supabase, supabaseConfigured } from './supabaseClient';
import { getVehicleTags } from './vehicleTags';
import './styles.css';

const normalizePlate = (value) =>
  value.replace(/[^0-9A-Za-z가-힣]/g, '').toUpperCase();

const PLATE_OCR_WHITELIST =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주하허호';

const digitLikeChars = {
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  Z: '2',
  S: '5',
  B: '8',
};

const isElectricVehicle = (carModel) =>
  /EV|아이오닉|모델\s*3|넥쏘|코나\s*EV/i.test(carModel ?? '');

const emptyVehicleForm = {
  plate_number: '',
  car_model: '',
  memo: '',
};

const correctDigitLikeText = (value) =>
  value.replace(/[OQDILZSB]/g, (char) => digitLikeChars[char] ?? char);

const getPlateVariants = (text) => {
  const compact = normalizePlate(text);
  return [...new Set([compact, correctDigitLikeText(compact)])];
};

const extractPlateCandidates = (text) => {
  const candidates = new Set();

  getPlateVariants(text).forEach((compact) => {
    compact.match(/\d{2,3}[가-힣]\d{4}/g)?.forEach((candidate) => candidates.add(candidate));
    compact.match(/\d{2,3}[가-힣A-Z]\d{4}/g)?.forEach((candidate) => candidates.add(candidate));
    compact.match(/\d{4}/g)?.forEach((candidate) => candidates.add(candidate));
  });

  return [...candidates];
};

const extractPlateCandidate = (text) => {
  const candidates = extractPlateCandidates(text);
  const best = candidates.sort((a, b) => scorePlateCandidate(b) - scorePlateCandidate(a))[0];
  return best ?? '';
};

const scoreKnownPlateCandidate = (candidate, savedVehicles) => {
  const normalizedCandidate = normalizePlate(candidate);
  const lastFourDigits = normalizedCandidate.match(/\d{4}$/)?.[0] ?? '';

  if (!normalizedCandidate) return 0;

  return savedVehicles.reduce((score, vehicle) => {
    const savedPlate = normalizePlate(vehicle.plate_number ?? '');

    if (savedPlate === normalizedCandidate) return Math.max(score, 8);
    if (isMissingLeadingPlateDigit(savedPlate, normalizedCandidate)) return Math.max(score, 7);
    if (lastFourDigits && savedPlate === lastFourDigits) return Math.max(score, 6);
    if (lastFourDigits && savedPlate.endsWith(lastFourDigits)) return Math.max(score, 4);

    return score;
  }, 0);
};

const scoreOcrCandidate = (candidate, savedVehicles) => {
  if (!candidate) return 0;
  return scorePlateCandidate(candidate) + scoreKnownPlateCandidate(candidate, savedVehicles);
};

const scorePlateCandidate = (candidate) => {
  if (/^\d{2,3}[가-힣]\d{4}$/.test(candidate)) return 4;
  if (/^\d{2,3}[가-힣A-Z]\d{4}$/.test(candidate)) return 3;
  if (/^\d{4}$/.test(candidate)) return 2;
  return candidate ? 1 : 0;
};

const isMissingLeadingPlateDigit = (savedPlate, detectedPlate) => {
  const savedMatch = savedPlate.match(/^(\d{3})([가-힣])(\d{4})$/);
  const detectedMatch = detectedPlate.match(/^(\d{2})([가-힣])(\d{4})$/);

  if (!savedMatch || !detectedMatch) return false;

  return `${savedMatch[1].slice(1)}${savedMatch[2]}${savedMatch[3]}` === detectedPlate;
};

const emptyForm = {
  plate_number: '',
  car_model: '',
  memo: '',
};

function CameraApp() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const pinchRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [capturedImage, setCapturedImage] = useState('');
  const [detectedPlate, setDetectedPlate] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [notice, setNotice] = useState(null);
  const [ocrProgress, setOcrProgress] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [zoomInfo, setZoomInfo] = useState({
    supported: false,
    min: 1,
    max: 1,
    step: 0.1,
    value: 1,
  });

  useEffect(() => {
    fetchVehicles();
    startCamera();
    return () => stopCamera();
  }, []);

  async function fetchVehicles() {
    if (!supabaseConfigured) return;

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number, normalized_plate_number, car_model, memo, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice({ type: 'error', text: `DB 조회 실패: ${error.message}` });
      return;
    }

    setVehicles(data ?? []);
  }

  async function startCamera() {
    setCameraError('');

    if (!window.isSecureContext) {
      setCameraError('카메라를 사용하려면 HTTPS 주소로 접속해야 합니다.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('현재 브라우저에서 카메라 API를 사용할 수 없습니다.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      syncZoomCapabilities(stream);
      setIsCameraReady(true);
    } catch (error) {
      setIsCameraReady(false);
      setCameraError('카메라 권한을 허용해 주세요. iPhone은 Safari에서 HTTPS 주소로 접속해야 안정적입니다.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pinchRef.current = null;
  }

  function syncZoomCapabilities(stream) {
    const track = stream.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() ?? {};
    const settings = track?.getSettings?.() ?? {};

    if (typeof capabilities.zoom !== 'object') {
      setZoomInfo({
        supported: false,
        min: 1,
        max: 1,
        step: 0.1,
        value: 1,
      });
      return;
    }

    const min = capabilities.zoom.min ?? 1;
    const max = capabilities.zoom.max ?? min;
    const step = capabilities.zoom.step ?? 0.1;
    const value = settings.zoom ?? min;

    setZoomInfo({
      supported: max > min,
      min,
      max,
      step,
      value,
    });
  }

  async function applyCameraZoom(nextZoom) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !zoomInfo.supported) return;

    const clamped = Math.min(zoomInfo.max, Math.max(zoomInfo.min, nextZoom));
    const rounded = Math.round(clamped / zoomInfo.step) * zoomInfo.step;

    try {
      await track.applyConstraints({
        advanced: [{ zoom: rounded }],
      });
      setZoomInfo((current) => ({
        ...current,
        value: rounded,
      }));
    } catch (error) {
      setZoomInfo((current) => ({
        ...current,
        supported: false,
      }));
    }
  }

  function getTouchDistance(touches) {
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    pinchRef.current = {
      distance: getTouchDistance(event.touches),
      zoom: zoomInfo.value,
    };
  }

  function handleTouchMove(event) {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();

    if (!zoomInfo.supported) return;

    const distance = getTouchDistance(event.touches);
    const ratio = distance / pinchRef.current.distance;
    applyCameraZoom(pinchRef.current.zoom * ratio);
  }

  function handleTouchEnd(event) {
    if (event.touches.length < 2) {
      pinchRef.current = null;
    }
  }

  async function captureAndCheck() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth) {
      setCameraError('카메라 화면이 준비된 뒤 다시 촬영해 주세요.');
      return;
    }

    setNotice(null);
    setRegistrationOpen(false);
    setIsProcessing(true);
    setOcrProgress('촬영 중');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const image = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(image);

    try {
      const plate = await recognizePlate(canvas);
      setDetectedPlate(plate);

      if (!plate) {
        openRegistration('', '번호판 인식 실패. 차량번호를 직접 입력해 주세요.');
        return;
      }

      await checkVehicle(plate);
    } catch (error) {
      openRegistration('', 'OCR 처리 실패. 차량번호를 직접 입력해 주세요.');
    } finally {
      setIsProcessing(false);
      setOcrProgress('');
    }
  }

  async function recognizePlate(sourceCanvas) {
    setOcrProgress('OCR 준비 중');
    const imageCandidates = createOcrImageCandidates(sourceCanvas);
    const worker = await createWorker('kor+eng', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          setOcrProgress(`OCR 인식 중 ${Math.round(message.progress * 100)}%`);
        }
      },
    });

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '7',
        tessedit_char_whitelist: PLATE_OCR_WHITELIST,
        preserve_interword_spaces: '1',
      });

      const results = [];
      const rawTexts = [];

      for (let index = 0; index < imageCandidates.length; index += 1) {
        setOcrProgress(`OCR 인식 중 ${index + 1}/${imageCandidates.length}`);
        const {
          data: { text },
        } = await worker.recognize(imageCandidates[index]);
        const candidates = extractPlateCandidates(text);
        rawTexts.push(text);

        candidates.forEach((candidate) => {
          results.push({
            text,
            candidate,
            score: scoreOcrCandidate(candidate, vehicles),
          });
        });
      }

      const best = results.sort((a, b) => b.score - a.score)[0];
      setRawOcrText(rawTexts.join(' / '));
      return best?.candidate ?? '';
    } finally {
      await worker.terminate();
    }
  }

  function createOcrImageCandidates(sourceCanvas) {
    const cropFrames = [
      { x: 0.1, y: 0.4, width: 0.8, height: 0.26 },
      { x: 0.16, y: 0.43, width: 0.68, height: 0.22 },
      { x: 0.08, y: 0.36, width: 0.84, height: 0.34 },
      { x: 0.02, y: 0.28, width: 0.96, height: 0.5 },
    ];

    return cropFrames.flatMap((frame) => {
      const outputCanvas = document.createElement('canvas');
      const targetWidth = 1400;
      const cropWidth = sourceCanvas.width * frame.width;
      const cropHeight = sourceCanvas.height * frame.height;
      outputCanvas.width = targetWidth;
      outputCanvas.height = Math.round(targetWidth * (cropHeight / cropWidth));

      const context = outputCanvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(
        sourceCanvas,
        sourceCanvas.width * frame.x,
        sourceCanvas.height * frame.y,
        cropWidth,
        cropHeight,
        0,
        0,
        outputCanvas.width,
        outputCanvas.height,
      );

      return createPreprocessedOcrImages(outputCanvas);
    });
  }

  function createPreprocessedOcrImages(sourceCanvas) {
    const modes = ['gray', 'binary', 'binaryDark'];

    return modes.map((mode) => {
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = sourceCanvas.width;
      outputCanvas.height = sourceCanvas.height;

      const context = outputCanvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(sourceCanvas, 0, 0);

      const image = context.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const { data } = image;
      for (let index = 0; index < data.length; index += 4) {
        const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        const contrast = gray > 145 ? 255 : 0;
        const value = mode === 'gray' ? gray : mode === 'binaryDark' ? 255 - contrast : contrast;

        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
      }

      context.putImageData(image, 0, 0);
      return outputCanvas.toDataURL('image/png');
    });
  }

  async function checkVehicle(plateNumber) {
    const normalizedPlate = normalizePlate(plateNumber);
    const lastFourDigits = normalizedPlate.match(/\d{4}$/)?.[0] ?? '';
    const localMatch = findLocalVehicleMatch(normalizedPlate, lastFourDigits);

    if (localMatch) {
      handleLookupResult(localMatch, plateNumber);
      return;
    }

    if (!supabaseConfigured) {
      handleLookupResult(null, plateNumber);
      return;
    }

    const directCandidates = [normalizedPlate];
    const missingLeadingMatch = normalizedPlate.match(/^(\d{2})([가-힣])(\d{4})$/);

    if (missingLeadingMatch) {
      for (let digit = 0; digit <= 9; digit += 1) {
        directCandidates.push(`${digit}${normalizedPlate}`);
      }
    }

    const exactResult = await supabase
      .from('vehicles')
      .select('id, plate_number, car_model, memo')
      .in('normalized_plate_number', directCandidates)
      .limit(1);

    if (exactResult.error) {
      setNotice({ type: 'error', text: `등록 여부 확인 실패: ${exactResult.error.message}` });
      return;
    }

    if (exactResult.data?.length || !lastFourDigits) {
      handleLookupResult(exactResult.data?.[0] ?? null, plateNumber);
      return;
    }

    const partialResult = await supabase
      .from('vehicles')
      .select('id, plate_number, car_model, memo')
      .eq('normalized_plate_number', lastFourDigits)
      .maybeSingle();

    if (partialResult.error) {
      setNotice({ type: 'error', text: `등록 여부 확인 실패: ${partialResult.error.message}` });
      return;
    }

    handleLookupResult(partialResult.data, plateNumber);
  }

  function findLocalVehicleMatch(normalizedPlate, lastFourDigits) {
    const exactMatch = vehicles.find((vehicle) => {
      const savedPlate = normalizePlate(vehicle.plate_number);
      return (
        savedPlate === normalizedPlate ||
        isMissingLeadingPlateDigit(savedPlate, normalizedPlate) ||
        (lastFourDigits && savedPlate === lastFourDigits)
      );
    });

    if (exactMatch || !lastFourDigits) return exactMatch ?? null;

    const lastFourMatches = vehicles.filter((vehicle) =>
      normalizePlate(vehicle.plate_number).endsWith(lastFourDigits),
    );

    return lastFourMatches.length === 1 ? lastFourMatches[0] : null;
  }

  function handleLookupResult(vehicle, plateNumber) {
    if (vehicle) {
      const isPartialPlate = /^\d{4}$/.test(normalizePlate(vehicle.plate_number));
      setNotice({
        type: 'success',
        text: `${isPartialPlate ? `${vehicle.plate_number} 뒷자리` : vehicle.plate_number} 등록된 차량입니다.`,
      });
      setRegistrationOpen(false);
      return;
    }

    openRegistration(plateNumber, '신규 차량입니다. 등록 정보를 입력해 주세요.');
  }

  function openRegistration(plateNumber, message) {
    setForm((current) => ({
      ...current,
      plate_number: plateNumber,
      car_model: '',
      memo: '',
    }));
    setNotice({ type: 'warning', text: message });
    setRegistrationOpen(true);
  }

  async function saveVehicle(event) {
    event.preventDefault();
    const plateNumber = form.plate_number.trim();
    const carModel = form.car_model.trim();

    if (!plateNumber || !carModel) {
      setNotice({ type: 'warning', text: '차량번호와 차종을 모두 입력해 주세요.' });
      return;
    }

    if (!supabaseConfigured) {
      const createdVehicle = {
        id: crypto.randomUUID(),
        plate_number: plateNumber,
        normalized_plate_number: normalizePlate(plateNumber),
        car_model: carModel,
        memo: form.memo.trim(),
        created_at: new Date().toISOString(),
      };
      setVehicles((current) => [createdVehicle, ...current]);
      finishRegistration(plateNumber);
      return;
    }

    const { error } = await supabase.from('vehicles').insert({
      plate_number: plateNumber,
      car_model: carModel,
      memo: form.memo.trim() || null,
    });

    if (error) {
      const message = error.code === '23505' ? '이미 등록된 차량번호입니다.' : error.message;
      setNotice({ type: 'error', text: `등록 실패: ${message}` });
      return;
    }

    await fetchVehicles();
    finishRegistration(plateNumber);
  }

  function finishRegistration(plateNumber) {
    setForm(emptyForm);
    setDetectedPlate(plateNumber);
    setRegistrationOpen(false);
    setCapturedImage('');
    setNotice({ type: 'success', text: `${plateNumber} 등록 완료. 계속 촬영할 수 있습니다.` });
  }

  function closeRegistration() {
    setRegistrationOpen(false);
    setCapturedImage('');
    setDetectedPlate('');
    setRawOcrText('');
    setNotice(null);
  }

  return (
    <main className="app-shell">
      <section
        className="camera-screen"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <video ref={videoRef} autoPlay playsInline muted />
        {capturedImage && <img src={capturedImage} alt="촬영된 차량 전면" />}

        {!capturedImage && isCameraReady && (
          <div className="plate-guide" aria-hidden="true">
            <span className="plate-guide__label">번호판을 프레임 안에 맞추세요</span>
            <div className="plate-guide__window">
              <span className="plate-guide__sample">12가3456</span>
            </div>
            <ul className="plate-guide__tips">
              <li>정면</li>
              <li>흔들림 없이</li>
              <li>빛 반사 피하기</li>
            </ul>
          </div>
        )}

        {!isCameraReady && (
          <div className="camera-empty">
            <Camera size={44} />
            <p>{cameraError || '카메라를 준비하고 있습니다.'}</p>
            <button type="button" onClick={startCamera}>
              카메라 시작
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="processing">
            <LoaderCircle size={30} />
            <span>{ocrProgress || '처리 중'}</span>
          </div>
        )}

        {notice && !registrationOpen && (
          <div className={`result-banner ${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={22} /> : <CircleAlert size={22} />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="capture-panel">
          <button
            type="button"
            className="capture-button"
            aria-label="촬영"
            onClick={captureAndCheck}
            disabled={!isCameraReady || isProcessing}
          />
        </div>
      </section>

      {registrationOpen && (
        <section className="registration-sheet" aria-label="신규 차량 등록">
          <div className="sheet-header">
            <div>
              <strong>신규 차량 등록</strong>
              <span>OCR 결과를 확인하고 차종을 입력하세요.</span>
            </div>
            <button type="button" aria-label="닫기" onClick={closeRegistration}>
              <X size={19} />
            </button>
          </div>

          <form className="register-form" onSubmit={saveVehicle}>
            <label>
              차량번호
              <input
                value={form.plate_number}
                onChange={(event) => setForm({ ...form, plate_number: event.target.value })}
                placeholder="12가3456"
                autoFocus
              />
            </label>
            <label>
              차종
              <input
                value={form.car_model}
                onChange={(event) => setForm({ ...form, car_model: event.target.value })}
                placeholder="아반떼"
              />
            </label>
            <label>
              메모
              <textarea
                value={form.memo}
                onChange={(event) => setForm({ ...form, memo: event.target.value })}
                placeholder="방문 목적, 위치 등"
              />
            </label>
            {rawOcrText && (
              <p className="ocr-text">OCR 원문: {rawOcrText.replace(/\s+/g, ' ').trim()}</p>
            )}
            <button type="submit">
              <Save size={18} />
              등록
            </button>
          </form>
        </section>
      )}

      <canvas ref={canvasRef} hidden />
    </main>
  );
}

function DatabaseApp() {
  const [vehicles, setVehicles] = useState([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    if (!supabaseConfigured) {
      setNotice({ type: 'error', text: 'Supabase 환경 변수가 필요합니다.' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number, normalized_plate_number, car_model, memo, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice({ type: 'error', text: `DB 조회 실패: ${error.message}` });
    } else {
      setVehicles(data ?? []);
    }
    setLoading(false);
  }

  const statItems = [
    { key: 'all', label: '전체 차량' },
    { key: 'full', label: '전체번호' },
    { key: 'partial', label: '뒷자리' },
    { key: 'sedan', label: '세단' },
    { key: 'suv', label: 'SUV' },
    { key: 'compact', label: '경차' },
    { key: 'other', label: '기타' },
    { key: 'electric', label: '전기차' },
  ];

  function getStatKey(vehicle) {
    const plate = normalizePlate(vehicle.plate_number);
    if (activeFilter === 'full') return !/^\d{4}$/.test(plate);
    if (activeFilter === 'partial') return /^\d{4}$/.test(plate);

    const vehicleType = getVehicleTags(vehicle.car_model).vehicleType;
    if (activeFilter === 'sedan') return vehicleType === '세단';
    if (activeFilter === 'suv') return vehicleType === 'SUV';
    if (activeFilter === 'compact') return vehicleType === '경차';
    if (activeFilter === 'other') return vehicleType === '기타 차량';
    if (activeFilter === 'electric') return isElectricVehicle(vehicle.car_model);
    return true;
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const keyword = normalizePlate(query);
    if (!getStatKey(vehicle)) return false;
    if (!keyword) return true;

    return (
      normalizePlate(vehicle.plate_number).includes(keyword) ||
      normalizePlate(vehicle.car_model).includes(keyword) ||
      normalizePlate(vehicle.memo ?? '').includes(keyword)
    );
  });

  const counts = vehicles.reduce(
    (summary, vehicle) => {
      const isPartial = /^\d{4}$/.test(normalizePlate(vehicle.plate_number));
      const vehicleType = getVehicleTags(vehicle.car_model).vehicleType;
      summary.total += 1;
      summary.partial += isPartial ? 1 : 0;
      summary.full += isPartial ? 0 : 1;
      summary.sedan += vehicleType === '세단' ? 1 : 0;
      summary.suv += vehicleType === 'SUV' ? 1 : 0;
      summary.compact += vehicleType === '경차' ? 1 : 0;
      summary.other += vehicleType === '기타 차량' ? 1 : 0;
      summary.electric += isElectricVehicle(vehicle.car_model) ? 1 : 0;
      summary.byModel[vehicle.car_model] = (summary.byModel[vehicle.car_model] ?? 0) + 1;
      return summary;
    },
    { total: 0, full: 0, partial: 0, sedan: 0, suv: 0, compact: 0, other: 0, electric: 0, byModel: {} },
  );

  const activeFilterLabel = statItems.find((item) => item.key === activeFilter)?.label ?? '전체 차량';

  const topModels = Object.entries(counts.byModel)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6);

  function exportCsv() {
    const rows = filteredVehicles.map((vehicle) =>
      [
        vehicle.plate_number,
        vehicle.car_model,
        getVehicleTags(vehicle.car_model).vehicleType,
        getVehicleTags(vehicle.car_model).mechanicalParking,
        getVehicleTags(vehicle.car_model).mechanicalNote,
        vehicle.memo ?? '',
        vehicle.created_at,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csvHeader = [
      'plate_number',
      'car_model',
      'vehicle_type',
      'mechanical_parking',
      'mechanical_note',
      'memo',
      'created_at',
    ];
    const csv = [csvHeader.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicles.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="db-shell">
      <header className="db-header">
        <div>
          <p>Parking DB</p>
          <h1>차량 DB 조회</h1>
        </div>
        <a href="/" aria-label="촬영 화면">
          <ArrowLeft size={18} />
          촬영
        </a>
      </header>

      {notice && (
        <div className={`db-notice ${notice.type}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="닫기">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="db-stats" aria-label="DB 통계">
        {statItems.map((item) => (
          <article
            key={item.key}
            className={activeFilter === item.key ? 'active' : ''}
            onClick={() => setActiveFilter(item.key)}
            title="클릭하면 해당 차량만 표시됩니다."
          >
            <span>{item.label}</span>
            <strong>{counts[item.key === 'all' ? 'total' : item.key]}</strong>
          </article>
        ))}
      </section>

      <section className="db-panel">
        <div className="readonly-banner">
          이 화면은 조회 전용입니다. 차량 추가, 수정, 삭제는 맥 관리 앱에서 처리합니다.
        </div>
        <div className="db-toolbar">
          <div className="db-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="차량번호, 차종, 메모 검색"
            />
          </div>
          <button type="button" className="db-export" onClick={exportCsv}>
            <Download size={18} />
            CSV
          </button>
        </div>

        <div className="model-summary">
          {topModels.map(([model, count]) => (
            <span key={model}>
              {model} {count}
            </span>
          ))}
        </div>

        <div className="db-list">
          {loading && <p className="db-empty">불러오는 중입니다.</p>}
          {!loading && filteredVehicles.length === 0 && (
            <p className="db-empty">검색 결과가 없습니다.</p>
          )}
          {!loading && filteredVehicles.length > 0 && (
            <p className="db-list-caption">
              {activeFilterLabel} {filteredVehicles.length}대
            </p>
          )}
          {filteredVehicles.map((vehicle) => (
            <article key={vehicle.id} className="db-row">
              <div>
                <strong>{vehicle.plate_number}</strong>
                <span>{vehicle.car_model}</span>
                {vehicle.memo && <small>{vehicle.memo}</small>}
              </div>
              <div className="vehicle-tags">
                <span>{getVehicleTags(vehicle.car_model).vehicleType}</span>
                <span className={getVehicleTags(vehicle.car_model).mechanicalParking === '가능' ? 'fit' : 'blocked'}>
                  기계식 {getVehicleTags(vehicle.car_model).mechanicalParking}
                </span>
                <small>{getVehicleTags(vehicle.car_model).mechanicalNote}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function MacAdminApp() {
  const [vehicles, setVehicles] = useState([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyVehicleForm);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    if (!supabaseConfigured) {
      setNotice({ type: 'error', text: 'Supabase 연결 설정이 필요합니다.' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number, normalized_plate_number, car_model, memo, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice({ type: 'error', text: `DB 조회 실패: ${error.message}` });
    } else {
      setVehicles(data ?? []);
      setNotice(null);
    }
    setLoading(false);
  }

  const statItems = [
    { key: 'all', label: '전체 차량' },
    { key: 'full', label: '전체번호' },
    { key: 'partial', label: '뒷자리' },
    { key: 'sedan', label: '세단' },
    { key: 'suv', label: 'SUV' },
    { key: 'compact', label: '경차' },
    { key: 'other', label: '기타' },
    { key: 'electric', label: '전기차' },
    { key: 'blocked', label: '기계식 불가' },
  ];

  function matchesFilter(vehicle) {
    const plate = normalizePlate(vehicle.plate_number);
    if (activeFilter === 'full') return !/^\d{4}$/.test(plate);
    if (activeFilter === 'partial') return /^\d{4}$/.test(plate);

    const tags = getVehicleTags(vehicle.car_model);
    if (activeFilter === 'sedan') return tags.vehicleType === '세단';
    if (activeFilter === 'suv') return tags.vehicleType === 'SUV';
    if (activeFilter === 'compact') return tags.vehicleType === '경차';
    if (activeFilter === 'other') return tags.vehicleType === '기타 차량';
    if (activeFilter === 'electric') return isElectricVehicle(vehicle.car_model);
    if (activeFilter === 'blocked') return tags.mechanicalParking === '불가능';
    return true;
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const keyword = normalizePlate(query);
    if (!matchesFilter(vehicle)) return false;
    if (!keyword) return true;

    return (
      normalizePlate(vehicle.plate_number).includes(keyword) ||
      normalizePlate(vehicle.car_model).includes(keyword) ||
      normalizePlate(vehicle.memo ?? '').includes(keyword)
    );
  });

  const counts = vehicles.reduce(
    (summary, vehicle) => {
      const plate = normalizePlate(vehicle.plate_number);
      const tags = getVehicleTags(vehicle.car_model);
      const isPartial = /^\d{4}$/.test(plate);
      summary.total += 1;
      summary.partial += isPartial ? 1 : 0;
      summary.full += isPartial ? 0 : 1;
      summary.sedan += tags.vehicleType === '세단' ? 1 : 0;
      summary.suv += tags.vehicleType === 'SUV' ? 1 : 0;
      summary.compact += tags.vehicleType === '경차' ? 1 : 0;
      summary.other += tags.vehicleType === '기타 차량' ? 1 : 0;
      summary.electric += isElectricVehicle(vehicle.car_model) ? 1 : 0;
      summary.blocked += tags.mechanicalParking === '불가능' ? 1 : 0;
      return summary;
    },
    { total: 0, full: 0, partial: 0, sedan: 0, suv: 0, compact: 0, other: 0, electric: 0, blocked: 0 },
  );

  const activeFilterLabel = statItems.find((item) => item.key === activeFilter)?.label ?? '전체 차량';

  function resetForm() {
    setEditingId(null);
    setForm(emptyVehicleForm);
  }

  function editVehicle(vehicle) {
    setEditingId(vehicle.id);
    setForm({
      plate_number: vehicle.plate_number,
      car_model: vehicle.car_model,
      memo: vehicle.memo ?? '',
    });
  }

  async function saveVehicle(event) {
    event.preventDefault();
    const payload = {
      plate_number: form.plate_number.trim(),
      car_model: form.car_model.trim(),
      memo: form.memo.trim() || null,
    };

    if (!payload.plate_number || !payload.car_model) {
      setNotice({ type: 'warning', text: '차량번호와 차종을 입력해 주세요.' });
      return;
    }

    setSaving(true);
    const request = editingId
      ? supabase.from('vehicles').update(payload).eq('id', editingId)
      : supabase.from('vehicles').insert(payload);
    const { error } = await request;
    setSaving(false);

    if (error) {
      const message = error.code === '23505' ? '이미 등록된 차량번호입니다.' : error.message;
      setNotice({ type: 'error', text: `저장 실패: ${message}` });
      return;
    }

    resetForm();
    await fetchVehicles();
    setNotice({ type: 'success', text: '저장 완료' });
  }

  async function deleteVehicle(vehicle) {
    const confirmed = window.confirm(`${vehicle.plate_number} 차량을 삭제할까요?`);
    if (!confirmed) return;

    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
    if (error) {
      setNotice({ type: 'error', text: `삭제 실패: ${error.message}` });
      return;
    }

    if (editingId === vehicle.id) resetForm();
    await fetchVehicles();
    setNotice({ type: 'success', text: '삭제 완료' });
  }

  function exportCsv() {
    const rows = filteredVehicles.map((vehicle) =>
      [
        vehicle.plate_number,
        vehicle.car_model,
        getVehicleTags(vehicle.car_model).vehicleType,
        getVehicleTags(vehicle.car_model).mechanicalParking,
        getVehicleTags(vehicle.car_model).mechanicalNote,
        vehicle.memo ?? '',
        vehicle.created_at,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = [
      'plate_number,car_model,vehicle_type,mechanical_parking,mechanical_note,memo,created_at',
      ...rows,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vehicles.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="db-shell mac-shell">
      <header className="db-header">
        <div>
          <p>Mac Admin</p>
          <h1>주차 차량 DB 관리</h1>
        </div>
        <button type="button" className="db-export" onClick={fetchVehicles}>
          <RefreshCw size={18} />
          새로고침
        </button>
      </header>

      {notice && (
        <div className={`db-notice ${notice.type}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="닫기">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="db-stats" aria-label="DB 통계">
        {statItems.map((item) => (
          <article
            key={item.key}
            className={activeFilter === item.key ? 'active' : ''}
            onClick={() => setActiveFilter(item.key)}
          >
            <span>{item.label}</span>
            <strong>{counts[item.key === 'all' ? 'total' : item.key]}</strong>
          </article>
        ))}
      </section>

      <section className="admin-layout">
        <form className="db-panel admin-form" onSubmit={saveVehicle}>
          <h2>{editingId ? '차량 수정' : '차량 추가'}</h2>
          <label>
            차량번호
            <input
              value={form.plate_number}
              onChange={(event) => setForm({ ...form, plate_number: event.target.value })}
              placeholder="12가3456 또는 1234"
            />
          </label>
          <label>
            차종
            <input
              value={form.car_model}
              onChange={(event) => setForm({ ...form, car_model: event.target.value })}
              placeholder="뉴싼타페"
            />
          </label>
          <label>
            메모
            <textarea
              value={form.memo}
              onChange={(event) => setForm({ ...form, memo: event.target.value })}
              placeholder="주차장 위치, 특이사항"
            />
          </label>
          <div className="db-form-actions">
            <button type="submit" disabled={saving}>
              {editingId ? <Save size={18} /> : <Plus size={18} />}
              {saving ? '저장 중' : editingId ? '수정 저장' : '추가'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}>
                <X size={18} />
                취소
              </button>
            )}
          </div>
        </form>

        <section className="db-panel admin-list-panel">
          <div className="db-toolbar">
            <div className="db-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="차량번호, 차종, 메모 검색"
              />
            </div>
            <button type="button" className="db-export" onClick={exportCsv}>
              <Download size={18} />
              CSV
            </button>
          </div>

          <div className="db-list">
            {loading && <p className="db-empty">불러오는 중입니다.</p>}
            {!loading && filteredVehicles.length === 0 && <p className="db-empty">검색 결과가 없습니다.</p>}
            {!loading && filteredVehicles.length > 0 && (
              <p className="db-list-caption">
                {activeFilterLabel} {filteredVehicles.length}대
              </p>
            )}
            {filteredVehicles.map((vehicle) => {
              const tags = getVehicleTags(vehicle.car_model);
              return (
                <article key={vehicle.id} className="db-row admin-row">
                  <div>
                    <strong>{vehicle.plate_number}</strong>
                    <span>{vehicle.car_model}</span>
                    {vehicle.memo && <small>{vehicle.memo}</small>}
                  </div>
                  <div className="vehicle-tags">
                    <span>{tags.vehicleType}</span>
                    <span className={tags.mechanicalParking === '가능' ? 'fit' : 'blocked'}>
                      기계식 {tags.mechanicalParking}
                    </span>
                    <small>{tags.mechanicalNote}</small>
                  </div>
                  <div className="db-row-actions">
                    <button type="button" onClick={() => editVehicle(vehicle)} aria-label="수정">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => deleteVehicle(vehicle)} aria-label="삭제">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

const root = createRoot(document.getElementById('root'));

const urlParams = new URLSearchParams(window.location.search);
const appMode = urlParams.get('mode');

root.render(appMode === 'admin' ? <MacAdminApp /> : window.location.pathname.startsWith('/db') ? <DatabaseApp /> : <CameraApp />);
