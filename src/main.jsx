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
  Save,
  Search,
  X,
} from 'lucide-react';
import { supabase, supabaseConfigured } from './supabaseClient';
import { getVehicleTags } from './vehicleTags';
import './styles.css';

const normalizePlate = (value) =>
  value.replace(/[^0-9A-Za-z가-힣]/g, '').toUpperCase();

const extractPlateCandidate = (text) => {
  const compact = normalizePlate(text);
  const fullPlate = compact.match(/\d{2,3}[가-힣]\d{4}/)?.[0];
  if (fullPlate) return fullPlate;

  const loosePlate = compact.match(/\d{2,3}[가-힣A-Z]\d{4}/)?.[0];
  if (loosePlate) return loosePlate;

  const lastFour = compact.match(/\d{4}/)?.[0];
  return lastFour ?? '';
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
      const results = [];

      for (let index = 0; index < imageCandidates.length; index += 1) {
        setOcrProgress(`OCR 인식 중 ${index + 1}/${imageCandidates.length}`);
        const {
          data: { text },
        } = await worker.recognize(imageCandidates[index]);
        const candidate = extractPlateCandidate(text);
        results.push({
          text,
          candidate,
          score: scorePlateCandidate(candidate),
        });
      }

      const best = results.sort((a, b) => b.score - a.score)[0];
      setRawOcrText(results.map((result) => result.text).join(' / '));
      return best?.candidate ?? '';
    } finally {
      await worker.terminate();
    }
  }

  function createOcrImageCandidates(sourceCanvas) {
    const cropFrames = [
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 0.08, y: 0.42, width: 0.84, height: 0.36 },
      { x: 0.16, y: 0.5, width: 0.68, height: 0.26 },
    ];

    return cropFrames.map((frame) => {
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

      const image = context.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const { data } = image;
      for (let index = 0; index < data.length; index += 4) {
        const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        const contrast = gray > 145 ? 255 : 0;
        data[index] = contrast;
        data[index + 1] = contrast;
        data[index + 2] = contrast;
      }
      context.putImageData(image, 0, 0);

      return outputCanvas.toDataURL('image/png');
    });
  }

  async function checkVehicle(plateNumber) {
    const normalizedPlate = normalizePlate(plateNumber);
    const lastFourDigits = normalizedPlate.match(/\d{4}$/)?.[0] ?? '';

    if (!supabaseConfigured) {
      const localMatch = vehicles.find(
        (vehicle) => {
          const savedPlate = normalizePlate(vehicle.plate_number);
          return (
            savedPlate === normalizedPlate ||
            isMissingLeadingPlateDigit(savedPlate, normalizedPlate) ||
            (lastFourDigits && savedPlate === lastFourDigits)
          );
        },
      );
      handleLookupResult(localMatch, plateNumber);
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
      summary.byModel[vehicle.car_model] = (summary.byModel[vehicle.car_model] ?? 0) + 1;
      return summary;
    },
    { total: 0, full: 0, partial: 0, sedan: 0, suv: 0, compact: 0, other: 0, byModel: {} },
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

const root = createRoot(document.getElementById('root'));

root.render(window.location.pathname.startsWith('/db') ? <DatabaseApp /> : <CameraApp />);
