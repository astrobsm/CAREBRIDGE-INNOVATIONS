/**
 * Adapter from AstroHEALTH's OCR service to the call shape the scan pipeline
 * was written against.
 *
 * The pipeline expects `ocrService.extractText(source, docType, onProgress)`.
 * AstroHEALTH exposes `performOCR(source, options)` instead, with no progress
 * callback. Rather than edit the pipeline (and drift from the upstream module),
 * this maps between the two.
 *
 * OCR IS NOT REIMPLEMENTED HERE. performOCR already runs Tesseract locally and
 * escalates to cloud vision when configured; this only reshapes the call.
 */

import { performOCR, type OCRResult } from '../../../services/ocrService';

export interface OcrProgress {
  progress: number;
  status?: string;
}

export interface ExtractedText {
  text: string;
  confidence: number;
  engine?: string;
}

/**
 * A canvas has to become a blob before performOCR can take it — it accepts a
 * data URL, File or Blob, not a canvas element.
 */
async function toSource(input: HTMLCanvasElement | File | Blob | string): Promise<string | File | Blob> {
  if (typeof input === 'string') return input;
  if (input instanceof Blob) return input;
  if (typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) {
    return input.toDataURL('image/png');
  }
  return input as unknown as File;
}

export const ocrService = {
  /**
   * Read text from an image, canvas or PDF page.
   *
   * `_docType` is accepted for call-shape compatibility; AstroHEALTH's OCR
   * takes a medical-context hint instead, which is always on here because every
   * document this pipeline sees is a clinical report.
   *
   * Progress is reported coarsely — performOCR does not stream progress, so the
   * callback fires at start and completion rather than continuously. That is
   * enough for the pipeline's per-file progress bar and avoids faking
   * intermediate values that do not exist.
   */
  async extractText(
    input: HTMLCanvasElement | File | Blob | string,
    _docType?: string,
    onProgress?: (p: OcrProgress) => void,
  ): Promise<ExtractedText> {
    onProgress?.({ progress: 0, status: 'starting' });
    try {
      const source = await toSource(input);
      const result: OCRResult = await performOCR(source, {
        medicalContext: true,
        enhanceHandwriting: true,
        preprocessImage: true,
      });
      onProgress?.({ progress: 1, status: 'done' });
      return {
        text: result?.text || '',
        // performOCR reports 0-100; the pipeline averages confidences as a
        // 0-1 fraction, so normalise here rather than at every call site.
        confidence: Math.max(0, Math.min(1, (result?.confidence ?? 0) / 100)),
        engine: result?.engine,
      };
    } catch (e) {
      console.warn('[ClinicianAssistant] OCR failed:', (e as Error)?.message);
      onProgress?.({ progress: 1, status: 'failed' });
      return { text: '', confidence: 0 };
    }
  },
};
