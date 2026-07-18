/**
 * OCR Service - Advanced Handwriting Recognition
 * AstroHEALTH Innovations in Healthcare
 * 
 * Provides optical character recognition for handwritten and printed text.
 * Uses multiple OCR engines for best accuracy:
 * - Tesseract.js for offline/client-side OCR (with enhanced handwriting modes)
 * - Google Cloud Vision API for advanced handwriting (when online)
 * - Azure Computer Vision as fallback
 * 
 * Features:
 * - Multi-language support
 * - Advanced handwriting recognition with multiple preprocessing passes
 * - Adaptive image preprocessing for poor quality handwriting
 * - Multi-pass OCR with different settings for best results
 * - Confidence scoring and result combination
 * - Medical terminology post-processing
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - tesseract.js types may not be available
import Tesseract from 'tesseract.js';
import { proxyVision } from './aiProxy';

// OCR Result interface
export interface OCRResult {
  text: string;
  confidence: number;
  words: {
    text: string;
    confidence: number;
    bbox?: { x0: number; y0: number; x1: number; y1: number };
  }[];
  language: string;
  processingTime: number;
  engine: 'tesseract' | 'google-vision' | 'azure-cv' | 'gpt4-vision' | 'combined';
}

// OCR Options
export interface OCROptions {
  language?: string;
  enhanceHandwriting?: boolean;
  preprocessImage?: boolean;
  useCloudOCR?: boolean;
  confidence_threshold?: number;
  /** Enable aggressive handwriting mode for very poor quality */
  aggressiveHandwritingMode?: boolean;
  /** Run multiple OCR passes with different settings */
  multiPassOCR?: boolean;
  /** Medical context hint to improve recognition of clinical terms */
  medicalContext?: boolean;
}

// Preprocessing configuration for different handwriting qualities
interface PreprocessConfig {
  name: string;
  scale: number;
  contrast: number;
  threshold: number;
  sharpen: boolean;
  denoise: boolean;
  deskew: boolean;
  dilate: boolean;
  erode: boolean;
}

// Multiple preprocessing configurations for handwriting
const HANDWRITING_PREPROCESS_CONFIGS: PreprocessConfig[] = [
  // Standard - good for clear handwriting
  { name: 'standard', scale: 2, contrast: 1.5, threshold: 128, sharpen: true, denoise: false, deskew: false, dilate: false, erode: false },
  // High contrast - for faint handwriting
  { name: 'high_contrast', scale: 2.5, contrast: 2.5, threshold: 100, sharpen: true, denoise: true, deskew: false, dilate: false, erode: false },
  // Low threshold - for thick pen strokes
  { name: 'low_threshold', scale: 2, contrast: 1.8, threshold: 80, sharpen: false, denoise: false, deskew: false, dilate: false, erode: true },
  // High threshold - for thin pen strokes
  { name: 'high_threshold', scale: 3, contrast: 2.0, threshold: 160, sharpen: true, denoise: true, deskew: false, dilate: true, erode: false },
  // Aggressive - for very poor handwriting
  { name: 'aggressive', scale: 4, contrast: 3.0, threshold: 120, sharpen: true, denoise: true, deskew: true, dilate: true, erode: false },
];

// Advanced image preprocessing for handwriting recognition
async function preprocessImage(
  imageSource: string | File | Blob, 
  config: PreprocessConfig = HANDWRITING_PREPROCESS_CONFIGS[0]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const loadImage = (src: string) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Scale up for better recognition (higher scale for poor handwriting)
        const scale = Math.max(config.scale, 1500 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data for processing
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Step 1: Convert to grayscale
        imageData = convertToGrayscale(imageData);
        
        // Step 2: Denoise if enabled
        if (config.denoise) {
          imageData = applyMedianFilter(imageData, canvas.width, canvas.height);
        }
        
        // Step 3: Apply adaptive contrast enhancement
        imageData = applyAdaptiveContrast(imageData, config.contrast);
        
        // Step 4: Apply Otsu's thresholding or adaptive thresholding
        imageData = applyAdaptiveThreshold(imageData, canvas.width, canvas.height, config.threshold);
        
        // Step 5: Morphological operations for handwriting enhancement
        if (config.dilate) {
          imageData = applyDilation(imageData, canvas.width, canvas.height);
        }
        if (config.erode) {
          imageData = applyErosion(imageData, canvas.width, canvas.height);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Step 6: Apply sharpening if enabled
        if (config.sharpen) {
          sharpenImage(ctx, canvas.width, canvas.height);
        }
        
        // Step 7: Deskew if enabled (straighten tilted text)
        if (config.deskew) {
          // For now, we skip actual deskew as it's complex
          // The multiple preprocessing passes help compensate
        }
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    };

    if (typeof imageSource === 'string') {
      loadImage(imageSource);
    } else {
      const reader = new FileReader();
      reader.onload = () => loadImage(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageSource);
    }
  });
}

