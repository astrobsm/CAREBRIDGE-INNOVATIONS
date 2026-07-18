/**
 * OCR Scanner Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive OCR scanning component for uploading and extracting
 * text from laboratory reports, imaging reports, and medical documents.
 * Uses Tesseract.js for client-side OCR processing.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Camera,
  Loader2,
  X,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  ScanLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { enhanceMedicalText, type MedicalTextContext } from '../../services/aiTextEnhancementService';

// Tesseract.js types
declare const Tesseract: {
  createWorker: (lang?: string, oem?: number, options?: Record<string, unknown>) => Promise<TesseractWorker>;
  recognize: (image: string | File | Blob, lang?: string, options?: Record<string, unknown>) => Promise<RecognizeResult>;
};

interface TesseractWorker {
  loadLanguage: (lang: string) => Promise<void>;
  initialize: (lang: string) => Promise<void>;
  recognize: (image: string | File | Blob) => Promise<RecognizeResult>;
  terminate: () => Promise<void>;
  setParameters: (params: Record<string, unknown>) => Promise<void>;
}

interface RecognizeResult {
  data: {
    text: string;
    confidence: number;
    blocks: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
    lines: Array<{
      text: string;
      confidence: number;
    }>;
    words: Array<{
      text: string;
      confidence: number;
    }>;
  };
}

interface OCRScannerProps {
  /** Callback when text is extracted */
  onTextExtracted: (text: string) => void;
  /** Optional callback for raw OCR result */
  onRawResult?: (result: RecognizeResult) => void;
  /** Document type for context-aware processing */
  documentType?: 'lab_report' | 'imaging_report' | 'prescription' | 'general';
  /** Medical context for AI enhancement */
  medicalContext?: MedicalTextContext;
  /** Whether to auto-enhance extracted text */
  autoEnhance?: boolean;
  /** Accepted file types */
  acceptedTypes?: string;
  /** Maximum file size in MB */
  maxFileSizeMB?: number;
  /** Custom CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

interface ProcessingProgress {
  status: 'idle' | 'loading' | 'processing' | 'recognizing' | 'enhancing' | 'complete' | 'error';
  progress: number;
  message: string;
}

/** A single file staged in the multi-file batch. */
interface BatchItem {
  id: string;
  file: File;
  preview: string; // data URL
  status: 'pending' | 'processing' | 'done' | 'error';
  text: string;
  confidence: number;
  message?: string;
}

// ============================================================
// ADVANCED IMAGE PREPROCESSING FOR HANDWRITING RECOGNITION
// ============================================================

interface PreprocessingOptions {
  contrast: number;      // 1.0 = normal, >1 = more contrast
  brightness: number;    // 0 = normal, +/- adjustment
  sharpen: boolean;      // Apply sharpening filter
  denoise: boolean;      // Apply noise reduction
  binarize: boolean;     // Convert to black/white
  deskew: boolean;       // Auto-correct rotation
  scale: number;         // Scale factor for small text
  invert: boolean;       // Invert colors (for dark backgrounds)
}

const DEFAULT_PREPROCESSING: PreprocessingOptions = {
  contrast: 1.5,
  brightness: 10,
  sharpen: true,
  denoise: true,
  binarize: true,
  deskew: true,
  scale: 2.0,  // Upscale for better recognition
  invert: false,
};

// Preprocessing profiles for different scenarios
const PREPROCESSING_PROFILES: Record<string, PreprocessingOptions> = {
  handwriting: {
    contrast: 2.0,
    brightness: 15,
    sharpen: true,
    denoise: true,
    binarize: true,
    deskew: true,
    scale: 3.0,  // Higher scale for handwriting
    invert: false,
  },
  faded_document: {
    contrast: 2.5,
    brightness: 30,
    sharpen: true,
    denoise: false,
    binarize: true,
    deskew: true,
    scale: 2.5,
    invert: false,
  },
  low_light: {
    contrast: 2.0,
    brightness: 40,
    sharpen: true,
    denoise: true,
    binarize: true,
    deskew: true,
    scale: 2.0,
    invert: false,
  },
  printed_clean: {
    contrast: 1.3,
    brightness: 5,
    sharpen: false,
    denoise: false,
    binarize: true,
    deskew: true,
    scale: 1.5,
    invert: false,
  },
  dark_background: {
    contrast: 1.8,
    brightness: 0,
    sharpen: true,
    denoise: true,
    binarize: true,
    deskew: true,
    scale: 2.0,
    invert: true,
  },
};

