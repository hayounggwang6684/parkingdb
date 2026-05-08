import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createWorker } from 'tesseract.js';
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Save,
  X,
} from 'lucide-react';
import { supabase, supabaseConfigured } from './supabaseClient';
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

const emptyForm = {
  plate_number: '',
  car_model: '',
  memo: '',
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
      setIsCameraReady(true);
    } catch (error) {
      setIsCameraReady(false);
      setCameraError('카메라 권한을 허용해 주세요. iPhone은 Safari에서 HTTPS 주소로 접속해야 안정적입니다.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
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
          return savedPlate === normalizedPlate || (lastFourDigits && savedPlate === lastFourDigits);
        },
      );
      handleLookupResult(localMatch, plateNumber);
      return;
    }

    const exactResult = await supabase
      .from('vehicles')
      .select('id, plate_number, car_model, memo')
      .eq('normalized_plate_number', normalizedPlate)
      .maybeSingle();

    if (exactResult.error) {
      setNotice({ type: 'error', text: `등록 여부 확인 실패: ${exactResult.error.message}` });
      return;
    }

    if (exactResult.data || !lastFourDigits) {
      handleLookupResult(exactResult.data, plateNumber);
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

  return (
    <main className="app-shell">
      <section className="camera-screen">
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
            <button type="button" aria-label="닫기" onClick={() => setRegistrationOpen(false)}>
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

createRoot(document.getElementById('root')).render(<App />);