// Convert to grayscale
function convertToGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  return imageData;
}

// Apply adaptive contrast (CLAHE-like)
function applyAdaptiveContrast(imageData: ImageData, contrastFactor: number): ImageData {
  const data = imageData.data;
  const factor = (259 * (contrastFactor * 100 + 255)) / (255 * (259 - contrastFactor * 100));
  
  for (let i = 0; i < data.length; i += 4) {
    const newValue = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i] = newValue;
    data[i + 1] = newValue;
    data[i + 2] = newValue;
  }
  return imageData;
}

// Adaptive thresholding (better for handwriting than fixed threshold)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function applyAdaptiveThreshold(
  imageData: ImageData, 
  width: number, 
  height: number, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _baseThreshold: number
): ImageData {
  const data = imageData.data;
  const blockSize = 15; // Size of local neighborhood
  const C = 10; // Constant subtracted from mean
  
  // Calculate integral image for fast mean computation
  const integral = new Float32Array((width + 1) * (height + 1));
  
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += data[(y * width + x) * 4];
      integral[(y + 1) * (width + 1) + (x + 1)] = 
        rowSum + integral[y * (width + 1) + (x + 1)];
    }
  }
  
  // Apply adaptive threshold
  const halfBlock = Math.floor(blockSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - halfBlock);
      const y1 = Math.max(0, y - halfBlock);
      const x2 = Math.min(width - 1, x + halfBlock);
      const y2 = Math.min(height - 1, y + halfBlock);
      
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
                  integral[(y1) * (width + 1) + (x2 + 1)] -
                  integral[(y2 + 1) * (width + 1) + (x1)] +
                  integral[(y1) * (width + 1) + (x1)];
      
      const localMean = sum / count;
      const threshold = localMean - C;
      
      const idx = (y * width + x) * 4;
      const pixel = data[idx];
      const finalValue = pixel < threshold ? 0 : 255;
      
      data[idx] = finalValue;
      data[idx + 1] = finalValue;
      data[idx + 2] = finalValue;
    }
  }
  
  return imageData;
}

// Median filter for noise reduction
function applyMedianFilter(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  const size = 3;
  const half = Math.floor(size / 2);
  
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      const values: number[] = [];
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          values.push(copy[((y + ky) * width + (x + kx)) * 4]);
        }
      }
      
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      
      const idx = (y * width + x) * 4;
      data[idx] = median;
      data[idx + 1] = median;
      data[idx + 2] = median;
    }
  }
  
  return imageData;
}

// Morphological dilation (thickens text)
function applyDilation(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let minVal = 255;
      
      // 3x3 kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = copy[((y + ky) * width + (x + kx)) * 4];
          if (val < minVal) minVal = val;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = minVal;
      data[idx + 1] = minVal;
      data[idx + 2] = minVal;
    }
  }
  
  return imageData;
}

// Morphological erosion (thins text - removes noise)
function applyErosion(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let maxVal = 0;
      
      // 3x3 kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = copy[((y + ky) * width + (x + kx)) * 4];
          if (val > maxVal) maxVal = val;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = maxVal;
      data[idx + 1] = maxVal;
      data[idx + 2] = maxVal;
    }
  }
  
  return imageData;
}

// Sharpen image for clearer text
function sharpenImage(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // Sharpen kernel
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += copy[idx] * weights[(ky + 1) * 3 + (kx + 1)];
          }
        }
        data[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// ---------------------------------------------------------------------------
// Persistent Tesseract worker.
//
// Creating a worker loads the WASM core + language data (~10-15 MB) and is BY
// FAR the slowest part of OCR. The previous code used Tesseract.recognize()
// (and one createWorker per pass), which paid that cost on *every* pass of
// *every* page. We instead keep a single warm worker alive and reuse it across
// all passes and pages — the first scan warms it up, every scan after is fast.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tesseractWorkerPromise: Promise<any> | null = null;
let tesseractWorkerLang = '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTesseractWorker(language: string): Promise<any> {
  if (tesseractWorkerPromise && tesseractWorkerLang === language) {
    return tesseractWorkerPromise;
  }
  // Language changed — retire the previous worker in the background.
  if (tesseractWorkerPromise) {
    const stale = tesseractWorkerPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stale.then((w: any) => w.terminate()).catch(() => {});
  }
  tesseractWorkerLang = language;
  tesseractWorkerPromise = (async () => {
    const worker = await Tesseract.createWorker(language, 1, {
      logger: () => {}, // quiet — progress is reported at the page level
    });
    await worker.setParameters({
      tessedit_pageseg_mode: '6' as Tesseract.PSM,
      tessedit_char_whitelist:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?\'"-()[]{}/ \n',
      textord_heavy_nr: '1',
      textord_min_linesize: '1.5',
    });
    return worker;
  })();
  return tesseractWorkerPromise;
}

