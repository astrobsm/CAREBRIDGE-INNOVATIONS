/**
 * OCR Scanner Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive OCR scanning component for uploading and extracting
 * text from laboratory reports, imaging reports, and medical documents.
 * Uses Tesseract.js for client-side OCR processing.
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  Loader2,
  X,
  Check,
  Copy,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
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

        // Scale up for better recognition
        const scaledWidth = Math.round(img.width * options.scale);
        const scaledHeight = Math.round(img.height * options.scale);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processing, setProcessing] = useState<ProcessingProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<TesseractWorker | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = acceptedTypes.split(',');
    if (!validTypes.some(type => file.type.match(type.replace('*', '.*')))) {
      toast.error('Invalid file type. Please upload an image or PDF.');
      return;
    }

    // Validate file size
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxFileSizeMB}MB.`);
      return;
    }

    setSelectedFile(file);
    setRotation(0);
    setZoom(1);

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setShowPreview(true);
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs, we'll need to convert first (placeholder)
      setImagePreview(null);
      toast('PDF support requires conversion. Processing...');
    }
  }, [acceptedTypes, maxFileSizeMB]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Process image with OCR
  const processImage = useCallback(async () => {
    if (!selectedFile && !imagePreview) {
      toast.error('No image selected');
      return;
    }

    try {
      setProcessing({ status: 'loading', progress: 5, message: 'Loading advanced OCR engine...' });

      // Load Tesseract
      const Tesseract = await loadTesseract();
      
      setProcessing({ status: 'processing', progress: 10, message: 'Analyzing image quality...' });

      // Get the image source
      const imageSource = imagePreview || selectedFile;
      if (!imageSource) throw new Error('No image to process');

      // Convert to data URL if needed
      let imageDataUrl: string;
      if (typeof imageSource === 'string') {
        imageDataUrl = imageSource;
      } else {
        imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageSource);
        });
      }

      // Detect optimal preprocessing profile
      setProcessing({ status: 'processing', progress: 15, message: 'Detecting optimal settings...' });
      const detectedProfile = await detectOptimalProfile(imageDataUrl);
      console.log('Detected preprocessing profile:', detectedProfile);

      // Multi-pass OCR with different preprocessing configurations
      const ocrPasses: Array<{ name: string; profile: string; result?: RecognizeResult }> = [
        { name: 'Handwriting Optimized', profile: 'handwriting' },
        { name: 'Standard Enhancement', profile: detectedProfile },
        { name: 'High Contrast', profile: 'faded_document' },
      ];

      let bestResult: RecognizeResult | null = null;
      let bestConfidence = 0;
      let passResults: Array<{ name: string; confidence: number; text: string }> = [];

      for (let passIndex = 0; passIndex < ocrPasses.length; passIndex++) {
        const pass = ocrPasses[passIndex];
        
        setProcessing({ 
          status: 'processing', 
          progress: 20 + (passIndex * 25), 
          message: `Pass ${passIndex + 1}/3: ${pass.name}...` 
        });

        try {
          // Preprocess image with current profile
          const profile = PREPROCESSING_PROFILES[pass.profile] || DEFAULT_PREPROCESSING;
          const preprocessedImage = await preprocessImage(imageDataUrl, profile);

          // Create worker with optimized settings for handwriting
          const worker = await Tesseract.createWorker('eng', 1, {
            logger: (m: { status: string; progress: number }) => {
              if (m.status === 'recognizing text') {
                const baseProgress = 20 + (passIndex * 25);
                const passProgress = m.progress * 20;
                setProcessing({
                  status: 'recognizing',
                  progress: baseProgress + passProgress,
                  message: `Pass ${passIndex + 1}/3: Recognizing... ${Math.round(m.progress * 100)}%`,
                });
              }
            },
          });

          // Configure Tesseract for best handwriting recognition
          await worker.setParameters({
            tessedit_pageseg_mode: '6',      // Assume uniform block of text
            tessedit_char_whitelist: '',      // Allow all characters
            preserve_interword_spaces: '1',   // Keep word spacing
            textord_heavy_nr: '1',            // Heavy noise removal
            textord_min_linesize: '2.5',      // Minimum line size
            edges_max_children_per_outline: '40', // Better edge detection
            textord_force_make_prop_words: '1',   // Force proportional words
          });

          const result = await worker.recognize(preprocessedImage);
          await worker.terminate();

          passResults.push({
            name: pass.name,
            confidence: result.data.confidence,
            text: result.data.text,
          });

          // Keep best result
          if (result.data.confidence > bestConfidence) {
            bestConfidence = result.data.confidence;
            bestResult = result;
          }

          // If we get very high confidence, we can stop early
          if (result.data.confidence >= 95) {
            console.log(`High confidence (${result.data.confidence}%) achieved on pass ${passIndex + 1}, stopping early`);
            break;
          }
        } catch (passError) {
          console.warn(`OCR pass ${passIndex + 1} failed:`, passError);
        }
      }

      // If all passes failed or very low confidence, try one more time with extreme enhancement
      if (!bestResult || bestConfidence < 50) {
        setProcessing({ status: 'processing', progress: 85, message: 'Applying extreme enhancement...' });
        
        try {
          const extremeProfile: PreprocessingOptions = {
            contrast: 3.0,
            brightness: 50,
            sharpen: true,
            denoise: true,
            binarize: true,
            deskew: true,
            scale: 4.0,  // Maximum upscaling
            invert: false,
          };
          
          const extremePreprocessed = await preprocessImage(imageDataUrl, extremeProfile);
          
          const worker = await Tesseract.createWorker('eng', 1);
          await worker.setParameters({
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
          });
          
          const extremeResult = await worker.recognize(extremePreprocessed);
          await worker.terminate();
          
          if (extremeResult.data.confidence > bestConfidence) {
            bestConfidence = extremeResult.data.confidence;
            bestResult = extremeResult;
          }
        } catch (err) {
          console.warn('Extreme enhancement pass failed:', err);
        }
      }

      if (!bestResult) {
        throw new Error('All OCR passes failed');
      }

      // Log all pass results for debugging
      console.log('OCR Pass Results:', passResults);
      console.log('Best confidence:', bestConfidence);

      setProcessing({ status: 'processing', progress: 88, message: 'Post-processing results...' });

      let text = bestResult.data.text;

      // Apply advanced text cleaning for handwriting
      text = cleanHandwrittenText(text);

      // Apply document-specific post-processing
      text = postProcessText(text, documentType);

      // Apply medical spell checking and correction
      text = applyMedicalSpellCheck(text);

      // Auto-enhance if enabled
      if (autoEnhance && text.trim()) {
        setProcessing({ status: 'enhancing', progress: 92, message: 'AI enhancement...' });
        try {
          text = await enhanceMedicalText(text, medicalContext);
        } catch (err) {
          console.warn('Enhancement failed, using cleaned text:', err);
        }
      }

      setExtractedText(text);
      onTextExtracted(text);
      
      if (onRawResult) {
        onRawResult(bestResult);
      }

      setProcessing({ status: 'complete', progress: 100, message: 'Extraction complete!' });
      
      // Show confidence-based feedback
      if (bestConfidence >= 90) {
        toast.success(`✅ High accuracy extraction! (${Math.round(bestConfidence)}% confidence)`);
      } else if (bestConfidence >= 70) {
        toast.success(`Text extracted (${Math.round(bestConfidence)}% confidence). Review recommended.`);
      } else {
        toast(`Text extracted with ${Math.round(bestConfidence)}% confidence. Manual review needed.`, { icon: '⚠️' });
      }

    } catch (error) {
      console.error('OCR error:', error);
      setProcessing({ 
        status: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'OCR failed' 
      });
      toast.error('Failed to extract text. Try a clearer image.');
    }
  }, [selectedFile, imagePreview, documentType, medicalContext, autoEnhance, onTextExtracted, onRawResult]);

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

  // Rotate image
  const rotateImage = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

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
    setSelectedFile(null);
    setImagePreview(null);
    setExtractedText('');
    setProcessing({ status: 'idle', progress: 0, message: '' });
    setRotation(0);
    setZoom(1);
    setShowPreview(false);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Use extracted text
  const useText = useCallback(() => {
    onTextExtracted(extractedText);
    toast.success('Text applied');
  }, [extractedText, onTextExtracted]);

  const isProcessing = ['loading', 'processing', 'recognizing', 'enhancing'].includes(processing.status);

  return (
    <div className={`ocr-scanner ${className}`}>
      {/* Upload area */}
      {!imagePreview && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            disabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
          }`}
          onDrop={disabled ? undefined : handleDrop}
          onDragOver={disabled ? undefined : handleDragOver}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <ScanLine size={32} className="text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-700">Upload Lab/Imaging Report</p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop or click to select image
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports: JPG, PNG, WebP, BMP (Max {maxFileSizeMB}MB)
              </p>
            </div>

            <div className="flex gap-3 mt-2">
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
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Image preview and controls */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Image viewer */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={rotateImage}
                  className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70"
                  title="Rotate"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center justify-center min-h-[200px] max-h-[400px] overflow-auto p-4">
                <img
                  src={imagePreview}
                  alt="Document preview"
                  className="max-w-full h-auto transition-transform duration-200"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                  }}
                />
              </div>
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

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={processImage}
                disabled={isProcessing || disabled}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ScanLine size={18} />
                    Extract Text
                  </>
                )}
              </button>
            </div>

            {/* Extracted text display */}
            {extractedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Check size={18} className="text-green-600" />
                    <span className="font-medium text-green-700">Text Extracted</span>
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
                <div className="bg-white rounded border p-3 max-h-[200px] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-gray-700">
                    {extractedText}
                  </pre>
                </div>
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
                  onClick={processImage}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OCRScanner;
