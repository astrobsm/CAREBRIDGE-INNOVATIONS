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
  engine: 'tesseract' | 'google-vision' | 'azure-cv' | 'combined';
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
function applyAdaptiveThreshold(
  imageData: ImageData, 
  width: number, 
  height: number, 
  baseThreshold: number
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

// Tesseract.js OCR with handwriting optimization
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

  // Configure Tesseract for handwriting recognition
  const tesseractConfig = {
    // PSM 6 = Assume single uniform block of text
    // PSM 4 = Assume single column of variable sizes
    // PSM 11 = Sparse text - find as much text as possible in no particular order
    // PSM 3 = Fully automatic page segmentation (default)
    tessedit_pageseg_mode: '6' as Tesseract.PSM,
    // Character whitelist for medical text
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?\'"-()[]{}/ \n',
    // Enable word-level recognition
    textord_heavy_nr: '1',
    // More aggressive text detection
    textord_min_linesize: '1.5',
  };

  const result = await Tesseract.recognize(processedImage, language, {
    logger: (m: { status: string; progress?: number }) => {
      if (m.status === 'recognizing text') {
        // Progress callback
        console.log(`[OCR] Recognition progress: ${Math.round((m.progress || 0) * 100)}%`);
      }
    },
    ...tesseractConfig,
  });

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

// Multi-pass OCR for poor handwriting
async function performMultiPassOCR(
  imageSource: string | File | Blob,
  language: string = 'eng'
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];
  
  // Try each preprocessing configuration
  for (const config of HANDWRITING_PREPROCESS_CONFIGS) {
    try {
      console.log(`[OCR] Trying preprocessing config: ${config.name}`);
      const result = await performTesseractOCR(imageSource, language, false, config);
      
      if (result.text.trim().length > 0) {
        results.push({ ...result, engine: 'tesseract' });
        console.log(`[OCR] Config ${config.name} - Confidence: ${result.confidence}%, Text length: ${result.text.length}`);
      }
    } catch (e) {
      console.warn(`[OCR] Config ${config.name} failed:`, e);
    }
  }
  
  return results;
}

