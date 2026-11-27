import { describe, it, expect, vi } from 'vitest';
import { buildReviewSnapshot, harvestImages, PHOTO_POLICY, recordFields, type PhotoCandidate } from '../summaryBuilder';
import { selectAndCompressPhotos } from '../photoCompress';
import { bundle, NOW, PID, PNG, png } from './fixtures';

const build = (o = {}) => buildReviewSnapshot(bundle(o), NOW);
const section = (s: ReturnType<typeof build>['snapshot'], id: string) => s.sections.find(x => x.id === id)!;
const text = (x: unknown) => JSON.stringify(x);

describe('the snapshot has every section', () => {
  const { snapshot } = build();

  it('lists the sections in order, each present even when empty', () => {
    expect(snapshot.sections.map(s => s.id)).toEqual([
      'problems', 'encounters', 'plans', 'derm_rheum', 'investigations', 'prescriptions', 'surgery', 'wounds',
      'admissions', 'appointments', 'vitals', 'treatment_plans', 'documents', 'other',
    ]);
    const empty = buildReviewSnapshot({ patient: bundle().patient }, NOW).snapshot;
    expect(empty.sections).toHaveLength(14);
    expect(empty.sections.every(s => Array.isArray(s.items) && s.items.length === 0)).toBe(true);
  });

  it('demographics and contacts', () => {
    expect(snapshot.patient.name).toBe('Ngozi Ada Eze');
    expect(snapshot.patient.summary).toBe('45 y · Female');
    const f = Object.fromEntries(snapshot.patient.fields.map(x => [x.label, x.value]));
    expect(f['Hospital number']).toBe('APS/2026/0042');
    expect(f.Phone).toBe('08031230000');
    expect(f.Address).toBe('5 Ogui Road, Enugu, Enugu');
    expect(f['Next of kin']).toBe('Chukwu Eze (husband) 08030001111');
    expect(f.Genotype).toBe('AS');
    expect(f['Registered at']).toBe('AstroHEALTH Services');
  });

  it('allergies, comorbidities and medicines', () => {
    expect(snapshot.alerts.allergies).toEqual(['Penicillin', 'Sulfonamides']);
    expect(snapshot.alerts.conditions).toEqual(['Type 2 diabetes (moderate)', 'Sickle cell trait']);
    expect(snapshot.alerts.medicines[0]).toBe('Metformin 500 mg bd (for Type 2 diabetes)');
    expect(snapshot.alerts.medicines[1]).toMatch(/^Prednisolone 40 mg oral once daily for 2 weeks — prescribed/);
  });

  it('diagnoses and the problem list', () => {
    const titles = section(snapshot, 'problems').items.map(i => i.title);
    expect(titles).toEqual(expect.arrayContaining(['Pyoderma gangrenosum', 'Atypical ulcer — biopsy needed', 'Chronic leg ulcer for grafting', 'Pyoderma gangrenosum, grafted']));
  });

  it('clerkings with their history, examination, diagnoses and plan', () => {
    const e = section(snapshot, 'encounters').items[0];
    expect(e.title).toBe('Initial visit'); // from the encounter type when there is no structured clerking
    const f = Object.fromEntries(e.fields!.map(x => [x.label, x.value]));
    expect(f['Chief complaint']).toBe('Non-healing leg ulcer for 4 months');
    expect(f['History of presenting illness']).toBe('Started after minor trauma.');
    expect(f.Examination).toBe('Skin: Undermined violaceous edge, 6 x 4 cm');
    expect(f.Diagnoses).toMatch(/Pyoderma gangrenosum \(primary suspected\) \[L88\]/);
    expect(f.Plan).toBe('Biopsy edge; no sharp debridement.');
    expect(e.subtitle).toBe('Seen by Kene Owner · 1 photo(s)');
  });

  it('approved plans with their lines; drafts named but their lines not shared', () => {
    const items = section(snapshot, 'plans').items;
    const approved = items.find(i => i.status === 'Approved v1')!;
    expect(approved.lines).toEqual(['Investigations: Edge biopsy with DIF [soon]', 'Medications: Prednisolone 40 mg once daily']);
    expect(approved.subtitle).toMatch(/Approved by Dr Kene Owner/);
    expect(text(approved.fields)).toMatch(/CRP|Crp/);
    const draft = items.find(i => i.status?.startsWith('Draft'))!;
    expect(draft.title).toBe('Treatment plan: Keloid');
    expect(text(snapshot)).not.toContain('DRAFT LINE NOT FOR SHARING');
  });

  it('derm & rheum consults', () => {
    const c = section(snapshot, 'derm_rheum').items[0];
    expect(c.title).toBe('Pyoderma gangrenosum is most likely.');
    expect(c.lines).toEqual(expect.arrayContaining(['Do not: Do not debride', 'Must not miss: Buruli ulcer — Mimic; exclude by PCR']));
  });

  it('investigations with results, and lab requests', () => {
    const items = section(snapshot, 'investigations').items;
    const fbc = items.find(i => i.title === 'Full blood count')!;
    expect(fbc.lines).toEqual(['Haemoglobin: 9.8 g/dL (ref 12–16) [L]']);
    expect(text(fbc.fields)).toContain('Mild anaemia');
    expect(items.find(i => i.title.startsWith('Lab request'))!.lines).toEqual(['Wound swab MCS (swab): Staph aureus, MSSA']);
  });

  it('prescriptions', () => {
    expect(section(snapshot, 'prescriptions').items[0].lines).toEqual(['Prednisolone 40 mg oral once daily for 2 weeks']);
  });

  it('surgery with the operation note and outcome — and no fees', () => {
    const items = section(snapshot, 'surgery').items;
    expect(items.map(i => i.title)).toEqual(['Split-thickness skin graft, left leg', 'Operation note: STSG', 'Outcome: STSG']);
    expect(text(items[0].fields)).toContain('Graft harvested from right thigh');
    expect(text(items[1].fields)).toContain('Healthy granulation bed');
    expect(text(items[2].fields)).toMatch(/Surgical site infection \(CDC\)","value":"none/);
    expect(text(items)).not.toMatch(/250000|Surgeon fee/i);
  });

  it('wounds with measurements and the trend', () => {
    const w = section(snapshot, 'wounds').items[0];
    expect(w.title).toBe('Left leg ulcer — Left lateral leg');
    expect(w.fields![0].label).toBe('Trend');
    expect(w.fields![0].value).toMatch(/^Area 20\.0 → 12\.0 cm² \(−40%\) over 2 assessments/);
    expect(w.table!.rows).toHaveLength(2);
    expect(w.table!.rows[0][1]).toBe('5.0 × 3.0 × –');
  });

  it('admissions and discharge summaries', () => {
    const items = section(snapshot, 'admissions').items;
    expect(items[0].title).toBe('Admission — Ward A, bed 3');
    expect(items[1].title).toBe('Discharge summary');
    expect(text(items[1])).toContain('graft take 95%');
    expect(items[1].lines).toEqual(['Discharge medicine: Paracetamol 1 g tds']);
  });

  it('only upcoming appointments', () => {
    const items = section(snapshot, 'appointments').items;
    expect(items).toHaveLength(1);
    expect(text(items[0])).toContain('Graft review');
    expect(text(snapshot)).not.toContain('PAST VISIT');
  });

  it('vitals, documents (with their text) and other records', () => {
    expect(section(snapshot, 'vitals').items[0].table!.rows[0]).toContain('128/82');
    expect(text(section(snapshot, 'documents').items[0])).toContain('Neutrophilic dermatosis');
    const other = section(snapshot, 'other').items[0];
    expect(other.title).toBe('Burn assessment');
    expect(text(other.fields)).toContain('Tbsa percentage');
  });

  it('records when it was built, and carries no image bytes or internal ids', () => {
    expect(snapshot.snapshotAt).toBe(NOW.toISOString());
    const json = text(snapshot);
    expect(json).not.toContain('data:image');
    expect(json).not.toContain('iVBORw0KGgo');
    expect(json).not.toMatch(/"(Id|Patient id|Hospital id|Local id)"/);
    expect(json).not.toContain('u-owner');
  });
});

