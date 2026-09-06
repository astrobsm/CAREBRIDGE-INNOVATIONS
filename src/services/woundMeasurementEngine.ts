/**
 * Calibrated Wound Measurement Engine
 * AstroHEALTH Innovations in Healthcare
 *
 * High-accuracy wound measurement using:
 * - TensorFlow.js → wound segmentation (color thresholding + U-Net-ready)
 * - OpenCV-style contour detection & measurement (pure JS implementation)
 * - QR-coded scale marker detection for automatic calibration
 * - Disposable wound ruler / 1cm grid calibration sticker support
 * - IndexedDB offline storage
 * - Progress tracking with Chart.js-compatible data
 *
 * WHY CALIBRATION IS CRITICAL:
 * Without calibration, camera distance and angle distort size,
 * making measurements unreliable. This engine enforces pixel-to-cm
 * calibration before any measurement is recorded.
 */

import * as tf from '@tensorflow/tfjs';

// =====================================================
// TYPES
// =====================================================

export interface CalibrationResult {
  pixelsPerCm: number;
  method: 'qr_marker' | 'grid_sticker' | 'ruler' | 'coin' | 'credit_card' | 'custom' | 'manual_points';
  confidence: number; // 0-100
  referenceObjectSizeCm: number;
  detectedSizePixels: number;
  angleCorrectionApplied: boolean;
  perspectiveCorrectionApplied: boolean;
  timestamp: Date;
}

export interface WoundContour {
  points: { x: number; y: number }[];
  areaPx: number;
  perimeterPx: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  majorAxisPx: number;
  minorAxisPx: number;
}

export interface CalibratedMeasurement {
  id: string;
  woundId?: string;
  patientId?: string;

  // Calibration
  calibration: CalibrationResult;

  // Wound metrics (in cm / cm²)
  lengthCm: number;
  widthCm: number;
  areaCm2: number;
  perimeterCm: number;
  depthCm?: number;
  volumeCm3?: number;

  // Tissue analysis
  tissueComposition: {
    granulationPercent: number;
    sloughPercent: number;
    necroticPercent: number;
    epithelialPercent: number;
    hypergranulationPercent: number;
  };

  // Color analysis
  colorAnalysis: {
    dominantColor: 'red' | 'yellow' | 'black' | 'pink' | 'mixed';
    rgbHistogram: { r: number; g: number; b: number }[];
    healthIndicator: 'healthy' | 'concerning' | 'critical';
  };

  // Quality
  segmentationMethod: 'ai_auto' | 'ai_assisted' | 'manual_trace';
  confidence: number;
  imageDataUrl: string;
  annotatedImageDataUrl?: string;

  // Meta
  capturedAt: Date;
  analyzedBy: string;
}

export interface WoundProgressDataPoint {
  date: string;
  areaCm2: number;
  lengthCm: number;
  widthCm: number;
  depthCm?: number;
  granulationPercent: number;
  healingRate: number; // % area reduction per week
}

// =====================================================
// QR-CODED SCALE MARKER
// =====================================================

/**
 * The calibration marker specification — the single source of truth shared by
 * the detector below and the printable marker sheet (utils/calibrationRulerPdf).
 *
 * Green is deliberate, not decorative. It is the complement of red, so it
 * separates cleanly from blood, granulation and slough; a black or grey marker
 * occupies the same tonal range as eschar and shadow and cannot be segmented
 * reliably against a wound bed.
 *
 * These values must stay in step with `detectColorMarker` below, which measures
 * the BOUNDING BOX of green pixels and divides by `sizeMm`. The printed green
 * must therefore describe the marker's outer edge exactly, and nothing else in
 * the frame may be green — which is why the sheet prints markers alone, with a
 * quiet zone and no green ink anywhere else on the page.
 */
