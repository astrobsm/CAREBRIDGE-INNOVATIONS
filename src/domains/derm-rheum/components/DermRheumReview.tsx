/**
 * "Dermatology & Rheumatology review": the deterministic guidance (screen,
 * candidates with their knowledge-base entries, hard rules, score tools) is
 * shown at once and free. Claude is asked ONLY when the clinician presses
 * "Ask Claude" (runConsult): nothing here calls it on render or in an
 * effect. Its consult is labelled AI-drafted, checked against the hard
 * rules, saved on the plan record, and its lines are accepted line by line.
 */
import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { AlertTriangle, Camera, ChevronDown, FileDown, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { AsyncButton, LongTaskProgress, SkeletonText, useActionStatus } from '../../../components/motion';
import type { ClerkingData } from '../../clinical/clerking/types';
import type { PatientContext } from '../../clinical/clerking/engine';
import type { ClerkingPlanRecord } from '../../clinical/clerkingPlan/records';
import { decide, decisionFor, isIncluded } from '../../clinical/clerkingPlan/finalPlan';
import { getPlan, updatePlan } from '../../clinical/clerkingPlan/service';
import { actorOf } from '../../clinical/services/clerkingService';
import { PLAN_SECTIONS, type PlanLine } from '../../clinical/clerkingPlan/types';
import { AI_MAX_IMAGES } from '../../../services/aiProxy';
import { KB_BY_ID, KB_VERSION, KB_CATEGORY_LABEL, SPECIALTY_LABEL } from '../kb';
import { SCORE_TOOL_BY_ID, SCORE_TOOLS, type ScoreTool } from '../scores';
import { SCREEN_PENDING, SCREEN_VERSION, abcdeFromFeatures, paracelsusFromFeatures, sscFromFeatures } from '../screen';
import { deterministicReview } from '../review';
import { requestDermRheumConsult } from '../consult';
import { latestConsult, type DermRheumConsultRecord } from '../store';

export interface DermRheumReviewProps {
  patientId: string;
  data: ClerkingData;
  ctx: PatientContext;
  identifiers?: string[];
  record: ClerkingPlanRecord | null | undefined;
  /** Create / save the plan record the consult is stored on. */
  ensurePlan: () => Promise<ClerkingPlanRecord | null>;
  planHardRules?: string[];
  inputsHash?: string;
  /** Results already entered: label → "value unit". */
  results?: Record<string, string>;
  /** Patient and hospital, for the PDFs. */
  patientInfo?: { name: string; hospitalNumber: string; age?: number; gender?: string };
  hospitalName?: string;
}

const STATUS_STYLE = { ok: 'text-green-800 bg-green-50 border-green-200', omitted: 'text-amber-900 bg-amber-50 border-amber-300', contradicted: 'text-red-800 bg-red-50 border-red-300' } as const;
const STATUS_TEXT = { ok: 'Respected', omitted: 'Not addressed by the AI draft', contradicted: 'CONTRADICTED by the AI draft' } as const;

const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

/** Points to show beside an item (none for the entry criterion or per-set weights). */
const pointsOf = (it: { id: string; points?: number; weights?: Record<string, number> }): number | null => (it.weights || !it.points ? null : it.points);

const ToolCard: React.FC<{ tool: ScoreTool; initial: string[] }> = ({ tool, initial }) => {
  const [checked, setChecked] = useState<string[]>(initial);
  const result = tool.compute(checked);
  const toggle = (id: string) => setChecked(c => (tool.single ? (c.includes(id) ? [] : [id]) : c.includes(id) ? c.filter(x => x !== id) : [...c, id]));
  const all = tool.entry ? [tool.entry, ...tool.items] : tool.items;
  return (
    <details className="rounded-lg border border-gray-200 bg-white" data-testid={`tool-${tool.id}`} open={initial.length > 0}>
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-900 flex items-center justify-between gap-2">
        <span>{tool.name}{tool.kind === 'classification' && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-medium">classification, not diagnosis</span>}</span>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] ${result.met ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{result.total}</span>
      </summary>
      <div className="px-3 pb-3 space-y-1.5">
        <ul className="space-y-1">
          {all.map(it => (
            <li key={it.id}>
              <label className="flex items-start gap-2 text-[12px] text-gray-800 min-h-[32px]">
                <input type={tool.single ? 'radio' : 'checkbox'} name={tool.id} className="mt-0.5" checked={checked.includes(it.id)} onChange={() => toggle(it.id)} />
                <span className="flex-1">{it.label}</span>
                {pointsOf(it) ? <span className="text-gray-400">{pointsOf(it)! > 0 ? `+${pointsOf(it)}` : pointsOf(it)}</span> : null}
              </label>
            </li>
          ))}
        </ul>
        <p className="text-xs font-semibold text-indigo-900" data-testid={`tool-${tool.id}-band`}>{result.band}</p>
        {result.detail.map(d => <p key={d} className="text-[11px] text-gray-600">{d}</p>)}
        <p className="text-[11px] text-gray-600">{tool.caveat}</p>
        {tool.pendingValidation && <p className="text-[11px] text-amber-800">Pending clinical validation: {tool.pendingValidation}</p>}
        <p className="text-[10px] text-gray-400">{tool.source}</p>
      </div>
    </details>
  );
};

const KbCard: React.FC<{ id: string; why: string[]; mustNotMiss: boolean; score: number }> = ({ id, why, mustNotMiss, score }) => {
  const kb = KB_BY_ID[id];
  if (!kb) return null;
  const L = (t: string, items: string[]) => items.length ? <div><p className="text-[11px] font-semibold text-gray-700">{t}</p><ul className="list-disc pl-4 text-[11px] text-gray-700 space-y-0.5">{items.map(x => <li key={x}>{x}</li>)}</ul></div> : null;
  return (
    <details className="rounded-lg border border-gray-200 bg-white" data-testid="kb-candidate" data-kb={id}>
      <summary className="cursor-pointer px-3 py-2 flex items-center gap-2">
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{kb.label}{mustNotMiss && <span className="ml-1 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px]">must not miss</span>}</span>
          <span className="block text-[11px] text-gray-500">{KB_CATEGORY_LABEL[kb.category]} · {why.join(', ') || 'consider'} · {score} pt</span>
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
      </summary>
      <div className="px-3 pb-3 space-y-2">
        {kb.warnings.map(w => <p key={w} className="text-[12px] font-semibold text-red-800 flex gap-1"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{w}</p>)}
        {L('History', kb.history)}{L('Examination', kb.exam)}{L('On dark skin', kb.skinOfColour)}{L('Red flags', kb.redFlags)}
        {kb.criteria && <p className="text-[11px] text-gray-700"><span className="font-semibold">Criteria:</span> {kb.criteria.name}{kb.criteria.classificationOnly ? ' (classification, not diagnosis)' : ''}</p>}
        {kb.biopsy && <p className="text-[11px] text-gray-700"><span className="font-semibold">Biopsy:</span> {kb.biopsy.type}. Site: {kb.biopsy.site}. {kb.biopsy.handling}</p>}
        {L('Investigations', kb.investigations.map(i => `${i.text}${i.catalogueCode ? ` [${i.catalogueCode}]` : ''}`))}
        {L('Immediate', kb.management.immediate)}{L('Definitive', kb.management.definitive)}{L('Do not', kb.doNot)}
        {L('Refer', kb.refer.map(r => `${SPECIALTY_LABEL[r.to]} (${r.urgency}): ${r.when}`))}
        {kb.pendingValidation.length > 0 && L('Pending clinical validation', kb.pendingValidation)}
        <details><summary className="text-[11px] text-indigo-700 cursor-pointer">Sources ({kb.sources.length})</summary>{L('', kb.sources)}</details>
      </div>
    </details>
  );
};

export const DermRheumReview: React.FC<DermRheumReviewProps> = p => {
  const { user } = useAuth();
  const review = useMemo(() => deterministicReview(p.data, p.ctx), [p.data, p.ctx]);
  const [showAllTools, setShowAllTools] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [run, setRun] = useState<{ state: 'idle' | 'loading' | 'error'; stage?: number; message?: string }>({ state: 'idle' });
  const status = useActionStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const consult = latestConsult(p.record?.dermRheum);
  const stale = !!consult && !!p.inputsHash && consult.inputsHash !== p.inputsHash;
  const decisions = p.record?.decisions ?? [];

  const prefill: Record<string, string[]> = {
    paracelsus: paracelsusFromFeatures(review.features), ssc2013: sscFromFeatures(review.features), abcde: abcdeFromFeatures(review.features),
  };
  const tools = showAllTools ? SCORE_TOOLS.map(t => t.id) : review.tools;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = AI_MAX_IMAGES - photos.length;
    const next = await Promise.all([...files].slice(0, room).map(readFile));
    setPhotos(ps => [...ps, ...next].slice(0, AI_MAX_IMAGES));
    if (files.length > room) toast(`Up to ${AI_MAX_IMAGES} photos per review`);
  };

  /** The ONLY path to Claude: the button below. */
  const runConsult = async () => {
    if (!navigator.onLine) { setRun({ state: 'error', message: 'Offline — Claude needs a connection. The knowledge-base guidance above is complete without it.' }); return; }
    status.start();
    setRun({ state: 'loading', stage: 0 });
    const rec = await p.ensurePlan();
    if (!rec) { setRun({ state: 'idle' }); status.reset(); return; }
    setRun({ state: 'loading', stage: 1 });
    const res = await requestDermRheumConsult({ data: p.data, ctx: p.ctx, review, planHardRules: p.planHardRules, description, results: p.results, identifiers: p.identifiers, weightKg: Number(p.data.vitals?.weight) || null }, photos);
    if (res.status === 'error') { setRun({ state: 'error', message: res.message }); status.error(); return; }
    setRun({ state: 'loading', stage: 2 });
    const saved: DermRheumConsultRecord = {
      id: uuidv4(), at: new Date().toISOString(), by: user?.id, byName: user ? actorOf(user).name : undefined,
      kbVersion: KB_VERSION, screenVersion: SCREEN_VERSION, inputsHash: p.inputsHash ?? '', photosSent: res.photosSent, description: description.trim() || undefined,
      deterministic: { flags: review.screen.flags, candidates: review.screen.candidates, hardRules: review.hardRules },
      consult: res.value, lines: res.lines, checks: res.checks, missingHardRules: res.missingHardRules,
    };
    const latest = (await getPlan(rec.id)) ?? rec;
    await updatePlan(rec.id, { dermRheum: [...(latest.dermRheum ?? []), saved] });
    setRun({ state: 'idle' });
    status.done();
    toast.success('Claude drafted the derm & rheum review — check each line before accepting it');
  };

  const onDecide = async (line: PlanLine, d: 'accepted' | 'rejected' | null) => {
    const rec = p.record ?? await p.ensurePlan();
    if (!rec) return;
    const latest = (await getPlan(rec.id)) ?? rec;
    const next = d === null ? latest.decisions.filter(x => x.lineId !== line.id) : decide(latest.decisions, { lineId: line.id, decision: d, by: user?.id, at: new Date().toISOString() });
    await updatePlan(rec.id, { decisions: next });
  };

  const download = async (audience: 'clinician' | 'patient') => {
    if (!consult) return;
    const [{ buildConsultClinicianDocument, buildConsultPatientDocument }, { renderPlanDocument }] = await Promise.all([import('../pdf'), import('../../clinical/clerkingPlan/pdf')]);
    const input = { record: consult, patient: p.patientInfo ?? { name: 'Patient', hospitalNumber: '' }, hospitalName: p.hospitalName, date: new Date() };
    const d = audience === 'clinician' ? buildConsultClinicianDocument(input) : buildConsultPatientDocument(input);
    renderPlanDocument(d).save(d.fileName);
  };

  const s = review.screen;
  return (
    <div className="space-y-3 text-sm" data-testid="derm-rheum-review">
      <div>
        <h3 className="font-bold text-gray-900">Dermatology &amp; Rheumatology review</h3>
        <p className="text-[11px] text-gray-500">Knowledge base v{KB_VERSION} · guidance below is rule-based, free and works offline. {SCREEN_PENDING}</p>
      </div>

      <section aria-label="Atypical ulcer screen" className={`rounded-lg border p-2 ${s.atypical ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`} data-testid="derm-screen">
        <p className="text-xs font-semibold text-gray-900">{s.atypical ? 'Atypical ulcer screen: derm / rheum work-up advised' : s.flags.length ? 'Screen: features to act on' : 'Screen: no atypical feature recorded yet'}</p>
        {s.flags.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{s.flags.map(f => <span key={f.id} className={`px-2 py-0.5 rounded-full text-[11px] border ${f.kind === 'emergency' ? 'bg-red-600 text-white border-red-600' : f.kind === 'malignancy' ? 'bg-rose-50 border-rose-300 text-rose-800' : f.kind === 'infection' ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-orange-300 text-orange-900'}`}>{f.text}</span>)}</div>}
        {!review.features.documented && <p className="text-[11px] text-gray-600 mt-1">Document the ulcer or lesion (add the "Atypical ulcer / possible inflammatory cause" condition to the clerking) for a fuller screen.</p>}
      </section>

      {review.hardRules.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-2" data-testid="derm-hard-rules">
          <p className="text-xs font-semibold text-red-800 flex items-center gap-1"><ShieldAlert size={14} /> Hard rules — always apply</p>
          <ul className="list-disc pl-4 text-[12px] text-red-900 space-y-0.5">{review.hardRules.map(r => <li key={r.id}>{r.text} <span className="text-red-700/80">(because: {r.because})</span></li>)}</ul>
        </div>
      )}

      <section aria-label="Conditions to consider" className="space-y-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Conditions to consider ({s.candidates.length})</h4>
        {s.candidates.length ? s.candidates.map(c => <KbCard key={c.id} id={c.id} why={c.why} mustNotMiss={c.mustNotMiss} score={c.score} />) : <p className="text-[12px] text-gray-600">No knowledge-base condition matches the documented features yet.</p>}
      </section>

      <section aria-label="Scores and criteria" className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Scores and criteria</h4>
          <button type="button" className="text-[11px] text-indigo-700 underline min-h-[32px]" onClick={() => setShowAllTools(v => !v)}>{showAllTools ? 'Relevant only' : 'All tools'}</button>
        </div>
        {tools.length ? tools.map(id => SCORE_TOOL_BY_ID[id] && <ToolCard key={id} tool={SCORE_TOOL_BY_ID[id]} initial={prefill[id] ?? []} />) : <p className="text-[12px] text-gray-600">No tool applies yet — tap "All tools".</p>}
      </section>

      <section aria-label="Claude review" className="rounded-lg border border-purple-300 bg-purple-50 p-2 space-y-2">
        <label className="block text-xs font-semibold text-purple-900" htmlFor="dr-desc">Extra description for Claude (optional)</label>
        <textarea id="dr-desc" rows={2} className="w-full border rounded px-2 py-1.5 text-[13px]" placeholder="e.g. edge, colour on this skin, what has been tried" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((ph, i) => (
            <span key={i} className="relative">
              <img src={ph} alt={`Lesion photo ${i + 1}`} className="h-14 w-14 object-cover rounded border" />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-white border rounded-full p-0.5"><X size={12} /></button>
            </span>
          ))}
          {photos.length < AI_MAX_IMAGES && (
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-purple-400 bg-white text-purple-800 text-xs min-h-[40px]"><Camera size={16} /> Add photo ({photos.length}/{AI_MAX_IMAGES})</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={e => { addPhotos(e.target.files); e.target.value = ''; }} data-testid="dr-photo-input" />
        </div>
        <p className="text-[11px] text-purple-900">Photos and the clerking are sent to Claude <strong>without the patient's name, hospital number or phone</strong>. Claude runs only when you press the button; each review has a cost.</p>
        <AsyncButton type="button" onClick={runConsult} status={status.status} workingLabel="Claude is reviewing…" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]" data-testid="ask-claude-derm">
          <Sparkles size={16} /> {consult ? 'Ask Claude again' : 'Ask Claude for a derm & rheum review'}
        </AsyncButton>
        {run.state === 'loading' && (
          <div className="space-y-2" data-testid="derm-progress">
            <LongTaskProgress tone="purple" label="Claude is reviewing…" stages={['Saving the plan', photos.length ? 'Reading the photos and the clerking' : 'Reading the clerking', 'Checking against the hard rules']} current={run.stage ?? 0}
              hint={run.stage === 1 ? 'Usually 20–60 seconds. The guidance above is already complete.' : undefined} />
            <SkeletonText lines={3} />
          </div>
        )}
        {run.state === 'error' && <p className="text-[12px] text-amber-900" data-testid="derm-error">{run.message}</p>}
      </section>

      {consult && (
        <section aria-label="AI-drafted consult" className="rounded-lg border-2 border-purple-400 bg-white p-2 space-y-2" data-testid="derm-consult">
          <p className="text-xs font-bold text-purple-900">AI-drafted — check before use <span className="font-normal text-purple-800">· {new Date(consult.at).toLocaleString()} · urgency {consult.consult.urgency} · confidence {consult.consult.confidence}{consult.photosSent ? ` · ${consult.photosSent} photo(s)` : ''}</span>
            {stale && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">Stale: the clerking changed after this review</span>}</p>
          <p className="text-[13px] text-gray-900">{consult.consult.summary}</p>
          {consult.checks.filter(c => c.status !== 'ok').length > 0 && (
            <ul className="space-y-1" data-testid="derm-rule-checks">
              {consult.checks.filter(c => c.status !== 'ok').map(c => <li key={c.rule.id} className={`rounded border px-2 py-1 text-[12px] ${STATUS_STYLE[c.status]}`}><strong>{STATUS_TEXT[c.status]}:</strong> {c.rule.text}{c.detail ? ` — ${c.detail}` : ''}</li>)}
            </ul>
          )}
          {consult.missingHardRules.length > 0 && <p className="text-[11px] text-red-700">The draft did not restate {consult.missingHardRules.length} hard rule(s) verbatim; they still apply.</p>}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Differential</h4>
            <ol className="list-decimal pl-5 space-y-1">{consult.consult.differential.map(d => (
              <li key={d.diagnosis} className="text-[12px] text-gray-800"><strong>{d.diagnosis}</strong> <span className="text-gray-500">({d.likelihood})</span> — {d.reasoning}
                {d.supporting.length > 0 && <span className="block text-green-800">For: {d.supporting.join('; ')}</span>}
                {d.against.length > 0 && <span className="block text-rose-800">Against: {d.against.join('; ')}</span>}</li>
            ))}</ol>
          </div>
          {consult.consult.mustNotMiss.length > 0 && <p className="text-[12px] text-red-800"><strong>Must not miss:</strong> {consult.consult.mustNotMiss.map(m => `${m.diagnosis} (${m.howToExclude || m.why})`).join('; ')}</p>}
          {consult.consult.photoObservations.length > 0 && <p className="text-[12px] text-gray-700"><strong>Photos:</strong> {consult.consult.photoObservations.join(' ')}</p>}
          {consult.consult.wouldChangeConfidence.length > 0 && <p className="text-[12px] text-gray-700"><strong>Would change confidence:</strong> {consult.consult.wouldChangeConfidence.join('; ')}</p>}

          <div className="space-y-2" data-testid="derm-lines">
            <p className="text-[11px] text-gray-600">Accept a line to add it to the treatment plan.</p>
            {PLAN_SECTIONS.map(sec => {
              const ls = consult.lines.filter(l => l.section === sec.id);
              if (!ls.length) return null;
              return (
                <div key={sec.id}>
                  <h5 className="text-[11px] font-semibold uppercase text-gray-500">{sec.label}</h5>
                  <ul className="space-y-1">{ls.map(l => {
                    const inc = isIncluded(l, decisions), d = decisionFor(decisions, l.id)?.decision;
                    return (
                      <li key={l.id} className={`flex items-start gap-2 rounded border px-2 py-1.5 text-[12px] ${inc ? 'border-purple-300 bg-purple-50' : 'border-dashed border-gray-300'}`} data-testid="derm-line">
                        <span className="flex-1">{l.urgency === 'urgent' && <span className="text-red-700 font-semibold">URGENT · </span>}{l.text}{l.why && <span className="block text-[11px] text-gray-500">Why: {l.why}</span>}</span>
                        <button type="button" aria-label="Accept" onClick={() => onDecide(l, inc ? null : 'accepted')} className={`px-2 py-1 rounded border min-w-[36px] min-h-[32px] ${inc ? 'bg-green-600 text-white border-green-600' : 'border-green-600 text-green-700'}`}>✓</button>
                        <button type="button" aria-label="Reject" onClick={() => onDecide(l, d === 'rejected' ? null : 'rejected')} className={`px-2 py-1 rounded border min-w-[36px] min-h-[32px] ${d === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'border-red-300 text-red-600'}`}>✕</button>
                      </li>
                    );
                  })}</ul>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => download('clinician')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-indigo-500 text-indigo-700 text-xs min-h-[40px]" data-testid="derm-pdf-clinician"><FileDown size={14} /> Consult PDF (clinician)</button>
            <button type="button" onClick={() => download('patient')} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-emerald-500 text-emerald-700 text-xs min-h-[40px]" data-testid="derm-pdf-patient"><FileDown size={14} /> Patient leaflet</button>
          </div>
        </section>
      )}
    </div>
  );
};

export default DermRheumReview;