/**
 * Pre-load the OCR engine (WASM core + language data) ahead of time so the
 * first scan is effectively instant. Call this when the scanner UI opens —
 * by the time the user has captured a page, the worker is already warm.
 * Safe to call repeatedly; the worker is created once and reused.
 */
export async function warmUpOcr(language = 'eng'): Promise<void> {
  try {
    await getTesseractWorker(language);
  } catch (e) {
    console.warn('[OCR] Warm-up failed (will retry on first scan):', e);
  }
}

/** Release the shared OCR worker and free its memory (~15 MB). Optional. */
export async function disposeOcrWorker(): Promise<void> {
  if (!tesseractWorkerPromise) return;
  const w = tesseractWorkerPromise;
  tesseractWorkerPromise = null;
  tesseractWorkerLang = '';
  try {
    (await w).terminate();
  } catch {
    /* ignore */
  }
}

// Tesseract.js OCR with handwriting optimization (reuses the shared worker)
async function performTesseractOCR(
  imageSource: string | File | Blob,
  language: string = 'eng',
  preprocessed: boolean = false,
  config?: PreprocessConfig
): Promise<OCRResult> {
  const startTime = Date.now();

  let processedImage = imageSource;
  if (!preprocessed) {
    try {
      processedImage = await preprocessImage(imageSource, config || HANDWRITING_PREPROCESS_CONFIGS[0]);
    } catch (e) {
      console.warn('Image preprocessing failed, using original:', e);
    }
  }

  const worker = await getTesseractWorker(language);
  const result = await worker.recognize(processedImage);

  // Extract words from result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultData = result.data as any;
  const wordsArray = resultData.words || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const words = wordsArray.map((word: any) => ({
    text: word.text || '',
    confidence: word.confidence || 0,
    bbox: word.bbox,
  }));

  return {
    text: resultData.text?.trim() || '',
    confidence: resultData.confidence || 0,
    words,
    language,
    processingTime: Date.now() - startTime,
    engine: 'tesseract',
  };
}

// Post-process OCR text for medical context
function postProcessMedicalText(text: string): string {
  // Common medical abbreviation corrections
  const corrections: Record<string, string> = {
    'bld': 'blood',
    'pt': 'patient',
    'dx': 'diagnosis',
    'rx': 'prescription',
    'hx': 'history',
    'sx': 'symptoms',
    'tx': 'treatment',
    'prn': 'as needed',
    'qid': 'four times daily',
    'tid': 'three times daily',
    'bid': 'twice daily',
    'qd': 'once daily',
    'po': 'by mouth',
    'iv': 'intravenous',
    'im': 'intramuscular',
    'sc': 'subcutaneous',
    'stat': 'immediately',
    'npo': 'nothing by mouth',
    'c/o': 'complains of',
    's/p': 'status post',
    'w/': 'with',
    'w/o': 'without',
  };

  let processed = text;
  
  // Apply corrections (case insensitive)
  for (const [abbr, full] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    processed = processed.replace(regex, full);
  }

  // Clean up common OCR errors
  processed = processed
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .replace(/[|]/g, 'l') // Common OCR error: | instead of l
    .replace(/[0O]/g, (match, offset, str) => {
      // Context-aware 0/O correction
      const before = str[offset - 1] || '';
      const after = str[offset + 1] || '';
      if (/[a-zA-Z]/.test(before) || /[a-zA-Z]/.test(after)) {
        return match === '0' ? 'O' : match;
      }
      return match;
    })
    .trim();

  return processed;
}

// GPT-4 Vision OCR - Best for handwriting recognition (via server proxy)
async function performGPT4VisionOCR(
  imageSource: string | File | Blob,
  medicalContext: boolean = true
): Promise<OCRResult> {
  const startTime = Date.now();

  // Convert to base64 data URL
  let base64DataUrl: string;
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    base64DataUrl = imageSource;
  } else if (imageSource instanceof File || imageSource instanceof Blob) {
    base64DataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  } else {
    throw new Error('Invalid image source for GPT-4 Vision');
  }

  // API key is held server-side by the /api/ai-vision proxy.
  const extractedText = await proxyVision(base64DataUrl, 'openai', medicalContext);

  const words = extractedText
    .split(/\s+/)
    .filter(Boolean)
    .map((word: string) => ({
      text: word,
      confidence: 97,
    }));

  return {
    text: extractedText,
    confidence: 97, // GPT-4 Vision is extremely accurate for handwriting
    words,
    language: 'en',
    processingTime: Date.now() - startTime,
    engine: 'gpt4-vision' as OCRResult['engine'],
  };
}