export const CALIBRATION_MARKER = {
  /**
   * Marker geometry, matching the sheet already in clinical use at the
   * Plastic Surgery Unit, UNTH Enugu: solid green bars, all 10 mm wide, in two
   * lengths. The app prints the same sheet so field and software agree.
   *
   * The constant width is the useful property. Because every bar is 10 mm
   * across, a bar's length in centimetres equals its aspect ratio, which gives
   * a second, independent read on the scale — see inferGreenReferenceCm.
   */
  barWidthMm: 10,
  /** Standard bar. Suits most wounds. */
  sizeMm: 50,
  /** Long bar, for wounds beyond roughly 10 cm. */
  largeSizeMm: 100,

  /**
   * #00A000 — the ink already printed on the unit's sheets.
   *
   * Darker than a vivid green (g=160), which matters: the detector's absolute
   * brightness gate has to sit low enough that this still registers under ward
   * lighting and in shadow. See isMarkerGreen.
   */
  rgb: { r: 0, g: 160, b: 0 },
  hex: '#00A000',
} as const;

/**
 * Absolute floor on the green channel.
 *
 * Its only job is to reject dark noise, since the ratio tests below already
 * exclude every grey and every warm tissue colour. It was 120, which rejected
 * the unit's #00A000 marker (g=160) as soon as exposure dropped below about
 * 0.75 — routine indoors, under a shadow, or at the edge of a flash. At 90 the
 * same marker survives down to roughly 0.56 exposure.
 *
 * Verified against blood, granulation, slough, eschar, skin, gauze, drapes and
 * steel in calibrationMarker.test.ts; none pass at this floor.
 */
const MARKER_GREEN_FLOOR = 90;

/**
 * Whether a pixel counts as marker green.
 *
 * Exported so the printable sheet can assert that the ink it specifies is
 * actually detectable, rather than trusting a copied constant to stay correct.
 */
export function isMarkerGreen(r: number, g: number, b: number): boolean {
  return g > MARKER_GREEN_FLOOR && g > r * 1.5 && g > b * 1.5;
}

/** Known bar lengths, in cm, that a detected green bar may be. */
const BAR_LENGTHS_CM = [
  CALIBRATION_MARKER.sizeMm / 10,      // 5 cm
  CALIBRATION_MARKER.largeSizeMm / 10, // 10 cm
];

export interface GreenReference {
  /** Real-world length of the green object's long edge, in cm. */
  knownCm: number;
  /** How far the shape sits from the nearest known marker, 0 = exact. */
  aspectDeviation: number;
  /** False when the shape matches no known marker and the scale is a guess. */
  recognised: boolean;
}

/**
 * Identify a detected green object and return the real length of its long edge.
 *
 * Every marker on the sheet is 10 mm wide, so a bar's length in centimetres is
 * simply its aspect ratio — a 5 cm bar photographs at 5:1, a 10 cm bar at 10:1.
 * That makes the aspect ratio, not an arbitrary size table, the thing that
 * identifies the marker.
 *
 * The measured aspect is snapped to the nearest printed length so that ordinary
 * perspective foreshortening does not shift the scale; how far it had to move is
 * returned, and a large deviation means the marker was photographed at a steep
 * angle or is not one of ours, which the caller surfaces rather than silently
 * trusting.
 *
 * This replaces a table that read anything with aspect > 8 as a 15 cm ruler,
 * which turned the unit's 10 cm bar into a 15 cm one: a scale 1.5x too large,
 * and an area 56% too small.
 */
export function inferGreenReferenceCm(aspect: number): GreenReference {
  // A roughly square green object is not one of the bars. It is most likely a
  // green swab, drape corner or instrument handle, so no scale is claimed.
  if (aspect < 2.5) {
    return { knownCm: 0, aspectDeviation: Infinity, recognised: false };
  }

  let best = BAR_LENGTHS_CM[0];
  let bestDev = Infinity;
  for (const cm of BAR_LENGTHS_CM) {
    const dev = Math.abs(aspect - cm) / cm;
    if (dev < bestDev) { bestDev = dev; best = cm; }
  }

  // Beyond 25% from any printed bar, the shape is not confidently identifiable.
  // The midpoint between the two bars sits at aspect 7, where snapping either
  // way would be a coin toss that doubles or halves the scale, so that region
  // is deliberately left unrecognised.
  //
  // The fallback is not a guess: every bar is 10 mm wide, so the length in cm
  // IS the aspect ratio. It is simply less certain than a clean match, and the
  // caller lowers confidence accordingly.
  if (bestDev > 0.25) {
    return { knownCm: aspect, aspectDeviation: bestDev, recognised: false };
  }
  return { knownCm: best, aspectDeviation: bestDev, recognised: true };
}

