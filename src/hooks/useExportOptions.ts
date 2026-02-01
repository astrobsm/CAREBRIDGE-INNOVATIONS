/**
 * useExportOptions Hook
 * 
 * Provides easy integration of three export options:
 * 1. Share on WhatsApp (A4 PDF)
 * 2. Export PDF (A4 format)
 * 3. Thermal Print (80mm width, Georgia 12pt)
 * 
 * Usage:
 * ```tsx
 * const { 
 *   showExportModal, 
 *   setShowExportModal, 
 *   handleExportA4PDF,
 *   handleShareWhatsApp,
 *   handleThermalPrint,
 *   renderExportModal 
 * } = useExportOptions({
 *   generateA4PDF: () => myPdfGenerator(),
 *   generateThermalPDF: () => myThermalPdfGenerator(),
 *   fileNamePrefix: 'invoice',
 *   phoneNumber: patient?.phone,
 *   title: 'Export Invoice'
 * });
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { sharePDFOnWhatsApp } from '../utils/whatsappShareUtils';

export interface UseExportOptionsConfig {
  /** Function to generate A4 PDF - returns jsPDF instance or Blob */
  generateA4PDF: () => Promise<jsPDF | Blob> | jsPDF | Blob;
  /** Optional function to generate thermal PDF - if not provided, A4 will be used */
  generateThermalPDF?: () => Promise<jsPDF | Blob> | jsPDF | Blob;
  /** File name prefix (without extension) */
  fileNamePrefix: string;
  /** Optional phone number for WhatsApp */
  phoneNumber?: string;
  /** Modal title */
  title?: string;
  /** Callback after successful export */
  onExportSuccess?: (type: 'a4' | 'whatsapp' | 'thermal') => void;
}

export interface UseExportOptionsReturn {
  /** Whether the export modal is open */
  showExportModal: boolean;
  /** Toggle the export modal */
  setShowExportModal: (show: boolean) => void;
  /** Open the export modal */
  openExportModal: () => void;
  /** Close the export modal */
  closeExportModal: () => void;
  /** Export A4 PDF directly */
  handleExportA4PDF: () => Promise<void>;
  /** Share A4 PDF on WhatsApp */
  handleShareWhatsApp: () => Promise<void>;
  /** Export thermal PDF (80mm) */
  handleThermalPrint: () => Promise<void>;
  /** Whether any export is in progress */
  isExporting: boolean;
  /** Which export type is in progress */
  exportingType: 'a4' | 'whatsapp' | 'thermal' | null;
  /** Modal title */
  title: string;
  /** Configuration object ready to pass to ExportOptionsModal */
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    generateA4PDF: () => Promise<jsPDF | Blob> | jsPDF | Blob;
    generateThermalPDF?: () => Promise<jsPDF | Blob> | jsPDF | Blob;
    fileNamePrefix: string;
    phoneNumber?: string;
  };
}

export function useExportOptions(config: UseExportOptionsConfig): UseExportOptionsReturn {
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportingType, setExportingType] = useState<'a4' | 'whatsapp' | 'thermal' | null>(null);

  const {
    generateA4PDF,
    generateThermalPDF,
    fileNamePrefix,
    phoneNumber,
    title = 'Export / Print Options',
    onExportSuccess
  } = config;

  const getFileName = useCallback((suffix: string = '') => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    return `${fileNamePrefix}${suffix}_${timestamp}.pdf`;
  }, [fileNamePrefix]);

  const getPDFBlob = useCallback(async (generateFn: () => Promise<jsPDF | Blob> | jsPDF | Blob): Promise<Blob> => {
    const result = await generateFn();
    if (result instanceof Blob) {
      return result;
    }
    return result.output('blob');
  }, []);

  const handleExportA4PDF = useCallback(async () => {
    setExportingType('a4');
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
      setShowExportModal(false);
      onExportSuccess?.('a4');
    } catch (error) {
      console.error('Error exporting A4 PDF:', error);
      toast.error('Failed to export A4 PDF');
    } finally {
      setExportingType(null);
    }
  }, [generateA4PDF, getFileName, onExportSuccess]);

  const handleShareWhatsApp = useCallback(async () => {
    setExportingType('whatsapp');
    try {
      const pdfBlob = await getPDFBlob(generateA4PDF);
      const fileName = getFileName('_A4');
      await sharePDFOnWhatsApp(pdfBlob, fileName, phoneNumber);
      setShowExportModal(false);
      onExportSuccess?.('whatsapp');
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp');
    } finally {
      setExportingType(null);
    }
  }, [generateA4PDF, getFileName, getPDFBlob, phoneNumber, onExportSuccess]);

  const handleThermalPrint = useCallback(async () => {
    setExportingType('thermal');
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
      setShowExportModal(false);
      onExportSuccess?.('thermal');
    } catch (error) {
      console.error('Error exporting thermal PDF:', error);
      toast.error('Failed to export thermal PDF');
    } finally {
      setExportingType(null);
    }
  }, [generateA4PDF, generateThermalPDF, getFileName, onExportSuccess]);

  const openExportModal = useCallback(() => setShowExportModal(true), []);
  const closeExportModal = useCallback(() => setShowExportModal(false), []);

  const modalProps = useMemo(() => ({
    isOpen: showExportModal,
    onClose: closeExportModal,
    title,
    generateA4PDF,
    generateThermalPDF,
    fileNamePrefix,
    phoneNumber
  }), [showExportModal, closeExportModal, title, generateA4PDF, generateThermalPDF, fileNamePrefix, phoneNumber]);

  return {
    showExportModal,
    setShowExportModal,
    openExportModal,
    closeExportModal,
    handleExportA4PDF,
    handleShareWhatsApp,
    handleThermalPrint,
    isExporting: exportingType !== null,
    exportingType,
    title,
    modalProps
  };
}

export default useExportOptions;
