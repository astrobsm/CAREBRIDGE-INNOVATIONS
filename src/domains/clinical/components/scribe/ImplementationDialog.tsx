/**
 * Logging the implementation of one approved plan item.
 *
 * Who is the signed-in user and when is the moment of logging — neither is
 * typed; where is the device's location, with the ward / theatre / clinic
 * named by the person logging. Depending on the item:
 *
 *   medication     choose the formulary category → drug → formulation, dose,
 *                  frequency, duration — saved as a real prescription
 *   investigation  choose the catalogue category → test — saved as a real
 *                  investigation request; then snap, scan, upload or type the
 *                  result, which goes onto the investigation too
 *   procedure/care done / partly / not done, with a note
 */
import { useEffect, useMemo, useState } from 'react';
import { Camera, FileUp, Loader2, MapPin, Paperclip, ScanLine, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  BNF_DRUG_DATABASE, getDrugCategories, getDrugsByCategory, getFrequencyLabel,
  type DrugCategory, type DrugFrequency,
} from '../../../../data/bnfDrugDatabase';
import { INVESTIGATION_CATALOG } from '../../../../services/investigationRequestService';
import type { InvestigationCategory, ScannedDocument } from '../../../../types';
import DocumentScanner from '../../../document-scanner/components/DocumentScanner';
import { messageOf } from '../../clerking/lifecycle';
import { drugFromText, investigationFromText } from '../../scribe/catalogMatch';
import { itemState, type PlanItem, type LoggedAction } from '../../scribe/planItems';
import {
  getAttachment, logAction, prescribeForPlanItem, recordInvestigationResult, requestInvestigationForPlanItem,
  type LocationFix, type LogInput,
} from '../../scribe/implementationService';

interface Attachment { name: string; data: string }

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src;
});

/** Shrink a photo on the device (≤ 1600 px, JPEG) so a log fits in one save. */
async function compressDataUrl(src: string, maxSide = 1600, quality = 0.75): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