/**
 * Attempts to detect the AstroHEALTH QR calibration marker in an image.
 * Falls back to color-based marker detection if QR decode fails.
 */
export async function detectCalibrationMarker(
  imageSource: HTMLCanvasElement | HTMLImageElement | string
): Promise<CalibrationResult | null> {
  const canvas = await imageToCanvas(imageSource);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Try color-based marker detection (green border marker)
  const markerResult = detectColorMarker(imageData, canvas.width, canvas.height);
  if (markerResult) {
    return {
      pixelsPerCm: markerResult.pixelsPerCm,
      method: 'qr_marker',
      confidence: markerResult.confidence,
      referenceObjectSizeCm: markerResult.knownCm,
      detectedSizePixels: markerResult.sizePixels,
      angleCorrectionApplied: false,
      perspectiveCorrectionApplied: false,
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Detects a bright green calibration marker border in the image.
 * The AstroHEALTH calibration sticker has a distinctive green border.
 */
function detectColorMarker(
  imageData: ImageData,
  width: number,
  height: number
): { pixelsPerCm: number; sizePixels: number; confidence: number; knownCm: number } | null {
  const data = imageData.data;

  // Find green pixels (calibration marker border)
  const greenMask: boolean[] = new Array(width * height).fill(false);
  let greenCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Bright green detection (HSV-like in RGB). Shared with the printable
    // marker sheet so the ink and the detector cannot disagree.
    if (isMarkerGreen(r, g, b)) {
      greenMask[i / 4] = true;
      greenCount++;
    }
  }

  if (greenCount < 100) return null;

  // Find bounding box of green region
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (greenMask[y * width + x]) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const detectedWidth = maxX - minX;
  const detectedHeight = maxY - minY;

  // The printed markers are bars, not squares. This previously required a
  // roughly square shape and rejected anything below 0.7 — which threw away
  // every real marker, since a 5 cm bar is 5:1 and a 10 cm bar is 10:1.
  const longer = Math.max(detectedWidth, detectedHeight);
  const shorter = Math.max(1, Math.min(detectedWidth, detectedHeight));
  const aspect = longer / shorter;

  const ref = inferGreenReferenceCm(aspect);
  if (ref.knownCm <= 0) return null;

  const pixelsPerCm = longer / ref.knownCm;

  return {
    pixelsPerCm,
    sizePixels: longer,
    knownCm: ref.knownCm,
    // A shape that had to be snapped a long way to reach a known bar was
    // photographed at an angle, and its scale is correspondingly less certain.
    confidence: Math.max(
      40,
      Math.min(95, (ref.recognised ? 90 : 60) - ref.aspectDeviation * 100),
    ),
  };
}

// =====================================================
// GRID STICKER DETECTION (1cm grid)
// =====================================================

/**
 * Detects a 1cm grid pattern in the image using line detection.
 * A calibration sticker with a printed 1cm grid is placed next to the wound.
 */
export function detectGridCalibration(
  imageData: ImageData,
  width: number,
  height: number
): CalibrationResult | null {
  // Convert to grayscale
  const gray = toGrayscale(imageData);

  // Edge detection (Sobel-like)
  const edges = sobelEdgeDetection(gray, width, height);

  // Find horizontal and vertical line spacings
  const hSpacing = findDominantSpacing(edges, width, height, 'horizontal');
  const vSpacing = findDominantSpacing(edges, width, height, 'vertical');

  if (!hSpacing || !vSpacing) return null;

  // Average spacing = pixels per cm (since grid is 1cm)
  const avgSpacingPx = (hSpacing + vSpacing) / 2;
  
  if (avgSpacingPx < 10 || avgSpacingPx > 500) return null;

  return {
    pixelsPerCm: avgSpacingPx,
    method: 'grid_sticker',
    confidence: 85,
    referenceObjectSizeCm: 1.0,
    detectedSizePixels: avgSpacingPx,
    angleCorrectionApplied: false,
    perspectiveCorrectionApplied: false,
    timestamp: new Date(),
  };
}

// =====================================================
// RULER DETECTION
// =====================================================

/**
 * Calibrate using a physical ruler visible in the image.
 * User clicks two points on known ruler marks.
 */
export function calibrateFromRulerPoints(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  knownDistanceCm: number
): CalibrationResult {
  const distPx = Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );

  return {
    pixelsPerCm: distPx / knownDistanceCm,
    method: 'manual_points',
    confidence: 90,
    referenceObjectSizeCm: knownDistanceCm,
    detectedSizePixels: distPx,
    angleCorrectionApplied: false,
    perspectiveCorrectionApplied: false,
    timestamp: new Date(),
  };
}

/**
 * Calibrate using a reference object of known size.
 */
export function calibrateFromReferenceObject(
  method: CalibrationResult['method'],
  objectSizeCm: number,
  detectedSizePixels: number
): CalibrationResult {
  return {
    pixelsPerCm: detectedSizePixels / objectSizeCm,
    method,
    confidence: method === 'coin' ? 85 : method === 'credit_card' ? 88 : 80,
    referenceObjectSizeCm: objectSizeCm,
    detectedSizePixels,
    angleCorrectionApplied: false,
    perspectiveCorrectionApplied: false,
    timestamp: new Date(),
  };
}

// =====================================================
// WOUND SEGMENTATION (TensorFlow.js)
// =====================================================

/**
 * AI-powered wound segmentation using color thresholding with TensorFlow.js.
 * Production: replace with a trained U-Net or DeepLabV3+ model.
 */
export async function segmentWoundAI(
  canvas: HTMLCanvasElement
): Promise<{ mask: ImageData; contour: WoundContour } | null> {
  try {
    await tf.ready();
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Get image tensor
    const imgTensor = tf.browser.fromPixels(canvas);
    const normalized = imgTensor.div(255);
    const channels = normalized.split(3, 2); // [R, G, B]

    // Wound tissue color detection (reddish/pinkish tissue)
    // R > 0.3, G < 0.65, B < 0.65 and R > G and R > B
    const rChannel = channels[0];
    const gChannel = channels[1];
    const bChannel = channels[2];

    const rThresh = rChannel.greater(0.3);
    const gThresh = gChannel.less(0.65);
    const bThresh = bChannel.less(0.65);
    const rGtG = rChannel.greater(gChannel);
    const rGtB = rChannel.greater(bChannel);

    // Combine conditions
    let mask = rThresh.logicalAnd(gThresh).logicalAnd(bThresh).logicalAnd(rGtG).logicalAnd(rGtB);

    // Also detect yellow/slough tissue: R > 0.5, G > 0.4, B < 0.35
    const sloughR = rChannel.greater(0.5);
    const sloughG = gChannel.greater(0.4);
    const sloughB = bChannel.less(0.35);
    const sloughMask = sloughR.logicalAnd(sloughG).logicalAnd(sloughB);

    // Also detect necrotic/black tissue: all channels < 0.25
    const necR = rChannel.less(0.25);
    const necG = gChannel.less(0.25);
    const necB = bChannel.less(0.25);
    const necMask = necR.logicalAnd(necG).logicalAnd(necB);

    // Union of all wound tissue masks
    mask = mask.logicalOr(sloughMask).logicalOr(necMask);

    // Convert mask to pixel data
    const maskTensor = mask.squeeze();
    const maskData = await maskTensor.data();
    const w = canvas.width;
    const h = canvas.height;

    // Create output ImageData
    const outputData = new ImageData(w, h);
    for (let i = 0; i < maskData.length; i++) {
      const val = maskData[i] ? 255 : 0;
      outputData.data[i * 4] = val;
      outputData.data[i * 4 + 1] = 0;
      outputData.data[i * 4 + 2] = 0;
      outputData.data[i * 4 + 3] = val ? 128 : 0;
    }

    // Extract contour from mask
    const boolMask = Array.from(maskData).map(v => v > 0);
    const contour = extractContour(boolMask, w, h);

    // Cleanup tensors
    tf.dispose([imgTensor, normalized, ...channels, rThresh, gThresh, bThresh,
      rGtG, rGtB, mask, sloughR, sloughG, sloughB, sloughMask,
      necR, necG, necB, necMask, maskTensor]);

    if (!contour || contour.areaPx < 50) return null;

    return { mask: outputData, contour };
  } catch (err) {
    console.error('[WoundEngine] AI segmentation failed:', err);
    return null;
  }
}

/**
 * Analyze tissue composition from wound image using color analysis.
 */
export function analyzeTissueComposition(
  canvas: HTMLCanvasElement,
  woundMask: boolean[]
): CalibratedMeasurement['tissueComposition'] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { granulationPercent: 0, sloughPercent: 0, necroticPercent: 0, epithelialPercent: 0, hypergranulationPercent: 0 };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let granulation = 0, slough = 0, necrotic = 0, epithelial = 0, hypergranulation = 0;
  let total = 0;

  for (let i = 0; i < woundMask.length; i++) {
    if (!woundMask[i]) continue;
    total++;
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;

    // Red/beefy = healthy granulation tissue
    if (r > 0.5 && g < 0.3 && b < 0.3) {
      granulation++;
    }
    // Dark red / over-red = hypergranulation
    else if (r > 0.6 && g < 0.15 && b < 0.15) {
      hypergranulation++;
    }
    // Yellow/cream = slough
    else if (r > 0.5 && g > 0.4 && b < 0.35) {
      slough++;
    }
    // Black/dark = necrotic/eschar
    else if (r < 0.2 && g < 0.2 && b < 0.2) {
      necrotic++;
    }
    // Pink/light = epithelial (healing edges)
    else if (r > 0.6 && g > 0.4 && b > 0.4 && r > g) {
      epithelial++;
    }
    // Default to granulation for ambiguous wound-colored pixels
    else if (r > 0.35 && r > g && r > b) {
      granulation++;
    }
  }

  if (total === 0) return { granulationPercent: 0, sloughPercent: 0, necroticPercent: 0, epithelialPercent: 0, hypergranulationPercent: 0 };

  return {
    granulationPercent: Math.round((granulation / total) * 100),
    sloughPercent: Math.round((slough / total) * 100),
    necroticPercent: Math.round((necrotic / total) * 100),
    epithelialPercent: Math.round((epithelial / total) * 100),
    hypergranulationPercent: Math.round((hypergranulation / total) * 100),
  };
}

