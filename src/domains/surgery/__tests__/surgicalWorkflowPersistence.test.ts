import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  draftKeyFor, legacyDraftKey, newCaseDraftKey, surgeryDraftKey,
  migrateLegacyDraft, promoteNewCaseDraft, readDraft, type DraftStorage,
} from '../services/workflowDraft';
import {
  buildSurgeryAttachment, findSurgeryAttachment, missingAttachments, withdrawnAttachment,
  attachmentFileName, imageToPdfDataUrl,
} from '../services/surgeryAttachments';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

function fakeStorage(init: Record<string, string> = {}): DraftStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: k => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
  };
}

describe('workflow draft keys', () => {
  it('one draft per surgery; a new-case draft per patient before the first save', () => {
    expect(draftKeyFor('p1', 's1')).toBe(surgeryDraftKey('s1'));
    expect(draftKeyFor('p1')).toBe(newCaseDraftKey('p1'));
    expect(draftKeyFor('p1')).not.toBe(legacyDraftKey('p1'));
  });

  it("a patient's second operation does not inherit the first one's draft", () => {
    const st = fakeStorage();
    st.setItem(newCaseDraftKey('p1'), JSON.stringify({ complications: 'Haematoma', operativeFindings: 'Flap congested' }));
    promoteNewCaseDraft(st, 'p1', 'surgeryA');
    expect(readDraft(st, surgeryDraftKey('surgeryA'))).toMatchObject({ complications: 'Haematoma' });
    // The next new case for the same patient starts empty.
    expect(readDraft(st, draftKeyFor('p1'))).toBeNull();
    expect(readDraft(st, draftKeyFor('p1', 'surgeryB'))).toBeNull();
  });

  it('promotes the live state when given, and removes the patient-level keys', () => {
    const st = fakeStorage({ [newCaseDraftKey('p1')]: '{"riskNotes":"old"}', [legacyDraftKey('p1')]: '{"x":1}' });
    promoteNewCaseDraft(st, 'p1', 's9', '{"riskNotes":"typed just now"}');
    expect(readDraft(st, surgeryDraftKey('s9'))).toEqual({ riskNotes: 'typed just now' });
    expect(st.getItem(newCaseDraftKey('p1'))).toBeNull();
    expect(st.getItem(legacyDraftKey('p1'))).toBeNull();
  });

  describe('migrating the old per-patient draft', () => {
    it('no surgery yet: becomes the new-case draft', () => {
      const st = fakeStorage({ [legacyDraftKey('p1')]: '{"a":1}' });
      expect(migrateLegacyDraft(st, 'p1', [])).toBe('to_new');
      expect(st.getItem(newCaseDraftKey('p1'))).toBe('{"a":1}');
      expect(st.getItem(legacyDraftKey('p1'))).toBeNull();
    });

    it('exactly one surgery: belongs to it', () => {
      const st = fakeStorage({ [legacyDraftKey('p1')]: '{"a":1}' });
      expect(migrateLegacyDraft(st, 'p1', ['s1'])).toBe('to_surgery');
      expect(st.getItem(surgeryDraftKey('s1'))).toBe('{"a":1}');
    });

    it('several surgeries: ambiguous, so it is loaded into none of them', () => {
      const st = fakeStorage({ [legacyDraftKey('p1')]: '{"a":1}' });
      expect(migrateLegacyDraft(st, 'p1', ['s1', 's2'])).toBe('ambiguous');
      expect(st.getItem(surgeryDraftKey('s1'))).toBeNull();
      expect(st.getItem(surgeryDraftKey('s2'))).toBeNull();
    });

    it('never overwrites an existing draft', () => {
      const st = fakeStorage({ [legacyDraftKey('p1')]: '{"a":1}', [surgeryDraftKey('s1')]: '{"b":2}' });
      migrateLegacyDraft(st, 'p1', ['s1']);
      expect(st.getItem(surgeryDraftKey('s1'))).toBe('{"b":2}');
    });
  });

  it('readDraft tolerates corrupt JSON', () => {
    expect(readDraft(fakeStorage({ k: '{oops' }), 'k')).toBeNull();
  });
});

const PDF = 'data:application/pdf;base64,JVBERi0xLjQK';
// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const base = {
  pageId: 'pg', surgery: { id: 's1', procedureName: 'Abdominoplasty' },
  patient: { id: 'p1', name: 'Ada Obi', hospitalId: 'h1' }, user: { id: 'u1', name: 'Dr A' },
};