/** The device's position, if it will give one within a few seconds. */
function getLocation(timeoutMs = 8000): Promise<Omit<LocationFix, 'label'>> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ status: 'unavailable' });
    navigator.geolocation.getCurrentPosition(
      p => resolve({ status: 'gps', latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => resolve({ status: e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

const PLACES = ['Ward', 'Theatre', 'Clinic', 'Emergency', 'Dressing room', 'ICU / HDU', 'Laboratory', 'Radiology', 'Pharmacy', 'Other'];
const FREQUENCIES: DrugFrequency[] = ['od', 'bd', 'tds', 'qds', 'q4h', 'q6h', 'q8h', 'q12h', 'nocte', 'mane', 'prn', 'stat', 'weekly'];

export function ImplementationDialog({ planId, patientId, hospitalId, item, actions, defaultPlace, onClose }: {
  planId: string; patientId: string; hospitalId?: string; item: PlanItem; actions: LoggedAction[];
  defaultPlace?: string; onClose: () => void;
}) {
  const { user } = useAuth();
  const state = itemState(actions);
  const lastOrder = actions.find(a => a.status === 'ordered' && a.investigation)?.investigation;
  const [loc, setLoc] = useState<LocationFix>({ status: 'pending', label: defaultPlace || 'Ward' });
  const [status, setStatus] = useState<string>('done');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Medication
  const guessDrug = useMemo(() => drugFromText(item.text), [item.text]);
  const [group, setGroup] = useState<DrugCategory | ''>(guessDrug?.category || '');
  const [drugId, setDrugId] = useState(guessDrug?.id || '');
  const drug = BNF_DRUG_DATABASE.find(d => d.id === drugId);
  const [formIdx, setFormIdx] = useState(0);
  const [dose, setDose] = useState(guessDrug?.dosage?.adult?.standard || '');
  const [freq, setFreq] = useState<string>(guessDrug?.dosage?.adult?.frequency?.[0] || '');
  const [duration, setDuration] = useState(guessDrug?.dosage?.adult?.duration || '');
  const [instructions, setInstructions] = useState('');

  // Investigation
  const guessInv = useMemo(() => investigationFromText(item.text), [item.text]);
  const [invCat, setInvCat] = useState<InvestigationCategory | ''>(guessInv?.category || '');
  const [invCode, setInvCode] = useState(guessInv?.item.code || '');
  const catalogCat = INVESTIGATION_CATALOG.find(c => c.category === invCat);
  const inv = catalogCat?.groups.flatMap(g => g.items).find(i => i.code === invCode);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>(item.priority === 'urgent' ? 'urgent' : 'routine');

  // Result
  const [showResult, setShowResult] = useState(item.kind === 'investigation' && !!lastOrder);
  const [resultValue, setResultValue] = useState('');
  const [resultUnit, setResultUnit] = useState('');
  const [resultText, setResultText] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [scanned, setScanned] = useState<{ pages: Attachment[]; text: string } | null>(null);
  const [showScan, setShowScan] = useState(false);

  useEffect(() => { void getLocation().then(f => setLoc(l => ({ ...l, ...f }))); }, []);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const out: Attachment[] = [];
    for (const f of Array.from(list)) {
      try {
        const raw = await fileToDataUrl(f);
        const data = f.type.startsWith('image/') ? await compressDataUrl(raw) : raw;
        if (data.length > 3_500_000) { toast.error(`${f.name} is too large — photograph it instead, or upload a smaller PDF`); continue; }
        out.push({ name: f.name || 'result.jpg', data });
      } catch { toast.error(`Could not read ${f.name}`); }
    }
    setFiles(prev => [...prev, ...out]);
  };

  const onScanned = async (doc: ScannedDocument) => {
    setShowScan(false);
    const pages: Attachment[] = [];
    for (const [i, p] of doc.pages.entries()) {
      try { pages.push({ name: `scan-${i + 1}.jpg`, data: await compressDataUrl(p.imageDataUrl) }); } catch { /* page unreadable — its text is still kept */ }
    }
    setScanned({ pages, text: doc.fullText || doc.pages.map(p => p.ocrText).filter(Boolean).join('\n') });
    if (!resultText.trim() && doc.fullText) setResultText(doc.fullText.slice(0, 2000));
  };

  const send = (body: Omit<LogInput, 'itemKey' | 'itemText' | 'itemKind' | 'location'>) => logAction(planId, {
    itemKey: item.key, itemText: item.text, itemKind: item.kind,
    location: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, label: loc.label, status: loc.status },
    ...body,
  }, user!);

  const save = async (mode: 'status' | 'prescribe' | 'request' | 'result') => {
    if (!user) { toast.error('Sign in to log the implementation'); return; }
    setSaving(true);
    try {
      if (mode === 'prescribe') {
        if (!drug) throw new Error('Choose the drug');
        if (!dose.trim() || !freq) throw new Error('Give the dose and frequency');
        const form = drug.formulations[formIdx];
        const rx = await prescribeForPlanItem({
          patientId, hospitalId, drug, formulation: form, dose: dose.trim(), frequency: freq, duration: duration.trim(),
          instructions: instructions.trim() || undefined, indication: item.text,
        }, user);
        await send({ status: 'prescribed', note: note || null, prescription: {
          drug: drug.genericName, form: form ? form.form : undefined, dose: dose.trim(), route: rx.medications[0].route,
          frequency: freq, frequencyWords: getFrequencyLabel(freq as DrugFrequency), duration: duration.trim(),
          instructions: instructions.trim() || undefined, prescriptionId: rx.id,
        } });
        toast.success(`${drug.genericName} prescribed and logged`);
      } else if (mode === 'request') {
        if (!inv || !invCat) throw new Error('Choose the investigation');
        const created = await requestInvestigationForPlanItem({ patientId, hospitalId, category: invCat, item: inv, priority, clinicalNotes: item.text }, user);
        await send({ status: 'ordered', note: note || null, investigation: {
          category: catalogCat?.title, test: inv.name, code: inv.code, priority, investigationId: created.id,
        } });
        toast.success(`${inv.name} requested and logged`);
        setShowResult(true);
      } else if (mode === 'result') {
        const all = [...files, ...(scanned?.pages || [])];
        if (!resultValue.trim() && !resultText.trim() && !all.length) throw new Error('Enter the result, or snap / scan / upload it');
        const order = lastOrder || (inv ? { test: inv.name, category: catalogCat?.title, code: inv.code } : null);
        const result = { test: order?.test || item.text, value: resultValue.trim() || null, unit: resultUnit.trim() || null,
          text: resultText.trim() || null, ocrText: scanned?.text || null, reference: null };
        await send({ status: 'result_entered', note: note || null, investigation: order, result, attachments: all });
        // Also onto the investigation itself, where the lab views and trends read it.
        if (order && 'investigationId' in order && order.investigationId) {
          await recordInvestigationResult(order.investigationId, result, all, user).catch(() => { /* the log already holds it */ });
        }
        toast.success('Result saved');
      } else {
        await send({ status, note: note.trim() || null });
        toast.success('Logged');
      }
      if (mode !== 'request') onClose();
    } catch (e) {
      toast.error(messageOf(e, 'Could not save'));
    } finally { setSaving(false); }
  };

  const openAttachment = async (id: string) => {
    const a = await getAttachment(id);
    if (!a) { toast.error('The file is not on this device yet — it arrives with the next sync'); return; }
    const w = window.open();
    if (w) {
      w.document.write(a.mime === 'application/pdf'
        ? `<iframe src="${a.data}" style="border:0;width:100%;height:100vh"></iframe>`
        : `<img src="${a.data}" style="max-width:100%">`);
    }
  };

  const sel = 'w-full border rounded-lg px-2 py-2 text-sm bg-white';
  const drugGroups = getDrugCategories();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{item.group} · <span className="capitalize">{item.kind}</span></p>
            <h3 className="font-semibold text-gray-900">{item.text}</h3>
            {item.why && <p className="text-xs text-gray-500">{item.why}</p>}
            <p className="text-xs mt-1">Status: <strong>{state.label}</strong></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Where */}
          <div className="rounded-lg border p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Where</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={PLACES.includes(loc.label.split(' ')[0]) ? loc.label.split(' ')[0] : 'Other'} onChange={e => setLoc(l => ({ ...l, label: e.target.value === 'Ward' && defaultPlace ? defaultPlace : e.target.value }))} className={sel} aria-label="Place">
                {PLACES.map(p => <option key={p}>{p}</option>)}
              </select>
              <input value={loc.label} onChange={e => setLoc(l => ({ ...l, label: e.target.value }))} className={sel} placeholder="e.g. Ward 10, Bed 16" aria-label="Place named" />
            </div>
            <p className="text-[11px] mt-1.5 text-gray-500">
              {loc.status === 'pending' && 'Getting the device location…'}
              {loc.status === 'gps' && `Device location recorded (±${Math.round(loc.accuracy || 0)} m).`}
              {loc.status === 'denied' && 'Location permission was declined — the place named above is recorded.'}
              {loc.status === 'unavailable' && 'Device location unavailable — the place named above is recorded.'}
              {' '}Your name and the time are added from your sign-in.
            </p>
          </div>

          {/* Medication: category → drug */}
          {item.kind === 'medication' && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Prescribe</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="text-xs text-gray-600">Medication category
                  <select value={group} onChange={e => { setGroup(e.target.value as DrugCategory); setDrugId(''); }} className={sel}>
                    <option value="">— choose —</option>
                    {drugGroups.map(g => <option key={g} value={g}>{g} ({getDrugsByCategory(g).length})</option>)}
                  </select>
                </label>
                <label className="text-xs text-gray-600">Drug
                  <select value={drugId} onChange={e => {
                    const d = BNF_DRUG_DATABASE.find(x => x.id === e.target.value);
                    setDrugId(e.target.value); setFormIdx(0);
                    setDose(d?.dosage?.adult?.standard || ''); setFreq(d?.dosage?.adult?.frequency?.[0] || ''); setDuration(d?.dosage?.adult?.duration || '');
                  }} className={sel} disabled={!group}>
                    <option value="">— choose —</option>
                    {(group ? getDrugsByCategory(group) : []).map(d => <option key={d.id} value={d.id}>{d.genericName}</option>)}
                  </select>
                </label>
              </div>
              {drug && (
                <>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <label className="text-xs text-gray-600">Formulation
                      <select value={formIdx} onChange={e => setFormIdx(Number(e.target.value))} className={sel}>
                        {drug.formulations.map((f, i) => <option key={i} value={i}>{f.form} — {f.route}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-gray-600">Dose
                      <input value={dose} onChange={e => setDose(e.target.value)} className={sel} placeholder={drug.dosage?.adult?.standard} />
                    </label>
                    <label className="text-xs text-gray-600">Frequency
                      <select value={freq} onChange={e => setFreq(e.target.value)} className={sel}>
                        <option value="">— choose —</option>
                        {FREQUENCIES.map(f => <option key={f} value={f}>{getFrequencyLabel(f)}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-gray-600">Duration
                      <input value={duration} onChange={e => setDuration(e.target.value)} className={sel} placeholder="e.g. 5 days" />
                    </label>
                  </div>
                  <input value={instructions} onChange={e => setInstructions(e.target.value)} className={sel} placeholder="Instructions (optional)" />
                  {drug.dosage?.adult?.notes && <p className="text-[11px] text-gray-500">Dosing note: {drug.dosage.adult.notes}</p>}
                  {(drug.contraindications || []).length > 0 && <p className="text-[11px] text-amber-800 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Contraindications: {drug.contraindications.slice(0, 4).join('; ')}</p>}
                </>
              )}
              <button onClick={() => save('prescribe')} disabled={saving || !drug} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Prescribe and log
              </button>
            </div>
          )}

          {/* Investigation: category → test, then results */}
          {item.kind === 'investigation' && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-900">{lastOrder ? `Requested: ${lastOrder.test}${lastOrder.priority ? ` (${lastOrder.priority})` : ''}` : 'Request the investigation'}</p>
              {!lastOrder && (
                <>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <label className="text-xs text-gray-600">Category
                      <select value={invCat} onChange={e => { setInvCat(e.target.value as InvestigationCategory); setInvCode(''); }} className={sel}>
                        <option value="">— choose —</option>
                        {INVESTIGATION_CATALOG.map(c => <option key={c.category} value={c.category}>{c.title.replace(/^.*— /, '')}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-gray-600 sm:col-span-2">Investigation
                      <select value={invCode} onChange={e => setInvCode(e.target.value)} className={sel} disabled={!invCat}>
                        <option value="">— choose —</option>
                        {(catalogCat?.groups || []).map(g => (
                          <optgroup key={g.group} label={g.group}>
                            {g.items.map(i => <option key={i.code} value={i.code}>{i.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={priority} onChange={e => setPriority(e.target.value as 'routine' | 'urgent' | 'stat')} className="border rounded-lg px-2 py-2 text-sm" aria-label="Priority">
                      <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option>
                    </select>
                    <button onClick={() => save('request')} disabled={saving || !inv} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Request and log
                    </button>
                  </div>
                </>
              )}

              <button onClick={() => setShowResult(v => !v)} className="text-sm text-green-800 underline">
                {showResult ? 'Hide result entry' : 'Results available? Enter, snap, scan or upload'}
              </button>
              {showResult && (
                <div className="space-y-2 border-t pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input value={resultValue} onChange={e => setResultValue(e.target.value)} className={`${sel} col-span-2`} placeholder="Result value (e.g. 9.8)" />
                    <input value={resultUnit} onChange={e => setResultUnit(e.target.value)} className={sel} placeholder="Unit" />
                  </div>
                  <textarea value={resultText} onChange={e => setResultText(e.target.value)} rows={2} className={sel} placeholder="Report / interpretation (e.g. culture: Staph. aureus, sensitive to …)" />
                  <div className="flex flex-wrap gap-2">
                    <label className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 cursor-pointer hover:bg-gray-50">
                      <Camera className="w-4 h-4" /> Snap
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
                    </label>
                    <button type="button" onClick={() => setShowScan(true)} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 hover:bg-gray-50">
                      <ScanLine className="w-4 h-4" /> Scan pages
                    </button>
                    <label className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 cursor-pointer hover:bg-gray-50">
                      <FileUp className="w-4 h-4" /> Upload
                      <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
                    </label>
                  </div>
                  {scanned && <p className="text-xs text-gray-600">{scanned.pages.length} scanned page(s); text read from them is kept with the result.</p>}
                  {files.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {files.map((f, i) => (
                        <li key={i} className="flex items-center gap-2"><Paperclip className="w-3.5 h-3.5" /> {f.name}
                          <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-red-700 underline">remove</button></li>
                      ))}
                    </ul>
                  )}
                  <button onClick={() => save('result')} disabled={saving} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save result
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Every item can be marked done / not done */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-900">{item.kind === 'medication' || item.kind === 'investigation' ? 'Or record the outcome' : 'Record the implementation'}</p>
            <div className="flex flex-wrap gap-2">
              {[['done', 'Done'], ['partial', 'Partly done'], ['not_done', 'Not done'], ['cancelled', 'Cancelled']].map(([v, l]) => (
                <button key={v} onClick={() => setStatus(v)} className={`px-3 py-1.5 rounded-full text-sm border ${status === v ? 'bg-green-700 text-white border-green-700' : 'bg-white'}`}>{l}</button>
              ))}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={sel}
              placeholder={['partial', 'not_done', 'cancelled'].includes(status) ? 'Why? (required)' : 'Note (optional) — what was done, findings'} />
            <button onClick={() => save('status')} disabled={saving} className="px-4 py-2 border border-green-700 text-green-800 rounded-lg text-sm disabled:opacity-50">
              Save
            </button>
          </div>

          {/* History */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Log ({actions.length})</p>
            {actions.length === 0 && <p className="text-xs text-gray-500">Nothing logged yet.</p>}
            <ul className="space-y-2">
              {actions.map(a => (
                <li key={a.id} className="text-xs border rounded-lg p-2">
                  <p><strong className="capitalize">{a.status.replace(/_/g, ' ')}</strong> · {a.userName || 'Unknown'}{a.userRole ? ` (${a.userRole.replace(/_/g, ' ')})` : ''} · {new Date(a.loggedAt).toLocaleString()}</p>
                  <p className="text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{a.locationLabel || 'Place not named'}
                    {a.latitude != null && a.longitude != null && (
                      <a className="underline ml-1" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}>map (±{Math.round(a.accuracyM || 0)} m)</a>
                    )}</p>
                  {a.prescription && <p>Rx: {a.prescription.drug} {a.prescription.dose} {a.prescription.route} {String(a.prescription.frequency || '').toUpperCase()}{a.prescription.duration ? ` × ${a.prescription.duration}` : ''}</p>}
                  {a.investigation && a.status === 'ordered' && <p>Requested: {a.investigation.test} ({a.investigation.priority})</p>}
                  {a.result && <p>Result: {[a.result.value, a.result.unit].filter(Boolean).join(' ')}{a.result.text ? ` — ${a.result.text}` : ''}</p>}
                  {a.note && <p className="text-gray-700">“{a.note}”</p>}
                  {(a.attachments || []).map(f => (
                    <button key={f.id} onClick={() => openAttachment(f.id)} className="mr-2 underline text-green-800 inline-flex items-center gap-1"><Paperclip className="w-3 h-3" />{f.name}</button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {showScan && (
        <DocumentScanner patientId={patientId} hospitalId={hospitalId} onClose={() => setShowScan(false)} onSaved={doc => { void onScanned(doc); }} />
      )}
    </div>
  );
}