/**
 * Advanced image preprocessing using Canvas API
 * Enhances image quality for better OCR accuracy
 */
const preprocessImage = async (
  imageSource: string | File | Blob,
  options: PreprocessingOptions = DEFAULT_PREPROCESSING
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas with scaled dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Normalize the working resolution: upscale small images for legibility,
        // but cap the longest edge so large phone photos don't blow up the
        // per-pixel preprocessing/OCR time.
        const MAX_DIM = 2400;
        const MIN_TARGET = 1500;
        const longest = Math.max(img.width, img.height);
        let targetLongest = longest * options.scale;
        targetLongest = Math.min(targetLongest, MAX_DIM);
        targetLongest = Math.max(targetLongest, Math.min(longest, MIN_TARGET));
        const scaleFactor = targetLongest / longest;
        const scaledWidth = Math.round(img.width * scaleFactor);
        const scaledHeight = Math.round(img.height * scaleFactor);
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        // Draw scaled image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Get image data for pixel manipulation
        let imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
        const data = imageData.data;

        // 1. Convert to grayscale first
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        // 2. Apply contrast and brightness
        const contrast = options.contrast;
        const brightness = options.brightness;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        
        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            let value = data[i + c];
            value = factor * (value - 128) + 128 + brightness;
            data[i + c] = Math.max(0, Math.min(255, value));
          }
        }

        // 3. Invert if needed (for dark backgrounds)
        if (options.invert) {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
        }

        // 4. Apply denoising (simple median filter approximation)
        if (options.denoise) {
          const tempData = new Uint8ClampedArray(data);
          const w = scaledWidth;
          
          for (let y = 1; y < scaledHeight - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              
              // Get 3x3 neighborhood
              const neighbors: number[] = [];
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nIdx = ((y + dy) * w + (x + dx)) * 4;
                  neighbors.push(tempData[nIdx]);
                }
              }
              
              // Apply median
              neighbors.sort((a, b) => a - b);
              const median = neighbors[4];
              
              // Only apply if difference is significant (noise)
              if (Math.abs(tempData[idx] - median) > 30) {
                data[idx] = median;
                data[idx + 1] = median;
                data[idx + 2] = median;
              }
            }
          }
        }

        // 5. Apply sharpening (unsharp mask)
        if (options.sharpen) {
          const tempData = new Uint8ClampedArray(data);
          const w = scaledWidth;
          const sharpenAmount = 0.5;
          
          for (let y = 1; y < scaledHeight - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              
              // Laplacian kernel for edge detection
              const center = tempData[idx] * 5;
              const top = tempData[((y - 1) * w + x) * 4];
              const bottom = tempData[((y + 1) * w + x) * 4];
              const left = tempData[(y * w + (x - 1)) * 4];
              const right = tempData[(y * w + (x + 1)) * 4];
              
              const laplacian = center - top - bottom - left - right;
              const sharpened = tempData[idx] + laplacian * sharpenAmount;
              
              data[idx] = Math.max(0, Math.min(255, sharpened));
              data[idx + 1] = data[idx];
              data[idx + 2] = data[idx];
            }
          }
        }

        // 6. Apply adaptive binarization (Otsu's method)
        if (options.binarize) {
          // Calculate histogram
          const histogram = new Array(256).fill(0);
          for (let i = 0; i < data.length; i += 4) {
            histogram[Math.round(data[i])]++;
          }
          
          // Otsu's threshold
          const total = scaledWidth * scaledHeight;
          let sum = 0;
          for (let i = 0; i < 256; i++) sum += i * histogram[i];
          
          let sumB = 0;
          let wB = 0;
          let maxVariance = 0;
          let threshold = 128;
          
          for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            
            const wF = total - wB;
            if (wF === 0) break;
            
            sumB += t * histogram[t];
            
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            
            const variance = wB * wF * (mB - mF) * (mB - mF);
            
            if (variance > maxVariance) {
              maxVariance = variance;
              threshold = t;
            }
          }
          
          // Apply threshold
          for (let i = 0; i < data.length; i += 4) {
            const value = data[i] > threshold ? 255 : 0;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
        }

        // Put processed data back
        ctx.putImageData(imageData, 0, 0);

        // Return as high-quality PNG
        resolve(canvas.toDataURL('image/png', 1.0));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));

    // Load image from source
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(imageSource);
    }
  });
};

