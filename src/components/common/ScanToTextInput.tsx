/**
 * ScanToTextInput Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * A simple input/textarea with OCR scan capability for forms that
 * don't need full voice dictation features.
 */

import { forwardRef, useId } from 'react';
import { ScanLine } from 'lucide-react';
import ScanToText from './ScanToText';

export interface ScanToTextInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  /** Label for the field */
  label?: string;
  /** Error message */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Use textarea instead of input */
  multiline?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** Callback when text is scanned */
  onScanComplete?: (text: string) => void;
  /** Show the scan button */
  showScan?: boolean;
  /** Input value (controlled) */
  value?: string;
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const ScanToTextInput = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  ScanToTextInputProps
>(({
  label,
  error,
  helpText,
  multiline = false,
  rows = 3,
  onScanComplete,
  showScan = true,
  className = '',
  value,
  onChange,
  ...props
}, ref) => {
  const id = useId();
  
  const handleScanComplete = (scannedText: string) => {
    if (onScanComplete) {
      onScanComplete(scannedText);
    } else if (onChange) {
      // Create a synthetic event
      const currentValue = typeof value === 'string' ? value : '';
      const newValue = currentValue ? `${currentValue}\n${scannedText}` : scannedText;
      
      const event = {
        target: {
          value: newValue,
          name: props.name,
        },
      } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
      
      onChange(event);
    }
  };

  const inputClasses = `
    input w-full
    ${error ? 'border-red-500 focus:ring-red-500' : ''}
    ${showScan ? 'pr-12' : ''}
    ${className}
  `.trim();

  return (
    <div className="scan-to-text-input">
      {label && (
        <label htmlFor={id} className="label flex items-center gap-2">
          {label}
          {props.required && <span className="text-red-500">*</span>}
          {showScan && (
            <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
              <ScanLine size={12} />
              OCR enabled
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {multiline ? (
          <textarea
            id={id}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            value={value}
            onChange={onChange}
            className={inputClasses}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={id}
            ref={ref as React.Ref<HTMLInputElement>}
            value={value}
            onChange={onChange}
            className={inputClasses}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {showScan && (
          <div className="absolute right-2 top-2">
            <ScanToText
              onTextRecognized={handleScanComplete}
              iconOnly
              size="sm"
              disabled={props.disabled}
            />
          </div>
        )}
      </div>

      {helpText && !error && (
        <p className="text-sm text-gray-500 mt-1">{helpText}</p>
      )}

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
});

ScanToTextInput.displayName = 'ScanToTextInput';

export default ScanToTextInput;