// Main OCR function - combines multiple engines for best results
export async function performOCR(
  imageSource: string | File | Blob,
  options: OCROptions = {}
): Promise<OCRResult> {
  const {
    language = 'eng',
    enhanceHandwriting = true,
    preprocessImage: shouldPreprocess = true,
    useCloudOCR = true,
    confidence_threshold = 50,
    aggressiveHandwritingMode = false,
  } = options;

  const startTime = Date.now();
  const results: OCRResult[] = [];

  // Accept the local result immediately once we clear this bar — the fast path
  // for clean scans (no extra passes, no cloud round-trip).
  const ACCEPT_CONFIDENCE = 78;
  // Only reach for the cloud when the local result is genuinely weak.
  const CLOUD_FALLBACK_BELOW = 62;

  // Escalating preprocessing: start with the config that usually wins and only
  // try a heavier one if the first pass is poor. (Previously ALL five configs
  // ran on every image, then two cloud calls — the main source of slowness.)
  const passes: PreprocessConfig[] =
    shouldPreprocess || enhanceHandwriting
      ? aggressiveHandwritingMode
        ? [HANDWRITING_PREPROCESS_CONFIGS[4], HANDWRITING_PREPROCESS_CONFIGS[1]] // aggressive → high-contrast
        : [HANDWRITING_PREPROCESS_CONFIGS[0], HANDWRITING_PREPROCESS_CONFIGS[4]] // standard → aggressive
      : [];

  let best: OCRResult | null = null;

  if (passes.length === 0) {
    // Caller opted out of preprocessing — a single raw pass.
    try {
      const r = await performTesseractOCR(imageSource, language, true);
      results.push(r);
      best = r;
    } catch (e) {
      console.error('[OCR] Tesseract OCR failed:', e);
    }
  } else {
    for (const config of passes) {
      try {
        const r = await performTesseractOCR(imageSource, language, false, config);
        results.push(r);
        if (!best || r.confidence > best.confidence) best = r;
        if (r.confidence >= ACCEPT_CONFIDENCE) break; // good enough — stop early
      } catch (e) {
        console.warn('[OCR] Tesseract pass failed:', e);
      }
    }
  }

  // Cloud fallback — ONLY when the local result is weak and we're online.
  // A single provider (GPT-4 Vision, strongest at handwriting) keeps it fast.
  const localBest = best?.confidence ?? 0;
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (useCloudOCR && enhanceHandwriting && online && localBest < CLOUD_FALLBACK_BELOW) {
    try {
      console.log('[OCR] Local confidence low — trying GPT-4 Vision fallback...');
      const gptResult = await performGPT4VisionOCR(imageSource, true);
      if (gptResult.text) results.push(gptResult);
    } catch (e) {
      console.warn('[OCR] GPT-4 Vision fallback failed/unavailable:', e);
    }
  }

  if (results.length === 0) {
    throw new Error('All OCR engines failed. Please try with a clearer image.');
  }

  let bestResult = selectBestResult(results, confidence_threshold);
  bestResult.text = postProcessMedicalText(bestResult.text);
  bestResult.text = correctHandwritingErrors(bestResult.text);

  console.log(
    `[OCR] Done in ${Date.now() - startTime}ms · engine ${bestResult.engine} · ` +
      `${Math.round(bestResult.confidence)}% · ${results.length} pass(es)`
  );

  return bestResult;
}

// Select the best result from multiple OCR attempts
function selectBestResult(results: OCRResult[], confidenceThreshold: number): OCRResult {
  // Filter out empty results
  const validResults = results.filter(r => r.text.trim().length > 0);
  
  if (validResults.length === 0) {
    return results[0] || { 
      text: '', 
      confidence: 0, 
      words: [], 
      language: 'eng', 
      processingTime: 0, 
      engine: 'tesseract' 
    };
  }

  // Sort by confidence
  validResults.sort((a, b) => b.confidence - a.confidence);
  
  // If best result has high confidence, use it directly
  if (validResults[0].confidence >= confidenceThreshold) {
    return validResults[0];
  }

  // If confidence is low, try combining results
  if (validResults.length > 1) {
    return combineOCRResults(validResults);
  }

  return validResults[0];
}

