import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import {
  Camera,
  ImagePlus,
  Upload,
  X,
  Loader2,
  Trash2,
  FileText,
  Save,
  ScanLine,
} from 'lucide-react';
import ocrService from '../../../services/ocrService';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import type {
  ScannedDocument,
  ScannedDocumentPage,
  ScannedDocumentType,
  ScannedDocumentField,
} from '../../../types';
import {
  classifyDocument,
  extractFields,
  DOCUMENT_TYPE_LABELS,
} from '../utils/documentClassifier';

interface Props {
  patientId?: string;
  patientName?: string;
  hospitalId?: string;
  wardRoundId?: string;
  admissionId?: string;
  encounterId?: string;
  onClose: () => void;
  onSaved?: (doc: ScannedDocument) => void;
}

/** Load an image data URL and return its natural dimensions. */
function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1000, h: 1414 });
    img.src = dataUrl;
  });
}

async function buildPdf(
  title: string,
  pages: ScannedDocumentPage[],
  fields: ScannedDocumentField[],
  fullText: string
): Promise<string> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Cover with metadata + extracted fields
  doc.setFontSize(14);
  doc.text(title || 'Scanned Document', margin, 16);
  doc.setFontSize(9);
  let y = 26;
  if (fields.length) {
    doc.text('Detected fields:', margin, y);
    y += 5;
    fields.forEach((f) => {
      doc.text(`• ${f.label}: ${f.value}`.slice(0, 110), margin, y);
      y += 5;
      if (y > pageH - margin) {
        doc.addPage();
        y = margin + 6;
      }
    });
  }

  // One image per page, scaled to fit
  for (const page of pages) {
    const { w, h } = await imageSize(page.imageDataUrl);
    doc.addPage();
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / w, maxH / h);
    const drawW = w * ratio;
    const drawH = h * ratio;
    const format = page.imageDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
    try {
      doc.addImage(page.imageDataUrl, format, margin, margin, drawW, drawH);
    } catch {
      /* skip unrenderable page image */
    }
  }

  // Appendix: full OCR text
  if (fullText.trim()) {
    doc.addPage();
    doc.setFontSize(11);
    doc.text('Extracted text (OCR)', margin, 16);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(fullText, pageW - margin * 2);
    doc.text(lines, margin, 24);
  }

  return doc.output('datauristring');
}