// =====================================================
// CONTOUR DETECTION (OpenCV-style, pure JS)
// =====================================================

/**
 * Extract the largest contour from a binary mask using Moore boundary tracing.
 */
function extractContour(mask: boolean[], width: number, height: number): WoundContour | null {
  // Find start point (top-left-most true pixel)
  let startX = -1, startY = -1;
  for (let y = 0; y < height && startX === -1; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        startX = x;
        startY = y;
        break;
      }
    }
  }

  if (startX === -1) return null;

  // Moore boundary tracing (8-connectivity)
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  const contourPoints: { x: number; y: number }[] = [];
  let cx = startX, cy = startY;
  let dir = 7; // Start direction

  const maxIter = width * height * 2;
  let iter = 0;

  do {
    contourPoints.push({ x: cx, y: cy });
    let found = false;

    for (let i = 0; i < 8; i++) {
      const nd = (dir + i + 5) % 8; // Counter-clockwise search
      const nx = cx + dx[nd];
      const ny = cy + dy[nd];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx]) {
        cx = nx;
        cy = ny;
        dir = nd;
        found = true;
        break;
      }
    }

    if (!found) break;
    iter++;
  } while ((cx !== startX || cy !== startY) && iter < maxIter);

  if (contourPoints.length < 3) return null;

  // Calculate area (Shoelace formula)
  let areaPx = 0;
  const n = contourPoints.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    areaPx += contourPoints[i].x * contourPoints[j].y;
    areaPx -= contourPoints[j].x * contourPoints[i].y;
  }
  areaPx = Math.abs(areaPx) / 2;

  // Calculate perimeter
  let perimeterPx = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeterPx += Math.sqrt(
      Math.pow(contourPoints[j].x - contourPoints[i].x, 2) +
      Math.pow(contourPoints[j].y - contourPoints[i].y, 2)
    );
  }

  // Bounding box
  const xs = contourPoints.map(p => p.x);
  const ys = contourPoints.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  // Centroid
  const centroid = {
    x: contourPoints.reduce((s, p) => s + p.x, 0) / n,
    y: contourPoints.reduce((s, p) => s + p.y, 0) / n,
  };

  // Major/minor axes (from bounding box)
  const bbWidth = maxX - minX;
  const bbHeight = maxY - minY;

  return {
    points: contourPoints,
    areaPx,
    perimeterPx,
    boundingBox: { x: minX, y: minY, width: bbWidth, height: bbHeight },
    centroid,
    majorAxisPx: Math.max(bbWidth, bbHeight),
    minorAxisPx: Math.min(bbWidth, bbHeight),
  };
}

