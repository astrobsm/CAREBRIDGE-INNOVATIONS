/**
 * Export Options Modal
 * Provides unified export options for all PDF exports in the application:
 * 1. Share on WhatsApp (A4 PDF)
 * 2. Export PDF (A4 format for standard printers)
 * 3. Thermal Print (80mm width, Georgia 12pt font)
 * 
 * XP-T80Q Thermal Printer Specifications:
 * - Paper Width: 80mm
 * - Font: Georgia (Times in jsPDF as closest match)
 * - Font Size: 12pt bold
 */

import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  FileText, 
  Printer, 
  Share2,
  Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { sharePDFOnWhatsApp } from '../../utils/whatsappShareUtils';

export interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Function to generate A4 PDF - returns jsPDF instance or Blob */
  generateA4PDF: () => Promise<jsPDF | Blob> | jsPDF | Blob;
  /** Optional function to generate thermal PDF - if not provided, A4 will be used */
  generateThermalPDF?: () => Promise<jsPDF | Blob> | jsPDF | Blob;
  /** File name prefix (without extension) */
  fileNamePrefix: string;
  /** Optional phone number for WhatsApp */
  phoneNumber?: string;
}

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  isOpen,
  onClose,
  title,
  generateA4PDF,
  generateThermalPDF,
  fileNamePrefix,
  phoneNumber
}) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  if (!isOpen) return null;

  const getFileName = (suffix: string = '') => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    return `${fileNamePrefix}${suffix}_${timestamp}.pdf`;
  };

  const getPDFBlob = async (generateFn: () => Promise<jsPDF | Blob> | jsPDF | Blob): Promise<Blob> => {
    const result = await generateFn();
    if (result instanceof Blob) {
      return result;
    }
    // It's a jsPDF instance
    return result.output('blob');
  };

  const handleExportA4PDF = async () => {
    setIsExporting('a4');
    try {
      const result = await generateA4PDF();
      const fileName = getFileName('_A4');
      
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        result.save(fileName);
      }
      
      toast.success('A4 PDF exported successfully!');
      onClose();
    } catch (error) {
      console.error('Error exporting A4 PDF:', error);
      toast.error('Failed to export A4 PDF');
    } finally {
      setIsExporting(null);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsExporting('whatsapp');
    try {
      const pdfBlob = await getPDFBlob(generateA4PDF);
      const fileName = getFileName('_A4');
      await sharePDFOnWhatsApp(pdfBlob, fileName, phoneNumber);
      onClose();
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp');
    } finally {
      setIsExporting(null);
    }
  };

  const handleThermalPrint = async () => {
    setIsExporting('thermal');
    try {
      const generateFn = generateThermalPDF || generateA4PDF;
      const result = await generateFn();
      const fileName = getFileName('_thermal_80mm');
      
      if (result instanceof Blob) {
        const url = URL.createObjectURL(result);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        result.save(fileName);
      }
      
      toast.success('Thermal print PDF (80mm) exported!');
      onClose();
    } catch (error) {
      console.error('Error exporting thermal PDF:', error);
      toast.error('Failed to export thermal PDF');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={!!isExporting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Share on WhatsApp (A4) */}
          <button
            onClick={handleShareWhatsApp}
            disabled={!!isExporting}
            className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-xl border-2 border-green-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="p-3 bg-green-500 rounded-full">
              {isExporting === 'whatsapp' ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <MessageCircle className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-green-800">Share on WhatsApp</div>
              <div className="text-sm text-green-600">A4 PDF format</div>
            </div>
          </button>

          {/* Export A4 PDF */}
          <button
            onClick={handleExportA4PDF}
            disabled={!!isExporting}
            className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="p-3 bg-blue-500 rounded-full">
              {isExporting === 'a4' ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <FileText className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-blue-800">Export PDF</div>
              <div className="text-sm text-blue-600">A4 format for standard printers</div>
            </div>
          </button>

          {/* Thermal Print (80mm) */}
          <button
            onClick={handleThermalPrint}
            disabled={!!isExporting}
            className="w-full flex items-center gap-4 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl border-2 border-orange-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="p-3 bg-orange-500 rounded-full">
              {isExporting === 'thermal' ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Printer className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-orange-800">Thermal Print</div>
              <div className="text-sm text-orange-600">80mm width, Georgia 12pt</div>
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Choose an export format for your document
        </p>
      </div>
    </div>
  );
};

/**
 * Quick Export Buttons Component
 * Displays three small buttons for quick export actions
 */
export interface QuickExportButtonsProps {
  onShareWhatsApp: () => void;
  onExportA4PDF: () => void;
  onThermalPrint: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const QuickExportButtons: React.FC<QuickExportButtonsProps> = ({
  onShareWhatsApp,
  onExportA4PDF,
  onThermalPrint,
  disabled = false,
  size = 'sm'
}) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const padding = size === 'sm' ? 'px-2 py-2' : 'px-3 py-3';
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex gap-2">
      <button
        onClick={onShareWhatsApp}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1 ${padding} bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Share on WhatsApp (A4)"
      >
        <MessageCircle className={iconSize} />
        <span className={`${fontSize} font-medium`}>WhatsApp</span>
      </button>
      <button
        onClick={onExportA4PDF}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1 ${padding} bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Export A4 PDF"
      >
        <FileText className={iconSize} />
        <span className={`${fontSize} font-medium`}>A4 PDF</span>
      </button>
      <button
        onClick={onThermalPrint}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1 ${padding} bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        title="Thermal Print (80mm)"
      >
        <Printer className={iconSize} />
        <span className={`${fontSize} font-medium`}>Thermal</span>
      </button>
    </div>
  );
};

/**
 * Export Button with Modal
 * A single button that opens the export options modal
 */
export interface ExportButtonWithModalProps {
  generateA4PDF: () => Promise<jsPDF | Blob> | jsPDF | Blob;
  generateThermalPDF?: () => Promise<jsPDF | Blob> | jsPDF | Blob;
  fileNamePrefix: string;
  phoneNumber?: string;
  buttonText?: string;
  buttonClassName?: string;
  disabled?: boolean;
  modalTitle?: string;
}

export const ExportButtonWithModal: React.FC<ExportButtonWithModalProps> = ({
  generateA4PDF,
  generateThermalPDF,
  fileNamePrefix,
  phoneNumber,
  buttonText = 'Export / Print',
  buttonClassName = 'flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium',
  disabled = false,
  modalTitle = 'Export / Print Options'
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className={`${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Share2 className="w-5 h-5" />
        {buttonText}
      </button>

      <ExportOptionsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        generateA4PDF={generateA4PDF}
        generateThermalPDF={generateThermalPDF}
        fileNamePrefix={fileNamePrefix}
        phoneNumber={phoneNumber}
      />
    </>
  );
};

export default ExportOptionsModal;
