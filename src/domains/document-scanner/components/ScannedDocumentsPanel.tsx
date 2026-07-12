import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  FileText,
  X,
  Download,
  Trash2,
  ExternalLink,
  FileScan,
} from 'lucide-react';
import { db } from '../../../database';
import type { ScannedDocument } from '../../../types';
import { DOCUMENT_TYPE_LABELS } from '../utils/documentClassifier';

interface Props {
  patientId?: string;
  wardRoundId?: string;
  /** Compact heading style for embedding inside a patient panel. */
  compact?: boolean;
  className?: string;
}

/** Convert a jsPDF data URI to a Blob URL so browsers open it reliably. */
function pdfToBlobUrl(dataUrl: string): string | null {
  try {
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
  } catch {
    return null;
  }
}

export default function ScannedDocumentsPanel({
  patientId,
  wardRoundId,
  compact = false,
  className = '',
}: Props) {
  const [preview, setPreview] = useState<ScannedDocument | null>(null);

  const docs = useLiveQuery(async () => {
    if (!patientId && !wardRoundId) return [] as ScannedDocument[];
    let list: ScannedDocument[];
    if (wardRoundId) {
      list = await db.scannedDocuments.where('wardRoundId').equals(wardRoundId).toArray();
    } else {
      list = await db.scannedDocuments.where('patientId').equals(patientId!).toArray();
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [patientId, wardRoundId]);

  const openPdf = (doc: ScannedDocument) => {
    if (!doc.pdfDataUrl) {
      toast.error('No PDF available for this document.');
      return;
    }
    const url = pdfToBlobUrl(doc.pdfDataUrl);
    if (url) {
      window.open(url, '_blank');
      // Revoke shortly after to free memory (tab already loaded it).
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
      toast.error('Could not open PDF.');
    }
  };

  const downloadPdf = (doc: ScannedDocument) => {
    if (!doc.pdfDataUrl) return;
    const a = document.createElement('a');
    a.href = doc.pdfDataUrl;
    a.download = `${doc.title || 'scanned-document'}.pdf`;
    a.click();
  };

  const deleteDoc = async (doc: ScannedDocument) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await db.scannedDocuments.delete(doc.id);
    if (preview?.id === doc.id) setPreview(null);
    toast.success('Document deleted.');
  };

  const count = docs?.length ?? 0;
  if (count === 0) {
    return compact ? null : (
      <div className={`rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 ${className}`}>
        No scanned documents yet.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <FileScan size={compact ? 14 : 16} className="text-indigo-600" />
        <h3 className={`font-semibold text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>
          Scanned documents ({count})
        </h3>
      </div>
      <div className="space-y-1.5">
        {docs!.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setPreview(doc)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50/40"
          >
            <FileText size={16} className="flex-shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{doc.title}</p>
              <p className="text-[11px] text-gray-500">
                {DOCUMENT_TYPE_LABELS[doc.documentType]} ·{' '}
                {format(new Date(doc.createdAt), 'dd MMM yyyy, HH:mm')} · {(doc.pages?.length ?? 0)} page
                {(doc.pages?.length ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
              {doc.extractedFields.length} fields
            </span>
          </button>
        ))}
      </div>

      {preview &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <div className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[88vh] sm:rounded-2xl">
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                <FileText className="text-indigo-600" size={20} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-gray-900">{preview.title}</h2>
                  <p className="text-xs text-gray-500">
                    {DOCUMENT_TYPE_LABELS[preview.documentType]} ·{' '}
                    {format(new Date(preview.createdAt), 'dd MMM yyyy, HH:mm')}
                    {preview.createdByName ? ` · ${preview.createdByName}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-2">
                {preview.pdfDataUrl && (
                  <>
                    <button
                      onClick={() => openPdf(preview)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      <ExternalLink size={14} /> Open PDF
                    </button>
                    <button
                      onClick={() => downloadPdf(preview)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={14} /> Download
                    </button>
                  </>
                )}
                <button
                  onClick={() => deleteDoc(preview)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* Pages */}
                {(preview.pages?.length ?? 0) > 0 && (
                  <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {preview.pages.map((p, i) => (
                      <img
                        key={p.id}
                        src={p.imageDataUrl}
                        alt={`Page ${i + 1}`}
                        className="h-40 rounded-lg border border-gray-200 object-contain"
                      />
                    ))}
                  </div>
                )}

                {/* Fields */}
                {preview.extractedFields.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Detected fields
                    </h3>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {preview.extractedFields.map((f) => (
                        <div
                          key={f.key}
                          className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm"
                        >
                          <span className="text-gray-500">{f.label}</span>
                          <span className="font-medium text-gray-800">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full text */}
                {preview.fullText.trim() && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Extracted text
                    </h3>
                    <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
                      {preview.fullText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
