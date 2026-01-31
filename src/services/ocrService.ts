/**
 * OCR Service - Advanced Handwriting Recognition
 * AstroHEALTH Innovations in Healthcare
 * 
 * Provides optical character recognition for handwritten and printed text.
 * Uses multiple OCR engines for best accuracy:
 * - Tesseract.js for offline/client-side OCR
 * - Google Cloud Vision API for advanced handwriting (when online)
 * - Azure Computer Vision as fallback
 * 
 * Features:
 * - Multi-language support
 * - Handwriting recognition
 * - Image preprocessing for better accuracy
 * - Confidence scoring
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
}

// Image preprocessing for better OCR accuracy
async function preprocessImage(imageSource: string | File | Blob): Promise<string> {
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

        // Scale up small images for better recognition
        const scale = Math.max(1, 1500 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Draw and preprocess
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Increase contrast
          const contrast = 1.5;
          const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
          const newGray = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
          
          // Apply threshold for cleaner text (adaptive binarization)
          const threshold = 128;
          const finalValue = newGray > threshold ? 255 : 0;
          
          data[i] = finalValue;
          data[i + 1] = finalValue;
          data[i + 2] = finalValue;
        }

        ctx.putImageData(imageData, 0, 0);
        
        // Apply sharpening filter
        sharpenImage(ctx, canvas.width, canvas.height);
        
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

// Tesseract.js OCR (offline capable)
async function performTesseractOCR(
  imageSource: string | File | Blob,
  language: string = 'eng',
  preprocessed: boolean = false
): Promise<OCRResult> {
  const startTime = Date.now();
  
  let processedImage = imageSource;
  if (!preprocessed && typeof imageSource !== 'string') {
    try {
      processedImage = await preprocessImage(imageSource);
    } catch (e) {
      console.warn('Image preprocessing failed, using original:', e);
    }
  }

  const result = await Tesseract.recognize(processedImage, language, {
    logger: (m: { status: string; progress?: number }) => {
      if (m.status === 'recognizing text') {
        // Progress callback could be used here
      }
    },
  });

  // Extract words from result - handle different Tesseract.js response structures
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
    confidence_threshold = 60,
  } = options;

  let processedImage = imageSource;
  
  // Preprocess for better handwriting recognition
  if (shouldPreprocess && enhanceHandwriting) {
    try {
      processedImage = await preprocessImage(imageSource);
    } catch (e) {
      console.warn('Preprocessing failed:', e);
    }
  }

  const results: OCRResult[] = [];

  // Always try Tesseract (works offline)
  try {
    const tesseractResult = await performTesseractOCR(processedImage, language, shouldPreprocess);
    results.push(tesseractResult);
  } catch (e) {
    console.error('Tesseract OCR failed:', e);
  }

  // Try cloud OCR if enabled and online
  if (useCloudOCR && navigator.onLine) {
    const googleApiKey = import.meta.env.VITE_GOOGLE_VISION_API_KEY;
    const azureEndpoint = import.meta.env.VITE_AZURE_CV_ENDPOINT;
    const azureKey = import.meta.env.VITE_AZURE_CV_KEY;

    // Try Google Vision
    if (googleApiKey) {
      try {
        const googleResult = await performGoogleVisionOCR(imageSource, googleApiKey);
        results.push(googleResult);
      } catch (e) {
        console.warn('Google Vision OCR failed:', e);
      }
    }

    // Try Azure CV
    if (azureEndpoint && azureKey) {
      try {
        const azureResult = await performAzureOCR(imageSource, azureEndpoint, azureKey);
        results.push(azureResult);
      } catch (e) {
        console.warn('Azure CV OCR failed:', e);
      }
    }
  }

  if (results.length === 0) {
    throw new Error('All OCR engines failed');
  }

  // Select best result based on confidence
  let bestResult = results[0];
  for (const result of results) {
    if (result.confidence > bestResult.confidence) {
      bestResult = result;
    }
  }

  // If confidence is low and we have multiple results, try to combine them
  if (bestResult.confidence < confidence_threshold && results.length > 1) {
    bestResult = combineOCRResults(results);
  }

  // Post-process for medical context
  bestResult.text = postProcessMedicalText(bestResult.text);

  return bestResult;
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
    confidence: avgConfidence,
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