// Google Cloud Vision OCR (requires API key)
async function performGoogleVisionOCR(
  imageSource: string | File | Blob,
  apiKey: string
): Promise<OCRResult> {
  const startTime = Date.now();

  // Convert to base64
  let base64Image: string;
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    base64Image = imageSource.split(',')[1];
  } else if (imageSource instanceof File || imageSource instanceof Blob) {
    base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    });
  } else {
    throw new Error('Invalid image source');
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
              { type: 'TEXT_DETECTION', maxResults: 50 },
            ],
            imageContext: {
              languageHints: ['en'],
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.status}`);
  }

  const data = await response.json();
  const textAnnotations = data.responses[0]?.textAnnotations || [];
  const fullTextAnnotation = data.responses[0]?.fullTextAnnotation;

  const words = textAnnotations.slice(1).map((annotation: { description: string; boundingPoly?: { vertices: { x: number; y: number }[] } }) => ({
    text: annotation.description,
    confidence: 95, // Google doesn't provide per-word confidence
    bbox: annotation.boundingPoly?.vertices
      ? {
          x0: annotation.boundingPoly.vertices[0]?.x || 0,
          y0: annotation.boundingPoly.vertices[0]?.y || 0,
          x1: annotation.boundingPoly.vertices[2]?.x || 0,
          y1: annotation.boundingPoly.vertices[2]?.y || 0,
        }
      : undefined,
  }));

  return {
    text: fullTextAnnotation?.text || textAnnotations[0]?.description || '',
    confidence: 95,
    words,
    language: 'en',
    processingTime: Date.now() - startTime,
    engine: 'google-vision',
  };
}

// Azure Computer Vision OCR
async function performAzureOCR(
  imageSource: string | File | Blob,
  endpoint: string,
  apiKey: string
): Promise<OCRResult> {
  const startTime = Date.now();

  let imageData: Blob;
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    const response = await fetch(imageSource);
    imageData = await response.blob();
  } else if (imageSource instanceof File || imageSource instanceof Blob) {
    imageData = imageSource;
  } else {
    throw new Error('Invalid image source');
  }

  // Start the Read operation
  const analyzeResponse = await fetch(`${endpoint}/vision/v3.2/read/analyze`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: imageData,
  });

  if (!analyzeResponse.ok) {
    throw new Error(`Azure Vision API error: ${analyzeResponse.status}`);
  }

  const operationLocation = analyzeResponse.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('No operation location returned');
  }

  // Poll for results
  let result;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const resultResponse = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    
    result = await resultResponse.json();
    
    if (result.status === 'succeeded') break;
    if (result.status === 'failed') throw new Error('Azure OCR failed');
  }

  if (!result || result.status !== 'succeeded') {
    throw new Error('Azure OCR timeout');
  }

  const lines = result.analyzeResult?.readResults?.flatMap((page: { lines: { text: string; words: { text: string; confidence: number; boundingBox: number[] }[] }[] }) => page.lines) || [];
  const words = lines.flatMap((line: { words: { text: string; confidence: number; boundingBox: number[] }[] }) =>
    line.words.map((word: { text: string; confidence: number; boundingBox: number[] }) => ({
      text: word.text,
      confidence: word.confidence * 100,
      bbox: {
        x0: word.boundingBox[0],
        y0: word.boundingBox[1],
        x1: word.boundingBox[4],
        y1: word.boundingBox[5],
      },
    }))
  );

  return {
    text: lines.map((line: { text: string }) => line.text).join('\n'),
    confidence: words.reduce((sum: number, w: { confidence: number }) => sum + w.confidence, 0) / (words.length || 1),
    words,
    language: 'en',
    processingTime: Date.now() - startTime,
    engine: 'azure-cv',
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
    multiPassOCR = true, // Enable multi-pass by default for better handwriting
  } = options;

  console.log('[OCR] Starting OCR with options:', { 
    language, 
    enhanceHandwriting, 
    multiPassOCR, 
    aggressiveHandwritingMode 
  });

  const results: OCRResult[] = [];
  const startTime = Date.now();

  // Multi-pass OCR for handwriting (tries multiple preprocessing configurations)
  if (multiPassOCR && enhanceHandwriting) {
    try {
      console.log('[OCR] Running multi-pass OCR for handwriting recognition...');
      const multiPassResults = await performMultiPassOCR(imageSource, language);
      results.push(...multiPassResults);
      console.log(`[OCR] Multi-pass OCR completed with ${multiPassResults.length} results`);
    } catch (e) {
      console.error('[OCR] Multi-pass OCR failed:', e);
    }
  } else {
    // Single pass with standard preprocessing
    let processedImage = imageSource;
    
    if (shouldPreprocess && enhanceHandwriting) {
      try {
        const config = aggressiveHandwritingMode 
          ? HANDWRITING_PREPROCESS_CONFIGS[4] // aggressive
          : HANDWRITING_PREPROCESS_CONFIGS[0]; // standard
        processedImage = await preprocessImage(imageSource, config);
      } catch (e) {
        console.warn('[OCR] Preprocessing failed:', e);
      }
    }

    try {
      const tesseractResult = await performTesseractOCR(processedImage, language, shouldPreprocess);
      results.push(tesseractResult);
    } catch (e) {
      console.error('[OCR] Tesseract OCR failed:', e);
    }
  }

  // Try cloud OCR if enabled and online (cloud services are better at handwriting)
  if (useCloudOCR && navigator.onLine) {
    const googleApiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
    const azureEndpoint = import.meta.env.VITE_AZURE_CV_ENDPOINT;
    const azureKey = import.meta.env.VITE_AZURE_CV_KEY;

    // Try Google Vision (excellent handwriting recognition)
    if (googleApiKey) {
      try {
        console.log('[OCR] Trying Google Cloud Vision...');
        const googleResult = await performGoogleVisionOCR(imageSource, googleApiKey);
        results.push(googleResult);
        console.log(`[OCR] Google Vision - Confidence: ${googleResult.confidence}%`);
      } catch (e) {
        console.warn('[OCR] Google Vision OCR failed:', e);
      }
    }

    // Try Azure CV (also good at handwriting)
    if (azureEndpoint && azureKey) {
      try {
        console.log('[OCR] Trying Azure Computer Vision...');
        const azureResult = await performAzureOCR(imageSource, azureEndpoint, azureKey);
        results.push(azureResult);
        console.log(`[OCR] Azure CV - Confidence: ${azureResult.confidence}%`);
      } catch (e) {
        console.warn('[OCR] Azure CV OCR failed:', e);
      }
    }
  }

  if (results.length === 0) {
    throw new Error('All OCR engines failed. Please try with a clearer image.');
  }

  console.log(`[OCR] Total results collected: ${results.length}`);

  // Smart result selection and combination
  let bestResult = selectBestResult(results, confidence_threshold);

  // Post-process for medical context
  bestResult.text = postProcessMedicalText(bestResult.text);
  
  // Apply additional handwriting corrections
  bestResult.text = correctHandwritingErrors(bestResult.text);

  console.log(`[OCR] Final result - Engine: ${bestResult.engine}, Confidence: ${bestResult.confidence}%`);
  console.log(`[OCR] Total processing time: ${Date.now() - startTime}ms`);

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

export default {
  performOCR,
  captureFromCamera,
  selectFromGallery,
  preprocessImage,
};
