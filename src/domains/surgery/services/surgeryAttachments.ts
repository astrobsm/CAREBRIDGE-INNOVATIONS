// ---------------------------------------------------------------------------
// Signed consent and payment evidence for a surgery.
//
// The Surgical Workflow kept these uploads in React state only: they vanished
// on reload, never reached another device, and yet "Approve booking" set
// consentSigned: true on the strength of that state. They are now stored in
// the app's existing document store (db.scannedDocuments, which syncs to
// scanned_documents and is shown in the patient's Documents panel), linked to
// the patient and to the surgery (encounterId = surgery id, as the workflow
// already does for post-op prescriptions), and approval checks the stored
// record.
//
// The cloud row keeps the PDF (pdf_data_url) but not per-page images
// (`pages` is excluded from sync), so an image upload is also wrapped in a
// one-page PDF to survive on other devices.
// ---------------------------------------------------------------------------

import type { ScannedDocument, ScannedDocumentField } from '../../../types';

export type SurgeryAttachmentKind = 'consent' | 'payment';

/** extractedFields key that marks a document as a surgery attachment. */
export const SURGERY_ATTACHMENT_FIELD = 'surgeryAttachment';

const KIND_META: Record<SurgeryAttachmentKind, { documentType: ScannedDocument['documentType']; label: string }> = {
  consent: { documentType: 'consent_form', label: 'Signed consent' },
  payment: { documentType: 'other', label: 'Payment evidence' },
};

export interface UploadedFile { name: string; data: string }

export function isPdfDataUrl(data: string): boolean {
  return /^data:application\/pdf[;,]/i.test(data);
}
export function isImageDataUrl(data: string): boolean {
  return /^data:image\/[a-z0-9.+-]+[;,]/i.test(data);
}

export interface AttachmentArgs {
  id: string;
  pageId: string;
  kind: SurgeryAttachmentKind;
  file: UploadedFile;
  /** PDF data URL for an image upload (see imageToPdfDataUrl); ignored for a PDF. */
  imagePdfDataUrl?: string;
  surgery: { id: string; procedureName?: string };
  patient: { id: string; name?: string; hospitalId?: string };
  user: { id: string; name?: string };
  extra?: ScannedDocumentField[];
  now: Date;
}

/** The ScannedDocument row for an uploaded consent / payment file. Pure. */
export function buildSurgeryAttachment(a: AttachmentArgs): ScannedDocument {
  if (!isPdfDataUrl(a.file.data) && !isImageDataUrl(a.file.data)) {
    throw new Error('Only images and PDF files can be attached');
  }
  const meta = KIND_META[a.kind];
  const pdf = isPdfDataUrl(a.file.data) ? a.file.data : a.imagePdfDataUrl;
  return {
    id: a.id,
    patientId: a.patient.id,
    patientName: a.patient.name,
    hospitalId: a.patient.hospitalId,
    encounterId: a.surgery.id,
    documentType: meta.documentType,
    title: `${meta.label}${a.surgery.procedureName ? ` - ${a.surgery.procedureName}` : ''} (${a.file.name})`,
    pages: isImageDataUrl(a.file.data)
      ? [{ id: a.pageId, imageDataUrl: a.file.data, ocrText: '', confidence: 0 }]
      : [],
    fullText: '',
    extractedFields: [
      { key: SURGERY_ATTACHMENT_FIELD, label: 'Surgery attachment', value: a.kind },
      { key: 'surgeryId', label: 'Surgery', value: a.surgery.id },
      { key: 'fileName', label: 'File', value: a.file.name },
      ...(a.extra ?? []),
    ],
    pdfDataUrl: pdf,
    createdBy: a.user.id,
    createdByName: a.user.name,
    createdAt: a.now,
    updatedAt: a.now,
  };
}

const fieldOf = (d: Pick<ScannedDocument, 'extractedFields'>, key: string) =>
  (d.extractedFields ?? []).find(f => f.key === key)?.value;

/** The current (newest, not withdrawn) attachment of a kind for a surgery. */
export function findSurgeryAttachment(
  docs: ScannedDocument[],
  surgeryId: string,
  kind: SurgeryAttachmentKind,
): ScannedDocument | undefined {
  if (!surgeryId) return undefined;
  return docs
    .filter(d => d.encounterId === surgeryId && fieldOf(d, SURGERY_ATTACHMENT_FIELD) === kind)
    .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())[0];
}

export function attachmentFileName(d: ScannedDocument): string {
  return fieldOf(d, 'fileName') || d.title;
}

/**
 * Withdraw an attachment (wrong file uploaded). The document is kept in the
 * patient's record, re-labelled, rather than deleted.
 */
export function withdrawnAttachment(d: ScannedDocument, now: Date): ScannedDocument {
  return {
    ...d,
    title: `${d.title} [withdrawn]`,
    extractedFields: (d.extractedFields ?? []).map(f =>
      f.key === SURGERY_ATTACHMENT_FIELD ? { ...f, value: `${f.value}_withdrawn` } : f),
    updatedAt: now,
  };
}

/** What approval still needs from the stored attachments. */
export function missingAttachments(docs: ScannedDocument[], surgeryId: string): string[] {
  const missing: string[] = [];
  if (!findSurgeryAttachment(docs, surgeryId, 'consent')) missing.push('Signed Consent Upload');
  if (!findSurgeryAttachment(docs, surgeryId, 'payment')) missing.push('Payment Evidence');
  return missing;
}

/** Wrap an uploaded image in a one-page A4 PDF (data URL), so it syncs. */
export async function imageToPdfDataUrl(imageDataUrl: string, title: string): Promise<string> {
  const { default: JsPDF } = await import('jspdf');
  const doc = new JsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  doc.setFontSize(10);
  doc.text(title.replace(/[^\x20-\x7E]/g, ' '), margin, margin);
  const props = doc.getImageProperties(imageDataUrl);
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2 - 6;
  const scale = Math.min(maxW / props.width, maxH / props.height);
  const w = props.width * scale;
  const h = props.height * scale;
  doc.addImage(imageDataUrl, props.fileType || 'JPEG', margin, margin + 6, w, h);
  return doc.output('datauristring');
}