/**
 * Detect optimal preprocessing profile based on image analysis
 */
const detectOptimalProfile = async (imageSource: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('handwriting');
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // Calculate average brightness and variance
      let totalBrightness = 0;
      let brightValues: number[] = [];

      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        brightValues.push(brightness);
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      
      // Calculate variance
      let variance = 0;
      for (const b of brightValues) {
        variance += (b - avgBrightness) ** 2;
      }
      variance /= brightValues.length;

      // Determine profile based on analysis
      if (avgBrightness < 80) {
        resolve('dark_background');
      } else if (avgBrightness < 150 && variance < 2000) {
        resolve('faded_document');
      } else if (avgBrightness < 120) {
        resolve('low_light');
      } else if (variance > 5000) {
        resolve('printed_clean');
      } else {
        resolve('handwriting');
      }
    };
    img.onerror = () => resolve('handwriting');
    img.src = imageSource;
  });
};

// Load Tesseract.js dynamically
const loadTesseract = async (): Promise<typeof Tesseract> => {
  // Check if already loaded
  if ((window as any).Tesseract) {
    return (window as any).Tesseract;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).Tesseract) {
        resolve((window as any).Tesseract);
      } else {
        reject(new Error('Tesseract failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
    document.head.appendChild(script);
  });
};