describe('surgery attachments', () => {
  it('stores a PDF as the document PDF, linked to patient and surgery', () => {
    const d = buildSurgeryAttachment({ ...base, id: 'd1', kind: 'consent', file: { name: 'consent.pdf', data: PDF }, now: new Date(1) });
    expect(d).toMatchObject({ patientId: 'p1', encounterId: 's1', documentType: 'consent_form', pdfDataUrl: PDF, hospitalId: 'h1' });
    expect(d.pages).toEqual([]);
    expect(attachmentFileName(d)).toBe('consent.pdf');
  });

  it('stores an image as a page and as a PDF (pages do not sync)', () => {
    const d = buildSurgeryAttachment({ ...base, id: 'd2', kind: 'payment', file: { name: 'receipt.png', data: PNG }, imagePdfDataUrl: PDF, now: new Date(1) });
    expect(d.pages[0].imageDataUrl).toBe(PNG);
    expect(d.pdfDataUrl).toBe(PDF);
    expect(d.documentType).toBe('other');
  });

  it('refuses anything that is not an image or a PDF', () => {
    expect(() => buildSurgeryAttachment({ ...base, id: 'x', kind: 'consent', file: { name: 'a.txt', data: 'data:text/plain;base64,aGk=' }, now: new Date() })).toThrow();
  });

  it('approval needs both stored attachments for THIS surgery', () => {
    const consent = buildSurgeryAttachment({ ...base, id: 'c', kind: 'consent', file: { name: 'c.pdf', data: PDF }, now: new Date(1) });
    const payOther = buildSurgeryAttachment({ ...base, id: 'p', kind: 'payment', file: { name: 'p.pdf', data: PDF }, surgery: { id: 'other' }, now: new Date(1) });
    expect(missingAttachments([], 's1')).toEqual(['Signed Consent Upload', 'Payment Evidence']);
    expect(missingAttachments([consent, payOther], 's1')).toEqual(['Payment Evidence']);
  });

  it('the newest upload wins; a withdrawn one no longer counts but is kept', () => {
    const older = buildSurgeryAttachment({ ...base, id: 'old', kind: 'consent', file: { name: 'old.pdf', data: PDF }, now: new Date(1) });
    const newer = buildSurgeryAttachment({ ...base, id: 'new', kind: 'consent', file: { name: 'new.pdf', data: PDF }, now: new Date(2) });
    expect(findSurgeryAttachment([older, newer], 's1', 'consent')?.id).toBe('new');
    const w = withdrawnAttachment(newer, new Date(3));
    expect(w.title).toMatch(/withdrawn/);
    expect(findSurgeryAttachment([older, w], 's1', 'consent')?.id).toBe('old');
    expect(missingAttachments([withdrawnAttachment(older, new Date(3)), w], 's1')).toContain('Signed Consent Upload');
  });

  it('wraps an image in a PDF', async () => {
    const url = await imageToPdfDataUrl(PNG, 'Payment evidence');
    expect(url).toMatch(/^data:application\/pdf/);
  });
});

describe('SurgicalWorkflowPage wiring', () => {
  const src = read('src/domains/surgery/pages/SurgicalWorkflowPage.tsx');
  const app = read('src/App.tsx');

  it('reads ?edit=<surgeryId> and an optional :surgeryId route param', () => {
    expect(src).toMatch(/surgeryId \|\| searchParams\.get\('edit'\)/);
    expect(app).toMatch(/path="workflow\/:patientId\/:surgeryId"/);
  });

  it('keys the draft by surgery, not by patient', () => {
    expect(src).not.toMatch(/`astro_workflow_\$\{patientId\}`/);
    expect(src).toMatch(/draftKeyFor\(patientId, currentSurgeryId/);
  });

  it('approval checks the stored attachments, not React state', () => {
    const approve = src.slice(src.indexOf('const approveBooking'), src.indexOf('const approveBooking') + 1500);
    expect(approve).toMatch(/db\.scannedDocuments\.where\('encounterId'\)\.equals\(currentSurgeryId\)/);
    expect(approve).toMatch(/missingAttachments\(/);
    expect(src).not.toMatch(/useState<\{ name: string; data: string \} \| null>\(null\)/);
  });
});