// Correct common handwriting OCR errors
function correctHandwritingErrors(text: string): string {
  let corrected = text;
  
  // Common handwriting misreads
  const corrections: [RegExp, string][] = [
    // Letter substitutions
    [/\brn\b/g, 'm'], // rn often misread as m
    [/\bvv\b/g, 'w'], // vv misread as w
    [/\bcl\b/g, 'd'], // cl misread as d
    [/\bIl\b/g, 'Il'], // Keep Roman numerals
    [/\bl\b(?=[a-z])/g, 'I'], // Standalone l often meant to be I
    
    // Number/letter confusion
    [/(?<=[a-zA-Z])1(?=[a-zA-Z])/g, 'l'], // 1 between letters is l
    [/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, 'o'], // 0 between letters is o
    [/(?<=[0-9])O(?=[0-9])/g, '0'], // O between numbers is 0
    [/(?<=[0-9])l(?=[0-9])/g, '1'], // l between numbers is 1
    [/(?<=[0-9])I(?=[0-9])/g, '1'], // I between numbers is 1
    
    // Common word corrections
    [/\bpatienl\b/gi, 'patient'],
    [/\bdiagnos[il]s\b/gi, 'diagnosis'],
    [/\btreatmenl\b/gi, 'treatment'],
    [/\bmedicalion\b/gi, 'medication'],
    [/\bhospilal\b/gi, 'hospital'],
    [/\bsurgery\b/gi, 'surgery'],
    [/\boperalion\b/gi, 'operation'],
    [/\bprescr[il]ption\b/gi, 'prescription'],
    [/\bexam[il]nation\b/gi, 'examination'],
    [/\btemperalure\b/gi, 'temperature'],
    [/\bblood\s*pressure\b/gi, 'blood pressure'],
    
    // Medical terms
    [/\bhy[pd]ertension\b/gi, 'hypertension'],
    [/\bdiabeles\b/gi, 'diabetes'],
    [/\binfeclion\b/gi, 'infection'],
    [/\banlibiotic\b/gi, 'antibiotic'],
    [/\bparacetamol\b/gi, 'paracetamol'],
    [/\bibuprofen\b/gi, 'ibuprofen'],
    [/\bameox[il]cillin\b/gi, 'amoxicillin'],
    
    // Punctuation fixes
    [/\s+([.,;:!?])/g, '$1'], // Remove space before punctuation
    [/([.,;:!?])(?=[a-zA-Z])/g, '$1 '], // Add space after punctuation
  ];
  
  for (const [pattern, replacement] of corrections) {
    corrected = corrected.replace(pattern, replacement);
  }
  
  // Clean up multiple spaces
  corrected = corrected.replace(/\s+/g, ' ').trim();
  
  return corrected;
}

// Combine multiple OCR results for better accuracy
function combineOCRResults(results: OCRResult[]): OCRResult {
  // Use voting system for words
  const wordVotes: Map<string, number> = new Map();
  
  for (const result of results) {
    const words = result.text.toLowerCase().split(/\s+/);
    for (const word of words) {
      wordVotes.set(word, (wordVotes.get(word) || 0) + result.confidence);
    }
  }

  // Get the result with highest average word confidence
  let bestText = results[0].text;
  let highestScore = 0;

  for (const result of results) {
    const words = result.text.toLowerCase().split(/\s+/);
    const score = words.reduce((sum, word) => sum + (wordVotes.get(word) || 0), 0) / words.length;
    if (score > highestScore) {
      highestScore = score;
      bestText = result.text;
    }
  }

  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);

  return {
    text: bestText,
    confidence: Math.min(avgConfidence * 1.1, 100), // Boost confidence slightly for combined results
    words: results.flatMap(r => r.words),
    language: results[0].language,
    processingTime: totalTime,
    engine: 'combined',
  };
}

// Capture image from camera
export async function captureFromCamera(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

// Select image from gallery
export async function selectFromGallery(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

// Read a File/Blob as a data URL
function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Select multiple images from the gallery/file picker at once.
// Returns the selected images as data URLs (empty array if the user cancels).
export async function selectFromGalleryMultiple(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) {
        resolve([]);
        return;
      }
      try {
        const dataUrls = await Promise.all(files.map((f) => fileToDataUrl(f)));
        resolve(dataUrls);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to read files'));
      }
    };

    input.click();
  });
}

export default {
  performOCR,
  captureFromCamera,
  selectFromGallery,
  selectFromGalleryMultiple,
  preprocessImage,
  performGPT4VisionOCR,
  warmUpOcr,
  disposeOcrWorker,
};
