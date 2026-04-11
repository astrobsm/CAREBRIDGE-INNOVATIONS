/**
 * CalibratedWoundCapture Component
 * AstroHEALTH Innovations in Healthcare
 *
 * Full-workflow wound measurement component:
 * 1. Camera capture or image upload
 * 2. Calibration (auto QR marker / grid / ruler points / reference object)
 * 3. AI segmentation or manual trace
 * 4. Calibrated measurements + tissue analysis
 * 5. Annotated image with dimension overlay
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  Ruler,
  Target,
  Scissors,
  CheckCircle,
  XCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Download,
  Grid,
  QrCode,
  Loader2,
  Info,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  detectCalibrationMarker,
  detectGridCalibration,
  calibrateFromRulerPoints,
  calibrateFromReferenceObject,
  segmentWoundAI,
  computeCalibratedMeasurement,
  drawContourOverlay,
  generateCalibrationStickerData,
  type CalibrationResult,
  type WoundContour,
  type CalibratedMeasurement,
} from '../../../services/woundMeasurementEngine';

// Reference objects for manual calibration
const REFERENCE_OBJECTS = [
  { id: 'ruler_1cm', label: 'Ruler (click 2 points, 1 cm apart)', sizeCm: 1, method: 'ruler' as const },
  { id: 'ruler_5cm', label: 'Ruler (click 2 points, 5 cm apart)', sizeCm: 5, method: 'ruler' as const },
  { id: 'coin_1naira', label: '₦1 Coin (Ø 2.2 cm)', sizeCm: 2.2, method: 'coin' as const },
  { id: 'coin_50kobo', label: '50 Kobo Coin (Ø 2.0 cm)', sizeCm: 2.0, method: 'coin' as const },
  { id: 'credit_card', label: 'Credit Card Width (5.4 cm)', sizeCm: 5.4, method: 'credit_card' as const },
  { id: 'grid_sticker', label: 'AstroHEALTH Grid Sticker (auto-detect)', sizeCm: 3, method: 'grid_sticker' as const },
  { id: 'qr_marker', label: 'AstroHEALTH QR Marker (auto-detect)', sizeCm: 3, method: 'qr_marker' as const },
];

type Step = 'capture' | 'calibrate' | 'segment' | 'results';

interface CalibratedWoundCaptureProps {
  onMeasurementComplete: (measurement: CalibratedMeasurement) => void;
  onCancel: () => void;
  patientId?: string;
  woundId?: string;
}

export default function CalibratedWoundCapture({
  onMeasurementComplete,
  onCancel,
  patientId,
  woundId,
}: CalibratedWoundCaptureProps) {
  const [step, setStep] = useState<Step>('capture');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Calibration state
  const [calibration, setCalibration] = useState<CalibrationResult | null>(null);
  const [selectedRef, setSelectedRef] = useState(REFERENCE_OBJECTS[0]);
  const [calPoints, setCalPoints] = useState<{ x: number; y: number }[]>([]);

  // Segmentation state
  const [segMode, setSegMode] = useState<'ai' | 'manual'>('ai');
  const [manualPoints, setManualPoints] = useState<{ x: number; y: number }[]>([]);
  const [contour, setContour] = useState<WoundContour | null>(null);

  // Measurement state
  const [measurement, setMeasurement] = useState<CalibratedMeasurement | null>(null);
  const [depthCm, setDepthCm] = useState<number | undefined>(undefined);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // === STEP 1: CAPTURE ===

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      toast.error('Camera access denied');
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setImageSrc(canvas.toDataURL('image/jpeg', 0.92));

    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
    setStep('calibrate');
    toast.success('Image captured — now calibrate');
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setStep('calibrate');
    };
    reader.readAsDataURL(file);
  }, []);

  // === STEP 2: CALIBRATE ===

  const handleCalibrationClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const newPoints = [...calPoints, { x, y }];
      setCalPoints(newPoints);

      // Draw point marker
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Connect points with line
        if (newPoints.length === 2) {
          ctx.beginPath();
          ctx.moveTo(newPoints[0].x, newPoints[0].y);
          ctx.lineTo(newPoints[1].x, newPoints[1].y);
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      if (newPoints.length >= 2 && (selectedRef.method === 'ruler' || selectedRef.method === 'coin' || selectedRef.method === 'credit_card')) {
        const distPx = Math.sqrt(
          Math.pow(newPoints[1].x - newPoints[0].x, 2) +
          Math.pow(newPoints[1].y - newPoints[0].y, 2)
        );
        const cal = calibrateFromReferenceObject(
          selectedRef.method as CalibrationResult['method'],
          selectedRef.sizeCm,
          distPx
        );
        setCalibration(cal);
        toast.success(`Calibrated: ${cal.pixelsPerCm.toFixed(1)} px/cm (${cal.confidence}% confidence)`);
      }
    },
    [calPoints, selectedRef]
  );

  const tryAutoCalibrate = useCallback(async () => {
    if (!canvasRef.current || !imageSrc) return;
    setIsProcessing(true);

    // Draw image on canvas
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) { setIsProcessing(false); return; }

    const img = new Image();
    img.onload = async () => {
      canvasRef.current!.width = img.width;
      canvasRef.current!.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Try QR marker detection first
      const markerResult = await detectCalibrationMarker(canvasRef.current!);
      if (markerResult) {
        setCalibration(markerResult);
        toast.success(`QR marker detected: ${markerResult.pixelsPerCm.toFixed(1)} px/cm`);
        setIsProcessing(false);
        return;
      }

      // Try grid sticker detection
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const gridResult = detectGridCalibration(imageData, img.width, img.height);
      if (gridResult) {
        setCalibration(gridResult);
        toast.success(`Grid detected: ${gridResult.pixelsPerCm.toFixed(1)} px/cm`);
        setIsProcessing(false);
        return;
      }

      toast('Auto-calibration failed — please calibrate manually', { icon: '⚠️' });
      setIsProcessing(false);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // === STEP 3: SEGMENT ===

  const handleSegmentClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (segMode !== 'manual' || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const newPoints = [...manualPoints, { x, y }];
      setManualPoints(newPoints);

      // Draw point and connecting lines
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        if (newPoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo(newPoints[newPoints.length - 2].x, newPoints[newPoints.length - 2].y);
          ctx.lineTo(x, y);
          ctx.strokeStyle = 'rgba(255,0,0,0.7)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    },
    [segMode, manualPoints]
  );

  const runAISegmentation = useCallback(async () => {
    if (!canvasRef.current || !calibration) return;
    setIsProcessing(true);
    try {
      const result = await segmentWoundAI(canvasRef.current);
      if (result) {
        setContour(result.contour);
        drawContourOverlay(canvasRef.current, result.contour, calibration);
        toast.success('AI segmentation complete');
      } else {
        toast.error('AI could not detect wound — try manual trace');
        setSegMode('manual');
      }
    } catch (err) {
      toast.error('AI segmentation failed — switch to manual');
      setSegMode('manual');
    }
    setIsProcessing(false);
  }, [calibration]);

  const finalizeManualContour = useCallback(() => {
    if (manualPoints.length < 3 || !canvasRef.current || !calibration) return;
    // Build contour from manual points
    const pts = manualPoints;
    let areaPx = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      areaPx += pts[i].x * pts[j].y;
      areaPx -= pts[j].x * pts[i].y;
    }
    areaPx = Math.abs(areaPx) / 2;

    let perimeterPx = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      perimeterPx += Math.sqrt(Math.pow(pts[j].x - pts[i].x, 2) + Math.pow(pts[j].y - pts[i].y, 2));
    }

    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const manualContour: WoundContour = {
      points: pts,
      areaPx,
      perimeterPx,
      boundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      centroid: { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n },
      majorAxisPx: Math.max(maxX - minX, maxY - minY),
      minorAxisPx: Math.min(maxX - minX, maxY - minY),
    };

    setContour(manualContour);
    drawContourOverlay(canvasRef.current, manualContour, calibration, 'rgba(255, 0, 0, 0.8)');
    toast.success('Manual trace complete');
  }, [manualPoints, calibration]);

  // === STEP 4: RESULTS ===

  const computeResults = useCallback(() => {
    if (!contour || !calibration || !canvasRef.current) return;
    setIsProcessing(true);

    const woundMask = new Array(canvasRef.current.width * canvasRef.current.height).fill(false);
    // Fill mask from contour (simple scanline)
    const pts = contour.points;
    const bb = contour.boundingBox;
    for (let y = bb.y; y < bb.y + bb.height; y++) {
      for (let x = bb.x; x < bb.x + bb.width; x++) {
        if (pointInPolygon(x, y, pts)) {
          woundMask[Math.round(y) * canvasRef.current.width + Math.round(x)] = true;
        }
      }
    }

    const result = computeCalibratedMeasurement(
      contour,
      calibration,
      canvasRef.current,
      woundMask,
      depthCm
    );

    const fullMeasurement: CalibratedMeasurement = {
      ...result,
      id: crypto.randomUUID(),
      woundId,
      patientId,
      imageDataUrl: canvasRef.current.toDataURL('image/jpeg', 0.85),
      annotatedImageDataUrl: canvasRef.current.toDataURL('image/jpeg', 0.85),
      capturedAt: new Date(),
      analyzedBy: result.segmentationMethod === 'ai_auto' ? 'AI Engine' : 'Manual',
      segmentationMethod: segMode === 'ai' ? 'ai_auto' : 'manual_trace',
    };

    setMeasurement(fullMeasurement);
    setStep('results');
    setIsProcessing(false);
  }, [contour, calibration, depthCm, patientId, woundId, segMode]);

  // Redraw image when moving back to calibrate/segment steps
  const drawImageOnCanvas = useCallback(() => {
    if (!imageSrc || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvasRef.current!.width = img.width;
      canvasRef.current!.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (step === 'calibrate' || step === 'segment') {
      drawImageOnCanvas();
    }
  }, [step, drawImageOnCanvas]);

  // ==================== RENDER ====================

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with step indicator */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Calibrated Wound Measurement
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {(['capture', 'calibrate', 'segment', 'results'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                step === s ? 'bg-primary text-white' :
                ['capture', 'calibrate', 'segment', 'results'].indexOf(step) > i ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
              {i < 3 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* === STEP 1: CAPTURE === */}
        {step === 'capture' && (
          <div className="space-y-4">
            {isCameraActive ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg border border-gray-300"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    onClick={captureFrame}
                    className="px-6 py-3 bg-red-500 text-white rounded-full font-medium shadow-lg hover:bg-red-600"
                  >
                    <Camera className="w-5 h-5 inline mr-2" /> Capture
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-semibold mb-1">For accurate measurements:</p>
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>Place a calibration sticker or ruler next to the wound</li>
                        <li>Keep the camera parallel to the wound surface</li>
                        <li>Ensure good lighting — avoid shadows on the wound</li>
                        <li>Include the full wound and calibration object in frame</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary rounded-lg text-primary font-medium hover:bg-primary/5"
                  >
                    <Camera className="w-6 h-6" /> Open Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                  >
                    <Upload className="w-6 h-6" /> Upload Image
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            )}
          </div>
        )}

        {/* === STEP 2: CALIBRATE === */}
        {step === 'calibrate' && (
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border border-gray-300 cursor-crosshair"
              onClick={handleCalibrationClick}
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-yellow-700 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Calibration Required
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Without calibration, measurements will be unreliable. Camera distance and angle distort size.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Reference Object</label>
                <select
                  value={selectedRef.id}
                  onChange={(e) => {
                    setSelectedRef(REFERENCE_OBJECTS.find(r => r.id === e.target.value) || REFERENCE_OBJECTS[0]);
                    setCalPoints([]);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  {REFERENCE_OBJECTS.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={tryAutoCalibrate}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  Auto-Detect Marker
                </button>
                <button
                  onClick={() => setCalPoints([])}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Points
                </button>
              </div>
            </div>

            {calibration && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Calibrated</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {calibration.pixelsPerCm.toFixed(1)} px/cm | Method: {calibration.method} | Confidence: {calibration.confidence}%
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => { setStep('capture'); setCalibration(null); setCalPoints([]); setImageSrc(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!calibration) { toast.error('Please calibrate first'); return; }
                  setStep('segment');
                  setManualPoints([]);
                }}
                disabled={!calibration}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Next: Segment Wound <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* === STEP 3: SEGMENT === */}
        {step === 'segment' && (
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border border-gray-300 cursor-crosshair"
              onClick={handleSegmentClick}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setSegMode('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  segMode === 'ai' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Target className="w-4 h-4" /> AI Auto-Detect
              </button>
              <button
                onClick={() => setSegMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  segMode === 'manual' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Scissors className="w-4 h-4" /> Manual Trace
              </button>
            </div>

            {segMode === 'ai' ? (
              <button
                onClick={runAISegmentation}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                Run AI Wound Detection
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Click around the wound boundary to trace its outline. Close the shape when done.</p>
                <div className="flex gap-2">
                  <button
                    onClick={finalizeManualContour}
                    disabled={manualPoints.length < 3}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Finalize Trace ({manualPoints.length} pts)
                  </button>
                  <button
                    onClick={() => { setManualPoints([]); drawImageOnCanvas(); }}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-1" /> Clear
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Wound Depth (cm, optional)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={depthCm ?? ''}
                onChange={(e) => setDepthCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-32 p-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. 0.5"
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => { setStep('calibrate'); setContour(null); setManualPoints([]); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={computeResults}
                disabled={!contour || isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Compute Measurements
              </button>
            </div>
          </div>
        )}

        {/* === STEP 4: RESULTS === */}
        {step === 'results' && measurement && (
          <div className="space-y-4">
            {/* Annotated image */}
            {measurement.annotatedImageDataUrl && (
              <img
                src={measurement.annotatedImageDataUrl}
                alt="Annotated wound"
                className="w-full rounded-lg border border-gray-300"
              />
            )}

            {/* Dimensions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Length', value: `${measurement.lengthCm} cm`, color: 'blue' },
                { label: 'Width', value: `${measurement.widthCm} cm`, color: 'indigo' },
                { label: 'Area', value: `${measurement.areaCm2} cm²`, color: 'purple' },
                { label: 'Perimeter', value: `${measurement.perimeterCm} cm`, color: 'violet' },
              ].map(d => (
                <div key={d.label} className={`p-3 bg-${d.color}-50 border border-${d.color}-200 rounded-lg text-center`}>
                  <span className={`text-xs font-semibold text-${d.color}-600`}>{d.label}</span>
                  <p className={`text-xl font-bold text-${d.color}-800 mt-1`}>{d.value}</p>
                </div>
              ))}
            </div>
            {measurement.depthCm !== undefined && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  <span className="text-xs font-semibold text-rose-600">Depth</span>
                  <p className="text-xl font-bold text-rose-800 mt-1">{measurement.depthCm} cm</p>
                </div>
                {measurement.volumeCm3 !== undefined && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <span className="text-xs font-semibold text-red-600">Volume</span>
                    <p className="text-xl font-bold text-red-800 mt-1">{measurement.volumeCm3} cm³</p>
                  </div>
                )}
              </div>
            )}

            {/* Tissue Composition */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Tissue Composition</h4>
              <div className="space-y-2">
                {[
                  { label: 'Granulation', pct: measurement.tissueComposition.granulationPercent, color: 'bg-red-500' },
                  { label: 'Slough', pct: measurement.tissueComposition.sloughPercent, color: 'bg-yellow-500' },
                  { label: 'Necrotic', pct: measurement.tissueComposition.necroticPercent, color: 'bg-gray-800' },
                  { label: 'Epithelial', pct: measurement.tissueComposition.epithelialPercent, color: 'bg-pink-400' },
                  { label: 'Hypergranulation', pct: measurement.tissueComposition.hypergranulationPercent, color: 'bg-red-700' },
                ].map(t => (
                  <div key={t.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-28">{t.label}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calibration info */}
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <p><strong>Calibration:</strong> {measurement.calibration.method} | {measurement.calibration.pixelsPerCm.toFixed(1)} px/cm | {measurement.calibration.confidence}% confidence</p>
              <p><strong>Health:</strong> <span className={
                measurement.colorAnalysis.healthIndicator === 'healthy' ? 'text-green-600' :
                measurement.colorAnalysis.healthIndicator === 'concerning' ? 'text-yellow-600' : 'text-red-600'
              }>{measurement.colorAnalysis.healthIndicator.toUpperCase()}</span></p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => { setStep('segment'); setMeasurement(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Re-segment
              </button>
              <button
                onClick={() => onMeasurementComplete(measurement)}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
              >
                <CheckCircle className="w-5 h-5" /> Save Measurement
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for off-screen processing */}
      {step === 'capture' && <canvas ref={canvasRef} className="hidden" />}
    </div>
  );
}

// Point-in-polygon test (ray casting)
function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