export default function DocumentScanner({
  patientId,
  patientName,
  hospitalId,
  wardRoundId,
  admissionId,
  encounterId,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const [pages, setPages] = useState<ScannedDocumentPage[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<ScannedDocumentType>('other');
  const [fullText, setFullText] = useState('');
  const [fields, setFields] = useState<ScannedDocumentField[]>([]);
  const [autoApplied, setAutoApplied] = useState(false);

  const runOcrOnImage = useCallback(
    async (dataUrl: string) => {
      setBusy(true);
      try {
        const result = await ocrService.performOCR(dataUrl, {
          language: 'eng',
          enhanceHandwriting: true,
          preprocessImage: true,
          useCloudOCR: false, // offline-first
          medicalContext: true,
        });
        const page: ScannedDocumentPage = {
          id: uuidv4(),
          imageDataUrl: dataUrl,
          ocrText: result.text || '',
          confidence: Math.round(result.confidence || 0),
        };
        setPages((prev) => {
          const next = [...prev, page];
          const combined = next.map((p) => p.ocrText).join('\n\n');
          // Re-run auto classification/extraction until the user edits manually.
          if (!autoApplied) {
            setFullText(combined);
            setDocType(classifyDocument(combined));
            setFields(extractFields(combined));
          }
          return next;
        });
        toast.success(`Page ${pages.length + 1} scanned (${page.confidence}% confidence)`);
      } catch (e) {
        console.error('[DocumentScanner] OCR failed', e);
        toast.error('Could not read this page. Try a clearer photo.');
      } finally {
        setBusy(false);
      }
    },
    [pages.length, autoApplied]
  );

  const handleCamera = async () => {
    try {
      const dataUrl = await ocrService.captureFromCamera();
      if (dataUrl) await runOcrOnImage(dataUrl);
    } catch {
      toast.error('Camera unavailable on this device.');
    }
  };

  const handleGallery = async () => {
    try {
      const dataUrl = await ocrService.selectFromGallery();
      if (dataUrl) await runOcrOnImage(dataUrl);
    } catch {
      /* user cancelled */
    }
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      await runOcrOnImage(dataUrl);
    }
    e.target.value = '';
  };

  const removePage = (id: string) => {
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const combined = next.map((p) => p.ocrText).join('\n\n');
      setFullText(combined);
      return next;
    });
  };

  const updateField = (idx: number, value: string) => {
    setAutoApplied(true);
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, value } : f)));
  };

  const canSave = pages.length > 0 && !busy && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = new Date();
      const pdfDataUrl = await buildPdf(
        title || DOCUMENT_TYPE_LABELS[docType],
        pages,
        fields,
        fullText
      );
      const doc: ScannedDocument = {
        id: uuidv4(),
        patientId,
        patientName,
        hospitalId,
        wardRoundId,
        encounterId,
        admissionId,
        documentType: docType,
        title: title || DOCUMENT_TYPE_LABELS[docType],
        pages,
        fullText,
        extractedFields: fields,
        pdfDataUrl,
        createdBy: user?.id || 'unknown',
        createdByName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.scannedDocuments.add(doc);
      void syncRecord('scannedDocuments', doc as unknown as Record<string, unknown>);
      toast.success('Document saved and attached.');
      onSaved?.(doc);
      onClose();
    } catch (e) {
      console.error('[DocumentScanner] save failed', e);
      toast.error('Failed to save document.');
    } finally {
      setSaving(false);
    }
  };

  const avgConfidence = useMemo(
    () =>
      pages.length
        ? Math.round(pages.reduce((s, p) => s + p.confidence, 0) / pages.length)
        : 0,
    [pages]
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[88vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <ScanLine className="text-indigo-600" size={20} />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Scan document</h2>
            <p className="text-xs text-gray-500">
              {patientName ? `For ${patientName} · ` : ''}Offline OCR — pages auto-classified
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Capture actions */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3">
          <button
            onClick={handleCamera}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Camera size={16} /> Camera
          </button>
          <button
            onClick={handleGallery}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ImagePlus size={16} /> Gallery
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={16} /> Files
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
              disabled={busy}
            />
          </label>
          {busy && (
            <span className="inline-flex items-center gap-2 text-sm text-indigo-600">
              <Loader2 size={16} className="animate-spin" /> Reading…
            </span>
          )}
          {pages.length > 0 && !busy && (
            <span className="ml-auto self-center text-xs text-gray-500">
              {pages.length} page{pages.length > 1 ? 's' : ''} · avg {avgConfidence}%
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {pages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
              <FileText size={40} />
              <p className="mt-3 max-w-xs text-sm">
                Add pages from the camera, gallery or files. Each page is read with offline
                OCR, then classified and its fields detected automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Page thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pages.map((p, i) => (
                  <div key={p.id} className="relative flex-shrink-0">
                    <img
                      src={p.imageDataUrl}
                      alt={`Page ${i + 1}`}
                      className="h-24 w-20 rounded-lg border border-gray-200 object-cover"
                    />
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => removePage(p.id)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                      title="Remove page"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={DOCUMENT_TYPE_LABELS[docType]}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Document type <span className="text-indigo-500">(auto)</span>
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as ScannedDocumentType)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detected fields */}
              {fields.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Detected fields (editable)
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {fields.map((f, idx) => (
                      <div key={f.key} className="flex items-center gap-2">
                        <span className="w-28 flex-shrink-0 text-xs text-gray-500">{f.label}</span>
                        <input
                          value={f.value}
                          onChange={(e) => updateField(idx, e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full text */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Extracted text (edit before saving)
                </label>
                <textarea
                  value={fullText}
                  onChange={(e) => {
                    setAutoApplied(true);
                    setFullText(e.target.value);
                  }}
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save &amp; attach
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
