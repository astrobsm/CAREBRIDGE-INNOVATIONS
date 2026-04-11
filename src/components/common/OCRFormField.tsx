/**
 * OCRFormField Component
 * AstroHEALTH Innovations in Healthcare
 *
 * A form field wrapper that adds OCR handwriting scanning to any text input.
 * Combines a standard input with ScanToText for Google Vision + GPT-4 Vision
 * handwriting recognition. Drop-in replacement for <input> elements.
 *
 * Uses: Google Cloud Vision API, GPT-4 Vision, Tesseract.js (fallback)
 */

import { forwardRef } from 'react';
import ScanToText from './ScanToText';

export interface OCRFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label for the field */
  label?: string;
  /** Error message */
  error?: string;
  /** Callback to set field value (e.g. from react-hook-form setValue) */
  onOCRResult?: (text: string) => void;
  /** Allow camera capture */
  allowCamera?: boolean;
  /** Allow file upload */
  allowUpload?: boolean;
  /** Medical context for better handwriting recognition */
  medicalContext?: boolean;
  /** Use textarea instead of input */
  multiline?: boolean;
  /** Textarea rows */
  rows?: number;
}

const OCRFormField = forwardRef<HTMLInputElement, OCRFormFieldProps>(function OCRFormField(
  {
    label,
    error,
    onOCRResult,
    allowCamera = true,
    allowUpload = true,
    medicalContext = true,
    multiline = false,
    rows = 3,
    className = '',
    ...inputProps
  },
  ref
) {
  const handleOCR = (text: string) => {
    if (onOCRResult) {
      onOCRResult(text);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="label text-sm font-medium text-gray-700 mb-1 block">
          {label}
        </label>
      )}
      <div className="flex items-start gap-1">
        <div className="flex-1">
          {multiline ? (
            <textarea
              ref={ref as any}
              rows={rows}
              className={`input w-full ${error ? 'input-error border-red-300' : ''} ${className}`}
              {...(inputProps as any)}
            />
          ) : (
            <input
              ref={ref}
              className={`input w-full ${error ? 'input-error border-red-300' : ''} ${className}`}
              {...inputProps}
            />
          )}
        </div>
        <ScanToText
          onTextRecognized={handleOCR}
          iconOnly
          size="sm"
          allowCamera={allowCamera}
          allowUpload={allowUpload}
          medicalContext={medicalContext}
          className="mt-0.5"
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
});

export default OCRFormField;
