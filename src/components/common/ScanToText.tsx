/**
 * ScanToText Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * A reusable component for OCR/handwriting recognition that can be integrated
 * into any form field across all modules. Supports:
 * - Camera capture
 * - File upload
 * - Image paste from clipboard
 * - Advanced handwriting recognition
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  X,
  Scan,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Loader2,
  Clipboard,
  FileText,
  ScanLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ocrService, { OCRResult, OCROptions } from '../../services/ocrService';

export interface ScanToTextProps {
  /** Callback when text is recognized */
  onTextRecognized: (text: string) => void;
  /** Callback when OCR result with full details is available */
  onResultReceived?: (result: OCRResult) => void;
  /** Label for the button */
  buttonLabel?: string;
  /** Show as icon only */
  iconOnly?: boolean;
  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** OCR language */
  language?: string;
  /** Minimum confidence threshold (0-100) */
  minConfidence?: number;
  /** Show confidence score */
  showConfidence?: boolean;
  /** Allow camera capture */
  allowCamera?: boolean;
  /** Allow file upload */
  allowUpload?: boolean;
  /** Allow clipboard paste */
  allowPaste?: boolean;
  /** Custom button size */
  size?: 'sm' | 'md' | 'lg';
  /** Post-process for medical terms */
  medicalContext?: boolean;
}