export function OCRScanner({
  onTextExtracted,
  onRawResult,
  documentType = 'general',
  medicalContext = 'general',
  autoEnhance = true,
  acceptedTypes = 'image/jpeg,image/png,image/webp,image/bmp,application/pdf',
  maxFileSizeMB = 10,
  className = '',
  disabled = false,
}: OCRScannerProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processing, setProcessing] = useState<ProcessingProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);
  // Persistent OCR worker for this scanner instance: created once (pre-warmed
  // when the scanner opens) and reused across every batch, then terminated on
  // close. Creating a worker (WASM + language data) is the slow part.
  const workerRef = useRef<Promise<TesseractWorker> | null>(null);

  const getWorker = useCallback((): Promise<TesseractWorker> => {
    if (!workerRef.current) {
      const p = (async () => {
        const Tesseract = await loadTesseract();
        const worker = await Tesseract.createWorker('eng', 1);
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: '',
          preserve_interword_spaces: '1',
          textord_heavy_nr: '1',
          textord_min_linesize: '2.5',
          edges_max_children_per_outline: '40',
          textord_force_make_prop_words: '1',
        });
        return worker;
      })();
      // If init fails, clear the ref so the next attempt retries cleanly.
      p.catch(() => {
        if (workerRef.current === p) workerRef.current = null;
      });
      workerRef.current = p;
    }
    return workerRef.current;
  }, []);

  // Pre-warm the OCR engine as soon as the scanner opens so the first scan is
  // ready immediately; release it when the scanner closes.
  useEffect(() => {
    getWorker().catch(() => {}); // best-effort; real errors surface on scan
    return () => {
      const p = workerRef.current;
      workerRef.current = null;
      if (p) p.then((w) => w.terminate()).catch(() => {});
    };
  }, [getWorker]);

  // Validate then stage one or more files into the batch
  const addFiles = useCallback(async (files: File[]) => {
    const validTypes = acceptedTypes.split(',');
    const staged: BatchItem[] = [];

    for (const file of files) {
      if (!validTypes.some(type => file.type.match(type.replace('*', '.*')))) {
        toast.error(`${file.name}: invalid file type.`);
        continue;
      }
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        toast.error(`${file.name}: too large (max ${maxFileSizeMB}MB).`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        // PDF conversion is not supported in the batch flow yet.
        toast.error(`${file.name}: only image files are supported.`);
        continue;
      }

      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      }).catch(() => '');

      if (!preview) {
        toast.error(`${file.name}: could not be read.`);
        continue;
      }

      idCounter.current += 1;
      staged.push({
        id: `ocr-${idCounter.current}`,
        file,
        preview,
        status: 'pending',
        text: '',
        confidence: 0,
      });
    }

    if (staged.length) setItems(prev => [...prev, ...staged]);
  }, [acceptedTypes, maxFileSizeMB]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  // Handle drag and drop (supports multiple files)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) addFiles(files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Run the adaptive OCR pipeline on a single image using a SHARED worker.
  // Starts with the best-guess preprocessing profile and only escalates to
  // heavier passes if confidence is poor — so clean scans finish in one pass.
  const runOcr = async (
    imageDataUrl: string,
    worker: TesseractWorker,
    onProgress: (progress: number, message: string) => void
  ): Promise<{ text: string; confidence: number; raw: RecognizeResult }> => {
    onProgress(15, 'Detecting optimal settings...');
    const detectedProfile = await detectOptimalProfile(imageDataUrl);

    // Escalation order: detected profile first, then heavier configs — de-duped.
    const profileOrder = [detectedProfile, 'handwriting', 'faded_document'].filter(
      (p, i, a) => a.indexOf(p) === i
    );

    let bestResult: RecognizeResult | null = null;
    let bestConfidence = 0;

    for (let i = 0; i < profileOrder.length; i++) {
      onProgress(25 + i * 20, `Pass ${i + 1}: enhancing & reading…`);
      try {
        const profile = PREPROCESSING_PROFILES[profileOrder[i]] || DEFAULT_PREPROCESSING;
        const preprocessedImage = await preprocessImage(imageDataUrl, profile);
        const result = await worker.recognize(preprocessedImage);
        if (result.data.confidence > bestConfidence) {
          bestConfidence = result.data.confidence;
          bestResult = result;
        }
        if (result.data.confidence >= 80) break; // good enough — stop early
      } catch (passError) {
        console.warn(`OCR pass ${i + 1} failed:`, passError);
      }
    }

    // Extreme enhancement only when the result is still poor.
    if (!bestResult || bestConfidence < 45) {
      onProgress(85, 'Applying extreme enhancement...');
      try {
        const extremeProfile: PreprocessingOptions = {
          contrast: 3.0,
          brightness: 50,
          sharpen: true,
          denoise: true,
          binarize: true,
          deskew: true,
          scale: 4.0,
          invert: false,
        };
        const extremePreprocessed = await preprocessImage(imageDataUrl, extremeProfile);
        const extremeResult = await worker.recognize(extremePreprocessed);
        if (extremeResult.data.confidence > bestConfidence) {
          bestConfidence = extremeResult.data.confidence;
          bestResult = extremeResult;
        }
      } catch (err) {
        console.warn('Extreme enhancement pass failed:', err);
      }
    }

    if (!bestResult) throw new Error('All OCR passes failed');

    onProgress(88, 'Post-processing results...');
    let text = bestResult.data.text;
    text = cleanHandwrittenText(text);
    text = postProcessText(text, documentType);
    text = applyMedicalSpellCheck(text);

    if (autoEnhance && text.trim()) {
      onProgress(92, 'AI enhancement...');
      try {
        text = await enhanceMedicalText(text, medicalContext);
      } catch (err) {
        console.warn('Enhancement failed, using cleaned text:', err);
      }
    }

    return { text, confidence: bestConfidence, raw: bestResult };
  };

  // Process every staged image, one after another, then combine the text.
  // A SINGLE Tesseract worker is created for the whole batch and reused across
  // all images/passes — creating a worker (WASM + language data) is the slow
  // part, so we pay it once instead of per pass.
  const processAll = async () => {
    const pending = items.filter((it) => it.status === 'pending' || it.status === 'error');
    if (pending.length === 0) {
      toast.error('No images to process.');
      return;
    }

    setProcessing({ status: 'loading', progress: 5, message: 'Loading advanced OCR engine...' });

    // Seed with any already-extracted images so re-processing keeps prior results.
    const collected: string[] = items
      .filter((it) => it.status === 'done' && it.text.trim())
      .map((it) => it.text);

    let ok = 0;
    let failed = 0;

    // Reuse the worker that was pre-warmed when the scanner opened. If warm-up
    // is still in flight this just awaits it — it is never re-created per batch,
    // and it stays alive (terminated on unmount) so later scans are instant too.
    let worker: TesseractWorker;
    try {
      worker = await getWorker();
    } catch (engineError) {
      console.error('OCR engine failed to start:', engineError);
      setProcessing({ status: 'error', progress: 0, message: 'OCR engine failed to load.' });
      toast.error('Could not start the OCR engine.');
      return;
    }

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const label = `Image ${i + 1}/${pending.length}`;
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'processing', message: undefined } : it))
      );

      try {
        const { text, confidence, raw } = await runOcr(item.preview, worker, (progress, message) => {
          setProcessing({ status: 'recognizing', progress, message: `${label}: ${message}` });
        });
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'done', text, confidence } : it))
        );
        if (text.trim()) collected.push(text);
        if (onRawResult) onRawResult(raw);
        ok += 1;
      } catch (error) {
        console.error('OCR error:', error);
        failed += 1;
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', message: error instanceof Error ? error.message : 'OCR failed' }
              : it
          )
        );
      }
    }

    // Combine text from every successfully-processed image.
    const combined =
      collected.length > 1
        ? collected.map((t, idx) => `--- Image ${idx + 1} ---\n${t}`).join('\n\n')
        : collected.join('\n\n');

    setExtractedText(combined);
    onTextExtracted(combined);

    setProcessing({ status: 'complete', progress: 100, message: 'Extraction complete!' });

    if (failed === 0) {
      toast.success(`✅ Extracted text from ${ok} image${ok === 1 ? '' : 's'}.`);
    } else if (ok === 0) {
      toast.error('Could not extract text from any image. Try clearer photos.');
    } else {
      toast(`${ok} extracted, ${failed} failed. Review below.`, { icon: '⚠️' });
    }
  };

  /**
   * Clean up common handwriting OCR errors
   */
  const cleanHandwrittenText = (text: string): string => {
    let cleaned = text;

    // Remove excessive whitespace while preserving paragraph breaks
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Fix common OCR misreadings in handwriting
    const handwritingCorrections: [RegExp, string][] = [
      [/\bl\b/g, 'I'],           // Lone 'l' is often 'I'
      [/\brn\b/g, 'm'],          // 'rn' often misread for 'm'
      [/\bcl\b/g, 'd'],          // 'cl' often misread for 'd'
      [/\bvv\b/g, 'w'],          // 'vv' often misread for 'w'
      [/\|/g, 'l'],              // Pipe to 'l'
      [/0(?=[a-zA-Z])/g, 'O'],   // Zero before letters
      [/(?<=[a-zA-Z])0/g, 'o'],  // Zero after letters
      [/1(?=[a-zA-Z])/g, 'I'],   // One before letters
      [/(?<=[a-zA-Z])1/g, 'l'],  // One after letters
      [/5(?=[a-zA-Z])/g, 'S'],   // Five before letters
      [/(?<=[a-zA-Z])5/g, 's'],  // Five after letters
      [/8(?=[a-zA-Z])/g, 'B'],   // Eight before letters
      [/\$/g, 'S'],              // Dollar sign to S
      [/@/g, 'a'],               // At sign to a
      [/#/g, 'H'],               // Hash to H
    ];

    for (const [pattern, replacement] of handwritingCorrections) {
      cleaned = cleaned.replace(pattern, replacement);
    }

    // Remove stray single characters that are likely noise
    cleaned = cleaned.replace(/\s[^aAiI\d]\s/g, ' ');
    
    // Fix spacing around punctuation
    cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');
    cleaned = cleaned.replace(/([.,;:!?])(?=[a-zA-Z])/g, '$1 ');

    return cleaned.trim();
  };

  /**
   * Apply medical terminology spell checking
   */
  const applyMedicalSpellCheck = (text: string): string => {
    let corrected = text;

    // Common medical term corrections
    const medicalCorrections: [RegExp, string][] = [
      // Medications
      [/\bmetforrn[il]n\b/gi, 'metformin'],
      [/\bamlodip[il]ne\b/gi, 'amlodipine'],
      [/\bomeprazo[il]e\b/gi, 'omeprazole'],
      [/\batorvastat[il]n\b/gi, 'atorvastatin'],
      [/\bl[il]sinopri[il]\b/gi, 'lisinopril'],
      [/\bparacetarno[il]\b/gi, 'paracetamol'],
      [/\bibuprofe[nm]\b/gi, 'ibuprofen'],
      [/\bamoxic[il][il]in\b/gi, 'amoxicillin'],
      [/\bciprofloxac[il]n\b/gi, 'ciprofloxacin'],
      [/\bpredniso[il]one\b/gi, 'prednisolone'],
      
      // Conditions
      [/\bhypertens[il]on\b/gi, 'hypertension'],
      [/\bdiabete[sz]\b/gi, 'diabetes'],
      [/\bpneurno[nm]ia\b/gi, 'pneumonia'],
      [/\bappendic[il]tis\b/gi, 'appendicitis'],
      [/\bchole[sc]ystitis\b/gi, 'cholecystitis'],
      [/\bcholelit[hn]iasis\b/gi, 'cholelithiasis'],
      [/\bherr[nm]ia\b/gi, 'hernia'],
      [/\bfractur[ae]\b/gi, 'fracture'],
      [/\binfect[il]on\b/gi, 'infection'],
      [/\binf[il]arnrnation\b/gi, 'inflammation'],
      
      // Anatomy
      [/\babdorne[nm]\b/gi, 'abdomen'],
      [/\bthorac[il]c\b/gi, 'thoracic'],
      [/\blurnbar\b/gi, 'lumbar'],
      [/\bcervica[il]\b/gi, 'cervical'],
      [/\bfernur\b/gi, 'femur'],
      [/\btibi[ae]\b/gi, 'tibia'],
      [/\bhurnerus\b/gi, 'humerus'],
      [/\bradiua\b/gi, 'radius'],
      [/\bu[il]na\b/gi, 'ulna'],
      
      // Procedures
      [/\blaporoscop[iy]\b/gi, 'laparoscopy'],
      [/\bendoscop[iy]\b/gi, 'endoscopy'],
      [/\bcolonoscop[iy]\b/gi, 'colonoscopy'],
      [/\bappendecto[nm]y\b/gi, 'appendectomy'],
      [/\bcholecystecto[nm]y\b/gi, 'cholecystectomy'],
      [/\bhern[il]orraphy\b/gi, 'herniorrhaphy'],
      [/\bdebridernent\b/gi, 'debridement'],
      [/\bskin gra[tf]t\b/gi, 'skin graft'],
      
      // Lab terms
      [/\bhaernog[il]obin\b/gi, 'haemoglobin'],
      [/\bhemog[il]obin\b/gi, 'hemoglobin'],
      [/\bcreatinin[ae]\b/gi, 'creatinine'],
      [/\bbilirub[il]n\b/gi, 'bilirubin'],
      [/\balburn[il]n\b/gi, 'albumin'],
      [/\bg[il]ucose\b/gi, 'glucose'],
      [/\belectro[il]ytes\b/gi, 'electrolytes'],
      
      // Common abbreviations that might be misread
      [/\bptn\b/gi, 'patient'],
      [/\bpts\b/gi, 'patients'],
      [/\bhx\b/gi, 'history'],
      [/\bdx\b/gi, 'diagnosis'],
      [/\btx\b/gi, 'treatment'],
      [/\brx\b/gi, 'prescription'],
      [/\bsx\b/gi, 'symptoms'],
    ];

    for (const [pattern, replacement] of medicalCorrections) {
      corrected = corrected.replace(pattern, replacement);
    }

    return corrected;
  };

  // Post-process text based on document type
  const postProcessText = (text: string, type: string): string => {
    let processed = text;

    // Common OCR error corrections
    processed = processed
      .replace(/\|/g, 'l')  // Pipe to lowercase L
      .replace(/0(?=[a-zA-Z])/g, 'O')  // Zero before letters to O
      .replace(/1(?=[a-zA-Z])/g, 'I')  // One before letters to I
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space between camelCase
      .trim();

    // Document-specific processing
    switch (type) {
      case 'lab_report':
        // Extract lab values patterns
        processed = processed.replace(
          /(\d+\.?\d*)\s*(mg\/d[l1]|g\/d[l1]|mmol\/[l1]|umol\/[l1]|U\/[l1]|mIU\/[l1]|ng\/m[l1]|%)/gi,
          '$1 $2'
        );
        break;
      case 'imaging_report':
        // Format imaging report sections
        processed = processed.replace(
          /(FINDINGS|IMPRESSION|TECHNIQUE|CLINICAL|INDICATION)/gi,
          '\n\n$1:'
        );
        break;
      case 'prescription':
        // Format prescription patterns
        processed = processed.replace(
          /(\d+)\s*(mg|g|mcg|mL|IU)\s+(once|twice|bd|tds|qds|daily|prn)/gi,
          '$1$2 $3'
        );
        break;
    }

    return processed;
  };

  // Copy extracted text
  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  }, [extractedText]);

  // Clear everything
  const clearAll = useCallback(() => {
    setItems([]);
    setExtractedText('');
    setProcessing({ status: 'idle', progress: 0, message: '' });
  }, []);

  // Use extracted text
  const useText = useCallback(() => {
    onTextExtracted(extractedText);
    toast.success('Text applied');
  }, [extractedText, onTextExtracted]);

  const isProcessing = ['loading', 'processing', 'recognizing', 'enhancing'].includes(processing.status);
  const pendingCount = items.filter((it) => it.status === 'pending' || it.status === 'error').length;

  const statusBadge = (item: BatchItem) => {
    switch (item.status) {
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
            <Loader2 size={12} className="animate-spin" /> Reading…
          </span>
        );
      case 'done':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              item.confidence >= 80
                ? 'bg-green-100 text-green-700'
                : item.confidence >= 50
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {Math.round(item.confidence)}%
          </span>
        );
      case 'error':
        return <span className="text-xs text-red-600">Failed</span>;
      default:
        return <span className="text-xs text-gray-400">Pending</span>;
    }
  };

  return (
    <div className={`ocr-scanner space-y-4 ${className}`}>
      {/* Upload / staging area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
        }`}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-gray-100 rounded-full">
            <ScanLine size={28} className="text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-700">Add one or more report pages</p>
            <p className="text-sm text-gray-500 mt-1">
              Drag &amp; drop or select multiple images, then process them all at once
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: JPG, PNG, WebP, BMP (Max {maxFileSizeMB}MB each)
            </p>
          </div>

          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Upload size={18} />
              Browse Files
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <Camera size={18} />
              Take Photo
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) addFiles(files);
            e.target.value = '';
          }}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) addFiles(files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Staged file list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              {items.length} image{items.length === 1 ? '' : 's'} staged
            </h4>
            <button
              type="button"
              onClick={clearAll}
              disabled={isProcessing}
              className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
              >
                <img
                  src={item.preview}
                  alt={`Page ${i + 1}`}
                  className="h-14 w-12 flex-shrink-0 rounded border border-gray-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{item.file.name}</p>
                  <div className="mt-1">{statusBadge(item)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={isProcessing}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Processing progress */}
          {isProcessing && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{processing.message}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${processing.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={processAll}
            disabled={isProcessing || disabled || pendingCount === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <ScanLine size={18} />
                Scan &amp; extract {pendingCount > 0 ? `(${pendingCount})` : 'all'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Combined extracted text */}
      {extractedText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-green-600" />
              <span className="font-medium text-green-700">Extracted text</span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={copyText}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                title="Copy"
              >
                <Copy size={16} />
              </button>
              <button
                type="button"
                onClick={useText}
                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                <Check size={14} />
                Use Text
              </button>
            </div>
          </div>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            className="w-full h-48 bg-white rounded border p-3 text-sm font-mono text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </motion.div>
      )}

      {/* Error state */}
      {processing.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <div>
            <p className="font-medium text-red-700">OCR Failed</p>
            <p className="text-sm text-red-600">{processing.message}</p>
          </div>
          <button
            type="button"
            onClick={processAll}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default OCRScanner;