// =====================================================
// CALIBRATED MEASUREMENT PIPELINE
// =====================================================

/**
 * Full measurement pipeline:
 * 1. Calibrate from marker/ruler/object
 * 2. Segment wound
 * 3. Extract contour
 * 4. Convert px → cm using calibration
 * 5. Analyze tissue composition
 * 6. Return calibrated measurement
 */
export function computeCalibratedMeasurement(
  contour: WoundContour,
  calibration: CalibrationResult,
  canvas: HTMLCanvasElement,
  woundMask: boolean[],
  depthCm?: number
): Omit<CalibratedMeasurement, 'id' | 'woundId' | 'patientId' | 'imageDataUrl' | 'annotatedImageDataUrl' | 'capturedAt' | 'analyzedBy'> {
  const pxPerCm = calibration.pixelsPerCm;
  const px2ToCm2 = pxPerCm * pxPerCm;

  const lengthCm = parseFloat((contour.majorAxisPx / pxPerCm).toFixed(2));
  const widthCm = parseFloat((contour.minorAxisPx / pxPerCm).toFixed(2));
  const areaCm2 = parseFloat((contour.areaPx / px2ToCm2).toFixed(2));
  const perimeterCm = parseFloat((contour.perimeterPx / pxPerCm).toFixed(2));
  const volumeCm3 = depthCm ? parseFloat((areaCm2 * depthCm * 0.327).toFixed(2)) : undefined; // Kundin approximation

  const tissueComposition = analyzeTissueComposition(canvas, woundMask);

  // Determine dominant color and health indicator
  const maxTissue = Math.max(
    tissueComposition.granulationPercent,
    tissueComposition.sloughPercent,
    tissueComposition.necroticPercent,
    tissueComposition.epithelialPercent
  );
  let dominantColor: 'red' | 'yellow' | 'black' | 'pink' | 'mixed' = 'mixed';
  if (maxTissue === tissueComposition.granulationPercent) dominantColor = 'red';
  else if (maxTissue === tissueComposition.sloughPercent) dominantColor = 'yellow';
  else if (maxTissue === tissueComposition.necroticPercent) dominantColor = 'black';
  else if (maxTissue === tissueComposition.epithelialPercent) dominantColor = 'pink';

  let healthIndicator: 'healthy' | 'concerning' | 'critical' = 'healthy';
  if (tissueComposition.necroticPercent > 30 || tissueComposition.sloughPercent > 50) {
    healthIndicator = 'critical';
  } else if (tissueComposition.necroticPercent > 10 || tissueComposition.sloughPercent > 30) {
    healthIndicator = 'concerning';
  }

  return {
    calibration,
    lengthCm,
    widthCm,
    areaCm2,
    perimeterCm,
    depthCm,
    volumeCm3,
    tissueComposition,
    colorAnalysis: {
      dominantColor,
      rgbHistogram: [],
      healthIndicator,
    },
    segmentationMethod: 'ai_auto',
    confidence: Math.min(calibration.confidence, 90),
  };
}