export default function ScanToText({
  onTextRecognized,
  onResultReceived,
  buttonLabel = 'Scan Text',
  iconOnly = false,
  className = '',
  disabled = false,
  language = 'eng',
  minConfidence = 30,
  showConfidence = true,
  allowCamera = true,
  allowUpload = true,
  allowPaste = true,
  size = 'md',
  medicalContext = true,
}: ScanToTextProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [showCamera, setShowCamera] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element when stream is available
  useEffect(() => {
    if (stream && videoRef.current && showCamera) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
      });
    }
  }, [stream, showCamera]);

  // Handle paste from clipboard
  useEffect(() => {
    if (!allowPaste || !isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            await handleImageCapture(blob);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen, allowPaste]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      // Set state - useEffect will handle attaching to video element
      setShowCamera(true);
      setStream(mediaStream);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/png');
    
    setCapturedImage(imageData);
    stopCamera();
  };

  const handleImageCapture = async (source: File | Blob | string) => {
    try {
      if (source instanceof File || source instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setCapturedImage(e.target?.result as string);
        };
        reader.readAsDataURL(source);
      } else {
        setCapturedImage(source);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      toast.error('Failed to capture image');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageCapture(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    try {
      const options: OCROptions = {
        language,
        enhanceHandwriting: true,
        preprocessImage: true,
        confidence_threshold: minConfidence,
      };

      const result = await ocrService.performOCR(capturedImage, options);
      
      let processedText = result.text;
      
      // Post-process for medical context if enabled
      if (medicalContext) {
        processedText = postProcessMedicalText(processedText);
      }

      setRecognizedText(processedText);
      setConfidence(result.confidence);

      if (onResultReceived) {
        onResultReceived(result);
      }

      if (result.confidence < minConfidence) {
        toast.error(`Low confidence (${Math.round(result.confidence)}%). Consider retaking the image.`);
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to recognize text. Try a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const postProcessMedicalText = (text: string): string => {
    // Clean up common OCR errors for medical context
    let processed = text;

    // Clean up common OCR errors
    processed = processed
      .replace(/\|/g, 'l') // Pipe often misread as 'l'
      .replace(/0/g, 'o') // Zero often misread as 'o' in words
      .replace(/1(?=[a-zA-Z])/g, 'l') // 1 before letters often should be 'l'
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return processed;
  };

  const acceptText = () => {
    if (recognizedText) {
      onTextRecognized(recognizedText);
      toast.success('Text added to field');
      closeModal();
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setCapturedImage(null);
    setRecognizedText('');
    setConfidence(0);
    setZoom(1);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    setRecognizedText('');
    setConfidence(0);
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-3 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-1.5 rounded-lg
          bg-gradient-to-r from-purple-500 to-indigo-600 
          text-white font-medium shadow-sm
          hover:from-purple-600 hover:to-indigo-700
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${sizeClasses[size]}
          ${className}
        `}
        title="Scan handwritten or printed text"
      >
        <ScanLine size={iconSizes[size]} />
        {!iconOnly && <span>{buttonLabel}</span>}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Scan className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Scan to Text</h2>
                    <p className="text-purple-100 text-xs">Capture handwritten or printed text</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  title="Close scanner"
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Camera View */}
                {showCamera && !capturedImage && (
                  <div className="relative rounded-xl overflow-hidden bg-black mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Camera overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-white/50 rounded-lg w-3/4 h-3/4 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-white/30" />
                      </div>
                    </div>

                    {/* Capture button */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button
                        type="button"
                        onClick={stopCamera}
                        title="Cancel camera"
                        className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      <button
                        type="button"
                        onClick={captureFromCamera}
                        title="Capture image"
                        className="p-4 bg-white text-purple-600 rounded-full hover:bg-purple-50 transition-colors shadow-lg"
                      >
                        <Camera className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Captured Image Preview */}
                {capturedImage && (
                  <div className="mb-4">
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <div 
                        className={`relative overflow-auto max-h-64 origin-top-left transition-transform ${
                          zoom === 1 ? '' : 
                          zoom === 0.5 ? 'scale-50' : 
                          zoom === 0.75 ? 'scale-75' : 
                          zoom === 1.25 ? 'scale-125' : 
                          zoom === 1.5 ? 'scale-150' : 
                          zoom === 1.75 ? 'scale-[1.75]' :
                          zoom === 2 ? 'scale-200' :
                          zoom === 2.25 ? 'scale-[2.25]' :
                          zoom === 2.5 ? 'scale-[2.5]' :
                          zoom === 2.75 ? 'scale-[2.75]' :
                          'scale-[3]'
                        }`}
                      >
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-auto"
                        />
                      </div>

                      {/* Zoom controls */}
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                          title="Zoom out"
                          className="p-2 bg-white/90 rounded-lg shadow hover:bg-white transition-colors"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                          title="Zoom in"
                          className="p-2 bg-white/90 rounded-lg shadow hover:bg-white transition-colors"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={retake}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retake
                      </button>
                      <button
                        type="button"
                        onClick={processImage}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Scan className="w-4 h-4" />
                            Recognize Text
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Capture Options (when no image) */}
                {!capturedImage && !showCamera && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {allowCamera && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
                      >
                        <div className="p-4 bg-purple-100 rounded-full">
                          <Camera className="w-8 h-8 text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-700">Camera</span>
                        <span className="text-xs text-gray-500">Capture from camera</span>
                      </button>
                    )}

                    {allowUpload && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
                      >
                        <div className="p-4 bg-indigo-100 rounded-full">
                          <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <span className="font-medium text-gray-700">Upload</span>
                        <span className="text-xs text-gray-500">Select an image</span>
                      </button>
                    )}

                    {allowPaste && (
                      <button
                        type="button"
                        onClick={() => toast('Press Ctrl+V to paste an image', { icon: '📋' })}
                        className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
                      >
                        <div className="p-4 bg-green-100 rounded-full">
                          <Clipboard className="w-8 h-8 text-green-600" />
                        </div>
                        <span className="font-medium text-gray-700">Paste</span>
                        <span className="text-xs text-gray-500">Ctrl+V to paste</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Recognized Text Result */}
                {recognizedText && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Recognized Text</h3>
                      {showConfidence && (
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          confidence >= 80 ? 'bg-green-100 text-green-700' :
                          confidence >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(confidence)}% confidence
                        </span>
                      )}
                    </div>
                    
                    <textarea
                      value={recognizedText}
                      onChange={(e) => setRecognizedText(e.target.value)}
                      className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Recognized text will appear here..."
                    />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={retake}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Scan Again
                      </button>
                      <button
                        type="button"
                        onClick={acceptText}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                      >
                        <Check className="w-5 h-5" />
                        Accept Text
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  title="Select image file"
                  aria-label="Select image file for OCR"
                />
              </div>

              {/* Tips */}
              {!capturedImage && !showCamera && !recognizedText && (
                <div className="px-6 pb-6">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                    <h4 className="font-medium text-purple-900 mb-2">Tips for best results:</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Ensure good lighting on the document</li>
                      <li>• Hold the camera steady and focus on the text</li>
                      <li>• Use high contrast (dark text on light background)</li>
                      <li>• Avoid shadows and glare</li>
                      <li>• For handwriting, write clearly with consistent spacing</li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
