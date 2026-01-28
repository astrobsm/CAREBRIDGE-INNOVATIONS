/**
 * ThermalPrintButton Component
 * Reusable button for thermal printing with XP-T80Q settings
 * Font: Georgia, 12pt, 0.8 line spacing, 80mm paper width
 */

import React, { useState } from 'react';
import { Printer, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PrintableDocument,
  PrintSection,
  DEFAULT_THERMAL_CONFIG,
  printThermalDocument,
  downloadThermalHTML,
  printDirectly,
  createReceiptDocument,
  createClinicalDocument,
} from '../../services/thermalPrintService';

interface ThermalPrintButtonProps {
  /** Document to print */
  document?: PrintableDocument;
  /** Function to generate document on demand */
  getDocument?: () => PrintableDocument | Promise<PrintableDocument>;
  /** Button label */
  label?: string;
  /** Show download option instead of print */
  mode?: 'print' | 'download' | 'both';
  /** Filename for download mode */
  filename?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Callback after successful print */
  onPrintSuccess?: () => void;
  /** Callback on print error */
  onPrintError?: (error: Error) => void;
}

export const ThermalPrintButton: React.FC<ThermalPrintButtonProps> = ({
  document,
  getDocument,
  label = 'Print',
  mode = 'print',
  filename = 'document.html',
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
  onPrintSuccess,
  onPrintError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = async () => {
    try {
      setIsLoading(true);

      // Get document
      let doc = document;
      if (getDocument) {
        doc = await getDocument();
      }

      if (!doc) {
        throw new Error('No document provided for printing');
      }

      // Execute print
      printThermalDocument(doc, DEFAULT_THERMAL_CONFIG);
      toast.success('Print dialog opened');
      onPrintSuccess?.();
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print document');
      onPrintError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsLoading(true);

      // Get document
      let doc = document;
      if (getDocument) {
        doc = await getDocument();
      }

      if (!doc) {
        throw new Error('No document provided for download');
      }

      // Execute download
      downloadThermalHTML(doc, filename, DEFAULT_THERMAL_CONFIG);
      toast.success('Document downloaded');
      onPrintSuccess?.();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
      onPrintError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Button styles based on variant and size
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    icon: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 p-2',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const buttonClass = `${baseStyles} ${variantStyles[variant]} ${variant !== 'icon' ? sizeStyles[size] : ''} ${className}`;

  if (mode === 'both') {
    return (
      <div className="inline-flex rounded-lg shadow-sm">
        <button
          type="button"
          onClick={handlePrint}
          disabled={disabled || isLoading}
          className={`${buttonClass} rounded-r-none border-r-0`}
          title="Print"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          {variant !== 'icon' && <span>{label}</span>}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={disabled || isLoading}
          className={`${buttonClass} rounded-l-none`}
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={mode === 'download' ? handleDownload : handlePrint}
      disabled={disabled || isLoading}
      className={buttonClass}
      title={mode === 'download' ? 'Download' : 'Print'}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : mode === 'download' ? (
        <Download className="w-4 h-4" />
      ) : (
        <Printer className="w-4 h-4" />
      )}
      {variant !== 'icon' && <span>{label}</span>}
    </button>
  );
};

/**
 * Quick print helper - prints immediately without button
 */
export const quickPrint = async (
  document: PrintableDocument,
  options?: { silent?: boolean }
): Promise<void> => {
  try {
    if (!options?.silent) {
      toast.loading('Preparing print...', { id: 'quick-print' });
    }
    
    await printDirectly(document, DEFAULT_THERMAL_CONFIG);
    
    if (!options?.silent) {
      toast.success('Print sent', { id: 'quick-print' });
    }
  } catch (error) {
    if (!options?.silent) {
      toast.error('Print failed', { id: 'quick-print' });
    }
    throw error;
  }
};

// Re-export helpers for convenience
export { createReceiptDocument, createClinicalDocument };
export type { PrintableDocument, PrintSection };