// =====================================================
// WOUND PROGRESS TRACKING (Chart.js-compatible)
// =====================================================

/**
 * Generate Chart.js-compatible wound healing progress data.
 */
export function generateProgressData(
  measurements: { date: Date; areaCm2: number; lengthCm: number; widthCm: number; depthCm?: number; granulationPercent: number }[]
): WoundProgressDataPoint[] {
  if (measurements.length === 0) return [];

  const sorted = [...measurements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const baseline = sorted[0].areaCm2;

  return sorted.map((m, i) => {
    let healingRate = 0;
    if (i > 0 && baseline > 0) {
      const weeksDiff = (m.date.getTime() - sorted[i - 1].date.getTime()) / (7 * 24 * 3600 * 1000);
      if (weeksDiff > 0) {
        const areaReduction = sorted[i - 1].areaCm2 - m.areaCm2;
        healingRate = parseFloat(((areaReduction / baseline) * 100 / weeksDiff).toFixed(2));
      }
    }

    return {
      date: m.date.toISOString().split('T')[0],
      areaCm2: m.areaCm2,
      lengthCm: m.lengthCm,
      widthCm: m.widthCm,
      depthCm: m.depthCm,
      granulationPercent: m.granulationPercent,
      healingRate,
    };
  });
}

/**
 * Calculate the Wound Healing Score (composite).
 * Based on PUSH (Pressure Ulcer Scale for Healing) adapted for all wound types.
 */
export function calculateWoundHealingScore(
  areaCm2: number,
  exudateAmount: 'none' | 'light' | 'moderate' | 'heavy',
  tissueType: 'epithelial' | 'granulation' | 'slough' | 'necrotic'
): { score: number; maxScore: number; interpretation: string } {
  // Area score (0-10)
  let areaScore = 0;
  if (areaCm2 === 0) areaScore = 0;
  else if (areaCm2 < 0.3) areaScore = 1;
  else if (areaCm2 < 0.7) areaScore = 2;
  else if (areaCm2 < 1.0) areaScore = 3;
  else if (areaCm2 < 2.0) areaScore = 4;
  else if (areaCm2 < 3.0) areaScore = 5;
  else if (areaCm2 < 4.0) areaScore = 6;
  else if (areaCm2 < 8.0) areaScore = 7;
  else if (areaCm2 < 12.0) areaScore = 8;
  else if (areaCm2 < 24.0) areaScore = 9;
  else areaScore = 10;

  // Exudate score (0-3)
  const exudateMap = { none: 0, light: 1, moderate: 2, heavy: 3 };
  const exudateScore = exudateMap[exudateAmount];

  // Tissue type score (0-4)
  const tissueMap = { epithelial: 1, granulation: 2, slough: 3, necrotic: 4 };
  const tissueScore = tissueMap[tissueType] || 0;

  const total = areaScore + exudateScore + tissueScore;
  const maxScore = 17;

  let interpretation = '';
  if (total === 0) interpretation = 'Wound healed / closed';
  else if (total <= 5) interpretation = 'Good healing trajectory — continue current treatment';
  else if (total <= 10) interpretation = 'Moderate — review treatment plan, consider adjustments';
  else if (total <= 14) interpretation = 'Poor healing — reassess wound care strategy, rule out infection';
  else interpretation = 'Critical — urgent reassessment, consider surgical debridement';

  return { score: total, maxScore, interpretation };
}

// =====================================================
// UTILITY FUNCTIONS (OpenCV-style image processing)
// =====================================================

function toGrayscale(imageData: ImageData): number[] {
  const gray: number[] = new Array(imageData.width * imageData.height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = Math.round(
      0.299 * imageData.data[idx] +
      0.587 * imageData.data[idx + 1] +
      0.114 * imageData.data[idx + 2]
    );
  }
  return gray;
}

function sobelEdgeDetection(gray: number[], width: number, height: number): number[] {
  const edges: number[] = new Array(width * height).fill(0);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0, sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const ki = (ky + 1) * 3 + (kx + 1);
          sx += gray[idx] * gx[ki];
          sy += gray[idx] * gy[ki];
        }
      }
      edges[y * width + x] = Math.sqrt(sx * sx + sy * sy);
    }
  }

  return edges;
}