describe('no data from another patient', () => {
  it('the snapshot is built from the bundle alone: nothing names another patient', () => {
    const { snapshot } = build();
    expect(text(snapshot)).not.toMatch(/pt-other|Okonkwo/);
    expect(snapshot.patient.name).toBe('Ngozi Ada Eze');
  });

  it('the loader reads each table by this patient\'s id and drops any row for someone else', async () => {
    // A broken index that answers with every row must still not leak.
    const rows: Record<string, unknown[]> = {
      patients: [], clinicalEncounters: [{ id: 'e1', patientId: PID, chiefComplaint: 'mine' }, { id: 'e2', patientId: 'pt-other', chiefComplaint: 'Okonkwo leaked' }],
      burnAssessments: [{ id: 'b1', patientId: 'pt-other', notes: 'Okonkwo burn' }],
      invoices: [{ id: 'inv', patientId: PID, totalAmount: 5000 }],
    };
    const asked: string[] = [];
    const table = (name: string) => ({
      name,
      schema: { indexes: [{ name: 'patientId', keyPath: 'patientId' }] },
      where: (idx: string) => ({ equals: (v: string) => { asked.push(`${name}.${idx}=${v}`); return { toArray: async () => rows[name] ?? [] }; } }),
    });
    const names = ['clinicalEncounters', 'vitalSigns', 'burnAssessments', 'invoices', 'chatMessages'];
    vi.resetModules();
    vi.doMock('../../../database', () => ({
      db: {
        tables: names.map(table),
        patients: { get: async (id: string) => (id === PID ? bundle().patient : undefined) },
        users: { toArray: async () => [] },
        hospitals: { get: async () => undefined },
      },
    }));
    const { loadPatientRecords } = await import('../loadPatientRecords');
    const b = await loadPatientRecords(PID);
    expect(b!.encounters!.map(e => e.id)).toEqual(['e1']);
    expect(b!.other!.map(o => o.table)).toEqual([]); // the only burn row was someone else's; invoices are excluded
    expect(asked.every(a => a.endsWith(`.patientId=${PID}`))).toBe(true);
    expect(asked).not.toContain(`invoices.patientId=${PID}`);
    expect(await loadPatientRecords('nobody')).toBeNull();
    vi.doUnmock('../../../database');
  });
});