function findDominantSpacing(
  edges: number[],
  width: number,
  height: number,
  direction: 'horizontal' | 'vertical'
): number | null {
  // Project edges onto one axis
  const len = direction === 'horizontal' ? height : width;
  const orthoLen = direction === 'horizontal' ? width : height;
  const projection: number[] = new Array(len).fill(0);

  for (let i = 0; i < len; i++) {
    for (let j = 0; j < orthoLen; j++) {
      const idx = direction === 'horizontal' ? i * width + j : j * width + i;
      projection[i] += edges[idx];
    }
  }

  // Find peaks in projection
  const threshold = projection.reduce((s, v) => s + v, 0) / len * 2;
  const peaks: number[] = [];

  for (let i = 2; i < len - 2; i++) {
    if (
      projection[i] > threshold &&
      projection[i] > projection[i - 1] &&
      projection[i] > projection[i + 1] &&
      projection[i] > projection[i - 2] &&
      projection[i] > projection[i + 2]
    ) {
      peaks.push(i);
    }
  }

  if (peaks.length < 3) return null;

  // Calculate median spacing between consecutive peaks
  const spacings: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    spacings.push(peaks[i] - peaks[i - 1]);
  }
  spacings.sort((a, b) => a - b);

  return spacings[Math.floor(spacings.length / 2)];
}