describe('photos', () => {
  it('collects every clinical image with where it came from, newest first, scanned paperwork last, profile photo not', () => {
    const { photos } = build();
    expect(photos.map(p => p.caption)).toEqual(['Left leg ulcer, day 0', 'Week 3', 'Week 0', 'Outside histology report']);
    expect(photos[0].source).toBe('Initial visit, 1 Nov 2026');
    expect(photos[1].source).toBe('Wound assessment · Left leg ulcer — Left lateral leg');
    expect(photos[3].priority).toBe(1);
    expect(photos.some(p => p.dataUrl === PNG)).toBe(false); // patient.photo (portrait) is not a clinical photo
  });

  it('finds nested images and ignores non-images', () => {
    const out: PhotoCandidate[] = [];
    harvestImages({ a: { b: [{ caption: 'deep', takenAt: '2026-01-01', img: png(9) }] }, svg: 'data:image/svg+xml;base64,PHN2Zz4=', pdf: 'data:application/pdf;base64,AAAA' }, 'X', 0, out);
    expect(out).toHaveLength(1);
    expect(out[0].caption).toBe('deep');
  });

  const cands = (n: number): PhotoCandidate[] => Array.from({ length: n }, (_, i) => ({ dataUrl: png(i), source: 's', caption: `p${i}`, priority: 0 }));
  const fakeCompress = (bytesEach: number) => async () => ({ dataUrl: `data:image/jpeg;base64,${'A'.repeat(Math.ceil(bytesEach / 3) * 4)}`, width: 1024, height: 768 });

  it('keeps the 20 most recent and says how many were left out', async () => {
    const r = await selectAndCompressPhotos(cands(25), fakeCompress(100_000));
    expect(PHOTO_POLICY.maxPhotos).toBe(20);
    expect(r.photos).toHaveLength(20);
    expect(r.photos[0].caption).toBe('p0');
    expect(r.total).toBe(25);
    expect(r.note).toMatch(/^5 older photos were left out because of the limit of the 20 most recent/);
  });

  it('stops at ~6 MB', async () => {
    const r = await selectAndCompressPhotos(cands(12), fakeCompress(1_000_000));
    expect(r.photos).toHaveLength(6);
    expect(r.photos.reduce((s, p) => s + p.bytes, 0)).toBeLessThanOrEqual(PHOTO_POLICY.maxTotalBytes);
    expect(r.note).toMatch(/6 older photos were left out because of the size limit \(6 MB\)/);
  });

  it('a photo that cannot be read is skipped and counted', async () => {
    let i = 0;
    const flaky = async () => { if (i++ === 1) throw new Error('bad'); return { dataUrl: 'data:image/jpeg;base64,QUJD', width: 1, height: 1 }; };
    const r = await selectAndCompressPhotos(cands(3), flaky);
    expect(r.photos).toHaveLength(2);
    expect(r.note).toMatch(/1 older photo was left out/);
  });

  it('everything fits: no note', async () => {
    const r = await selectAndCompressPhotos(cands(3), fakeCompress(1000));
    expect(r.photos).toHaveLength(3);
    expect(r.note).toBeUndefined();
  });
});

describe('recordFields', () => {
  it('shows every clinical field, key ones first, and hides ids, sync markers, fees and images', () => {
    const f = recordFields({
      id: 'x', patientId: 'p', localId: 'l', syncedAt: new Date(), surgeonFee: 5, notes: 'B', exudateAmount: 'heavy', findings: 'A',
      photo: PNG, inner: { tbsaPercentage: 12, imageData: PNG }, flags: ['a', 'b'], done: true, when: '2026-11-02',
    }, { first: ['findings'] });
    expect(f.map(x => x.label)).toEqual(['Findings', 'Notes', 'Exudate amount', 'Inner', 'Flags', 'Done', 'When']);
    expect(f.find(x => x.label === 'Inner')!.value).toBe('Tbsa percentage: 12');
    expect(f.find(x => x.label === 'Done')!.value).toBe('Yes');
    expect(f.find(x => x.label === 'When')!.value).toBe('2 Nov 2026');
  });
});