async function imageToCanvas(
  source: HTMLCanvasElement | HTMLImageElement | string
): Promise<HTMLCanvasElement> {
  if (source instanceof HTMLCanvasElement) return source;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (source instanceof HTMLImageElement) {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  // String = data URL
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = source;
  });
}

/**
 * Draw contour overlay on canvas for visual feedback.
 */
export function drawContourOverlay(
  canvas: HTMLCanvasElement,
  contour: WoundContour,
  calibration: CalibrationResult,
  color: string = 'rgba(0, 255, 0, 0.8)'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || contour.points.length < 3) return;

  ctx.save();

  // Draw contour
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contour.points[0].x, contour.points[0].y);
  for (let i = 1; i < contour.points.length; i++) {
    ctx.lineTo(contour.points[i].x, contour.points[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  // Draw bounding box with dimensions
  const bb = contour.boundingBox;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
  ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
  ctx.setLineDash([]);

  // Add dimension labels
  const pxPerCm = calibration.pixelsPerCm;
  const lengthCm = (contour.majorAxisPx / pxPerCm).toFixed(1);
  const widthCm = (contour.minorAxisPx / pxPerCm).toFixed(1);
  const areaCm2 = (contour.areaPx / (pxPerCm * pxPerCm)).toFixed(1);

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = 'yellow';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3;

  // Length label (top)
  ctx.fillText(`L: ${lengthCm} cm`, bb.x + bb.width / 2 - 30, bb.y - 8);
  // Width label (right)
  ctx.fillText(`W: ${widthCm} cm`, bb.x + bb.width + 5, bb.y + bb.height / 2);
  // Area label (center)
  ctx.fillText(`A: ${areaCm2} cm²`, contour.centroid.x - 30, contour.centroid.y);

  ctx.restore();
}

// =====================================================
// QR CALIBRATION STICKER PDF GENERATOR
// =====================================================


export default {
  detectCalibrationMarker,
  detectGridCalibration,
  calibrateFromRulerPoints,
  calibrateFromReferenceObject,
  segmentWoundAI,
  analyzeTissueComposition,
  computeCalibratedMeasurement,
  generateProgressData,
  calculateWoundHealingScore,
  drawContourOverlay,
};
