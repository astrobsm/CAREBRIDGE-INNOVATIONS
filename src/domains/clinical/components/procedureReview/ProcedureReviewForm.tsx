/**
 * The procedure review form: choose the phase and the procedure, then
 *
 *   Assessment → Scores & risks → Plan → Counselling & consent → Review & sign
 *
 * Everything below the picker is live: the engine re-reads the answers on
 * every tap, so flags, scores, the drafted plan and the consent form are
 * always what the answers produce. Nothing is mandatory; an interrupted
 * clinician saves what they have. Phone-first: one column, large tap targets,
 * a sticky step bar.
 *
 * Reuses, rather than re-implements: the field renderer and flag banner of
 * the guided history, the scribe's PlanView and approval queue, the clerking
 * lifecycle (via procedureReviewService), the WoundProgress Monitor's
 * measurements and the shared PDF / WhatsApp utilities.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Download, ExternalLink, FileSignature, Loader2,
  Ruler, Save, Send, Share2, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import type { Patient } from '../../../../types';
import type { EncounterAnswers } from '../../data/encounterModel';
import { isVisible } from '../../services/templateEngine';
import { EncounterFieldInput } from '../EncounterFieldInput';
import { FlagBanner } from '../FlagBanner';
import { PlanView } from '../scribe/ScribeTreatmentPlanPanel';
import { actorOf } from '../../services/clerkingService';
import { canSign, messageOf } from '../../clerking/lifecycle';
import { canLog } from '../../scribe/approval';
import { getModule, modulesByGroup } from '../../procedureReview/registry';
import { REVIEW_PHASES, phaseDefinition } from '../../procedureReview/phases';
import { computeReview } from '../../procedureReview/compute';
import { reviewPatientFrom } from '../../procedureReview/engine';
import { carriedForward, priorReviewsFrom } from '../../procedureReview/records';
import { counsellingGaps, emptyCounselling } from '../../procedureReview/consent';
import { getProcedureReviewPDFDoc, generateProcedureReviewPDF } from '../../procedureReview/pdf';
import { answersFromWoundAssessment, describeAssessment } from '../../procedureReview/woundLink';
import {
  markReviewInError, saveReview, submitReview, submitReviewPlan, type ReviewedEncounter,
} from '../../procedureReview/procedureReviewService';
import type { CounsellingRecord, ReviewPhase } from '../../procedureReview/types';
import { getWoundTimeline, listWounds } from '../../../wounds/services/woundMonitorService';
import type { WoundAssessment } from '../../../wounds/monitorTypes';
import { sharePDFOnWhatsApp } from '../../../../utils/whatsappShareUtils';

type Step = 'assessment' | 'scores' | 'plan' | 'consent' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'assessment', label: 'Assessment' },
  { id: 'scores', label: 'Scores & risks' },
  { id: 'plan', label: 'Plan' },
  { id: 'consent', label: 'Counselling & consent' },
  { id: 'review', label: 'Review & sign' },
];

export interface ProcedureReviewFormProps {
  patient: Patient;
  /** All of the patient's encounters that carry a review (newest first). */
  reviews: ReviewedEncounter[];
  /** Open an existing review. */
  existing?: ReviewedEncounter;
  initialPhase?: ReviewPhase;
  initialModuleId?: string;
  hospitalId?: string;
  hospitalName?: string;
  onSaved?: (enc: ReviewedEncounter) => void;
}

const ageOf = (p: Patient) => reviewPatientFrom(p, new Date()).ageYears ?? undefined;

export const ProcedureReviewForm: React.FC<ProcedureReviewFormProps> = ({
  patient, reviews, existing, initialPhase, initialModuleId, hospitalId, hospitalName, onSaved,
}) => {
  const { user } = useAuth();
  const actor = user ? actorOf(user) : null;
  const stored = existing?.procedureReview;

  // From the URL (?module=…&phase=…): a module without a phase opens at its first phase;
  // an unknown module, or a phase it does not have, falls back to the picker.
  const linked = !stored && initialModuleId ? getModule(initialModuleId) : undefined;
  const linkedPhase = linked && (!initialPhase || linked.phases.includes(initialPhase)) ? initialPhase ?? linked.phases[0] : undefined;
  const [phase, setPhase] = useState<ReviewPhase | null>(stored?.phase ?? linkedPhase ?? initialPhase ?? null);
  const [moduleId, setModuleId] = useState<string | null>(stored?.moduleId ?? (linkedPhase ? linked!.id : null));
  const [answers, setAnswers] = useState<EncounterAnswers>(stored?.answers ?? {});
  const [otherText, setOtherText] = useState<Record<string, string>>(stored?.otherText ?? {});
  const [excluded, setExcluded] = useState<Set<string>>(new Set(stored?.planEdits?.excluded ?? []));
  const [additions, setAdditions] = useState((stored?.planEdits?.additions ?? []).join('\n'));
  const [counselling, setCounselling] = useState<CounsellingRecord>(stored?.counselling ?? emptyCounselling());
  const [step, setStep] = useState<Step>('assessment');
  const [enc, setEnc] = useState<ReviewedEncounter | undefined>(existing);
  const [busy, setBusy] = useState<string | null>(null);
  const [linkedWoundId, setLinkedWoundId] = useState<string | undefined>(stored?.linkedWoundId);
  const [latestWound, setLatestWound] = useState<{ woundId: string; label: string; assessment: WoundAssessment } | null>(null);

  const module = moduleId ? getModule(moduleId) : undefined;
  const prior = useMemo(() => priorReviewsFrom(reviews, enc?.id), [reviews, enc?.id]);
  const reviewPatient = useMemo(() => reviewPatientFrom(patient, new Date()), [patient]);
  const pdfPatient = useMemo(() => ({
    name: `${patient.firstName} ${patient.lastName}`.trim(), hospitalNumber: patient.hospitalNumber,
    age: ageOf(patient), gender: patient.gender, phone: patient.phone,
  }), [patient]);
  const review = enc?.procedureReview;
  const locked = !!review && !['draft', 'pending_review'].includes(review.status);

  // Start a new review with what an earlier review of this procedure already recorded.
  useEffect(() => {
    if (!module || stored) return;
    const carried = carriedForward(module, prior);
    if (Object.keys(carried).length) setAnswers(a => ({ ...carried, ...a }));
  }, [module?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const computed = useMemo(() => {
    if (!module || !phase || !module.phases.includes(phase)) return null;
    return computeReview({
      module, phase, answers, otherText, patient: reviewPatient, prior,
      planEdits: { excluded: [...excluded], additions: additions.split('\n').map(s => s.trim()).filter(Boolean) },
      counselling, pdfPatient, clinician: { id: actor?.id ?? '', name: actor?.name, role: actor?.role as string | undefined },
      hospitalName, now: new Date().toISOString(),
    });
  }, [module, phase, answers, otherText, reviewPatient, prior, excluded, additions, counselling, pdfPatient, actor?.id, actor?.name, actor?.role, hospitalName]);

  // Offer the latest WoundProgress Monitor measurement when the review asks about a wound.
  const asksWound = !!computed?.reading.template.sections.some(s => s.coreId === 'wound_assessment');
  useEffect(() => {
    let cancelled = false;
    if (!asksWound) { setLatestWound(null); return; }
    (async () => {
      const wounds = await listWounds(patient.id);
      for (const w of wounds) {
        const [latest] = await getWoundTimeline(w.id);
        if (latest && !cancelled) {
          setLatestWound({ woundId: w.id, label: [w.label, w.anatomicalLocation].filter(Boolean).join(' — ') || 'Wound', assessment: latest });
          return;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [asksWound, patient.id]);

  const setAnswer = (id: string, v: EncounterAnswers[string]) => setAnswers(a => ({ ...a, [id]: v }));
  const toggle = (k: string) => setExcluded(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // ── Saving ────────────────────────────────────────────────────────────────

  const save = async (): Promise<ReviewedEncounter | null> => {
    if (!user || !module || !phase) return null;
    setBusy('save');
    try {
      const saved = await saveReview({
        id: enc?.id, version: enc?.procedureReview.version, patientId: patient.id, hospitalId,
        moduleId: module.id, phase, answers, otherText,
        planEdits: { excluded: [...excluded], additions: additions.split('\n').map(s => s.trim()).filter(Boolean) },
        counselling, pdfPatient, hospitalName, linkedWoundId,
      }, user);
      setEnc(saved);
      onSaved?.(saved);
      toast.success('Review saved');
      return saved;
    } catch (e) { toast.error(messageOf(e, 'Could not save the review')); return null; }
    finally { setBusy(null); }
  };

  const submit = async () => {
    if (!user) return;
    const saved = await save();
    if (!saved) return;
    setBusy('submit');
    try {
      const done = await submitReview(saved.id, saved.procedureReview.version, user, canSign(actor));
      setEnc(done);
      onSaved?.(done);
      toast.success(done.procedureReview.status === 'signed' ? 'Review signed' : 'Submitted for review');
    } catch (e) { toast.error(messageOf(e, 'Could not submit the review')); }
    finally { setBusy(null); }
  };

  const sendPlan = async () => {
    if (!user) return;
    const saved = locked ? enc! : await save();
    if (!saved) return;
    setBusy('plan');
    try {
      const done = await submitReviewPlan(saved.id, user);
      setEnc(done);
      onSaved?.(done);
      toast.success('Plan sent for consultant approval');
    } catch (e) { toast.error(messageOf(e, 'Could not submit the plan')); }
    finally { setBusy(null); }
  };

  const markError = async () => {
    if (!user || !enc) return;
    const reason = window.prompt('Why is this review being marked entered in error?');
    if (!reason) return;
    try {
      const done = await markReviewInError(enc.id, user, reason);
      setEnc(done);
      onSaved?.(done);
      toast.success('Marked entered in error');
    } catch (e) { toast.error(messageOf(e, 'Could not mark the review')); }
  };

  const pdfInput = () => computed && module && phase ? {
    module, phase, reading: computed.reading, patient: pdfPatient, hospitalName, date: new Date(),
    review: {
      plan: computed.plan, counselling: computed.counselling, counsellingPoints: computed.generated.counselling,
      consent: computed.consent, followUp: computed.generated.followUp, templateVersion: review?.templateVersion ?? 'draft',
      status: review?.status ?? 'draft', signedByName: review?.signedByName, signedAt: review?.signedAt,
      createdByName: review?.createdByName ?? actor?.name,
    },
  } : null;

  const exportPdf = () => { const i = pdfInput(); if (i) generateProcedureReviewPDF(i); };
  const sharePdf = async () => {
    const i = pdfInput();
    if (!i) return;
    const doc = getProcedureReviewPDFDoc(i);
    await sharePDFOnWhatsApp(doc.output('blob'), `${module!.id}-${phase}.pdf`, patient.phone);
  };

  // ── Picker ────────────────────────────────────────────────────────────────

  if (!phase || !module || !computed) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">What kind of review?</h3>
          <div className="grid grid-cols-2 gap-2">
            {REVIEW_PHASES.map(p => (
              <button key={p.id} type="button" onClick={() => { setPhase(p.id); if (module && !module.phases.includes(p.id)) setModuleId(null); }}
                className={`text-left p-3 rounded-lg border text-sm ${phase === p.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-indigo-50 border-gray-200'}`}>
                <span className="font-medium block">{p.label}</span>
                <span className={`text-xs ${phase === p.id ? 'text-indigo-100' : 'text-gray-500'}`}>{p.description}</span>
              </button>
            ))}
          </div>
        </div>
        {phase && (
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Which procedure?</h3>
            {modulesByGroup(phase).map(g => (
              <div key={g.group}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{g.label}</p>
                <div className="space-y-1.5">
                  {g.modules.map(m => (
                    <button key={m.id} type="button" onClick={() => { setModuleId(m.id); setStep('assessment'); }}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50">
                      <span className="text-sm font-medium text-gray-900 block">{m.name}</span>
                      <span className="text-xs text-gray-500">{m.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!modulesByGroup(phase).length && <p className="text-sm text-gray-500">No procedure templates for this phase yet.</p>}
          </div>
        )}
      </div>
    );
  }

  const { reading, plan, consent } = computed;
  const stepIndex = STEPS.findIndex(s => s.id === step);
  const gaps = counsellingGaps(computed.counselling, consent);
  const setC = (patch: Partial<CounsellingRecord>) => setCounselling(c => ({ ...c, ...patch }));

  return (
    <div className="space-y-3 pb-24">
      {/* Header */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs text-gray-500">{phaseDefinition(phase).label}</p>
            <p className="text-base font-semibold text-gray-900">{module.name}</p>
            {!enc && (
              <button type="button" onClick={() => { setModuleId(null); setAnswers({}); }} className="text-xs text-indigo-600 hover:underline">Change</button>
            )}
          </div>
          <div className="text-right text-xs text-gray-500">
            {review ? <span className="font-medium text-gray-700">{review.status.replace(/_/g, ' ')} · v{review.version}</span> : 'Not saved yet'}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${reading.completeness.percent}%` }} />
          </div>
          <span className="text-xs text-gray-500 tabular-nums">{reading.completeness.answered}/{reading.completeness.total} key fields</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Follows: {module.basis.join('; ')}</p>
      </div>

      {/* Step bar */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur py-1 -mx-1 px-1 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {STEPS.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setStep(s.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border ${step === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'}`}>
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>

      <FlagBanner flags={reading.flags} />

      {/* 1. Assessment */}
      {step === 'assessment' && (
        <>
          {latestWound && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-sm text-sky-900 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><Ruler className="w-4 h-4" /> WoundProgress Monitor: {latestWound.label} — {describeAssessment(latestWound.assessment)}</span>
              <button type="button" disabled={locked}
                onClick={() => { setAnswers(a => ({ ...a, ...answersFromWoundAssessment(latestWound.assessment) })); setLinkedWoundId(latestWound.woundId); toast.success('Measurements pulled in — check them'); }}
                className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs disabled:opacity-50">Use these measurements</button>
            </div>
          )}
          {reading.template.sections.map(section => (
            <div key={section.id} className="bg-white rounded-xl border p-4">
              <h4 className="text-sm font-semibold text-gray-800">
                {section.title}
                <span className="ml-2 text-[10px] font-normal uppercase text-gray-400">{section.origin === 'core' ? 'core' : 'procedure'}</span>
              </h4>
              {section.intent && <p className="text-xs text-gray-500 mt-0.5 mb-3">{section.intent}</p>}
              <fieldset disabled={locked} className="space-y-4">
                {section.fields.filter(f => isVisible(f, answers)).map(field => (
                  <EncounterFieldInput key={field.id} field={field} value={answers[field.id]} otherText={otherText[field.id]}
                    onChange={v => setAnswer(field.id, v)} onOther={t => setOtherText(o => ({ ...o, [field.id]: t }))} />
                ))}
              </fieldset>
            </div>
          ))}
          {reading.handoffs.length > 0 && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-xs font-medium text-sky-900 mb-1.5">Measure or decide it in the module that owns it</p>
              {reading.handoffs.map((h, i) => (
                <Link key={i} to={h.route} className="flex items-center gap-1.5 text-sm text-sky-800 hover:underline py-0.5">
                  <ExternalLink className="w-3.5 h-3.5" /> {h.label}{h.when && <span className="text-xs text-sky-600">— {h.when}</span>}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* 2. Scores & risks */}
      {step === 'scores' && (
        <div className="bg-white rounded-xl border divide-y">
          {reading.scores.map(s => (
            <div key={s.id} className="p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                <p className="text-sm tabular-nums">
                  {s.total != null ? <span className="font-semibold">{s.total}{s.max != null ? `/${s.max}` : ''}</span> : <span className="text-gray-400">—</span>}
                  {s.band && <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${s.band.level === 'very_high' || s.band.level === 'high' ? 'bg-red-100 text-red-800' : s.band.level === 'moderate' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{s.band.label}</span>}
                </p>
              </div>
              {s.band && <p className="text-xs text-gray-600 mt-0.5">{s.band.interpretation}</p>}
              {s.incomplete.length > 0 && <p className="text-xs text-amber-700 mt-0.5">Still needed: {s.incomplete.join(', ')}</p>}
              {s.detail?.map((d, i) => <p key={i} className="text-xs text-gray-500">{d}</p>)}
              <p className="text-[10px] text-gray-400 mt-0.5">{s.source}</p>
            </div>
          ))}
          {reading.barriers.length > 0 && (
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">Barriers to healing ({reading.barriers.length})</p>
              <ul className="text-sm space-y-0.5">{reading.barriers.map((b, i) => <li key={i} className={b.level === 'red' ? 'text-red-800' : 'text-gray-700'}>• {b.barrier} <span className="text-xs text-gray-500">({b.why})</span></li>)}</ul>
            </div>
          )}
          {reading.comparison.length > 0 && (
            <div className="p-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">Since the last review</p>
              <ul className="text-sm space-y-0.5">{reading.comparison.map((c, i) => <li key={i} className={c.trend === 'worse' ? 'text-red-800' : c.trend === 'better' ? 'text-green-800' : 'text-gray-700'}>• {c.label}: {c.before} → {c.now} ({c.delta > 0 ? '+' : ''}{c.delta}) since {c.since}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* 3. Plan */}
      {step === 'plan' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm border rounded-lg p-2.5 bg-amber-50 border-amber-200 text-amber-900">
            Draft — untick anything that does not apply and add your own lines. Nothing is an order until a consultant approves it.
          </p>
          <PlanView plan={computed.generated.plan} excluded={excluded} toggle={toggle} editable={!locked} />
          {!locked && (
            <label className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Additional items (one per line)</span>
              <textarea value={additions} onChange={e => setAdditions(e.target.value)} rows={3} className="w-full border rounded-lg p-2 text-sm" />
            </label>
          )}
          {review?.scribePlanId ? (
            <p className="text-sm text-green-800 flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4" /> Submitted for consultant approval (scribe plan v{review.scribePlanVersion}). Track it on the clinical summary.</p>
          ) : null}
          {canLog(actor) && (
            <button type="button" onClick={sendPlan} disabled={busy !== null}
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
              {busy === 'plan' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {review?.scribePlanId ? 'Re-submit the edited plan' : 'Submit plan for consultant approval'}
            </button>
          )}
        </div>
      )}

      {/* 4. Counselling & consent */}
      {step === 'consent' && (
        <fieldset disabled={locked} className="space-y-3">
          {consent ? (
            <div className="bg-white rounded-xl border p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><FileSignature className="w-4 h-4" /> Consent: {consent.procedureName}</p>
              {consent.patientRisks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <p className="text-xs font-semibold text-amber-900">Risks that apply to this patient</p>
                  <ul className="text-xs text-amber-900 list-disc pl-4">{consent.patientRisks.map((r, i) => <li key={i}>{r.text} <span className="text-amber-700">({r.why})</span></li>)}</ul>
                </div>
              )}
              {consent.sections.map((s, i) => (
                <details key={i} className="text-sm">
                  <summary className="cursor-pointer font-medium text-gray-800">{s.title}</summary>
                  {s.body && <p className="text-gray-700 mt-1">{s.body}</p>}
                  {s.bullets && <ul className="list-disc pl-5 text-gray-700">{s.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 bg-white border rounded-xl p-3">No consent is taken at this phase; record the counselling given.</p>
          )}

          <div className="bg-white rounded-xl border p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Topics discussed</p>
            {(consent?.topics ?? computed.generated.counselling.map(c => `${c.topic}: ${c.text}`)).map(t => (
              <label key={t} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 rounded" checked={counselling.topicsDiscussed.includes(t)}
                  onChange={e => setC({ topicsDiscussed: e.target.checked ? [...counselling.topicsDiscussed, t] : counselling.topicsDiscussed.filter(x => x !== t) })} />
                <span>{t}</span>
              </label>
            ))}
            <label className="block text-sm">Questions asked and how they were answered
              <textarea value={counselling.questionsAsked} onChange={e => setC({ questionsAsked: e.target.value })} rows={2} className="w-full border rounded-lg p-2 text-sm mt-1" />
            </label>
            <Choice label="Understanding (teach-back)" value={counselling.understanding} onChange={v => setC({ understanding: v as CounsellingRecord['understanding'] })}
              options={[['good', 'Explained it back well'], ['partial', 'Partly'], ['poor', 'Could not']]} />
            <p className="text-xs text-gray-600">
              Capacity (from the assessment): <b>{String(answers['core.capacity'] ?? 'not recorded').replace(/_/g, ' ')}</b> ·
              Language: <b>{String(answers['core.language'] ?? 'not recorded')}</b>
            </p>
            <label className="block text-sm">Capacity note
              <input value={counselling.capacityNote} onChange={e => setC({ capacityNote: e.target.value })} className="w-full border rounded-lg p-2 text-sm mt-1" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" checked={counselling.interpreterUsed} onChange={e => setC({ interpreterUsed: e.target.checked })} /> Interpreter used
            </label>
            {counselling.interpreterUsed && (
              <input placeholder="Interpreter's name" value={counselling.interpreterName} onChange={e => setC({ interpreterName: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
            )}
            {consent && (
              <>
                <Choice label="Anaesthesia agreed" value={counselling.anaesthesiaAgreed} onChange={v => setC({ anaesthesiaAgreed: v })}
                  options={consent.anaesthesiaOptions.map(o => [o, o])} />
                <Choice label="Clinical photography" value={counselling.photographyConsent} onChange={v => setC({ photographyConsent: v as CounsellingRecord['photographyConsent'] })}
                  options={[['yes', 'Agrees'], ['no', 'Declines']]} />
                {consent.bloodProducts !== 'unlikely' && (
                  <Choice label="Blood products" value={counselling.bloodConsent} onChange={v => setC({ bloodConsent: v as CounsellingRecord['bloodConsent'] })}
                    options={[['yes', 'Accepts'], ['no', 'Declines'], ['not_applicable', 'Not applicable']]} />
                )}
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" checked={counselling.leafletGiven} onChange={e => setC({ leafletGiven: e.target.checked })} /> Written information given
            </label>
            <Choice label="Decision" value={counselling.decision} onChange={v => setC({ decision: v as CounsellingRecord['decision'] })}
              options={[['consents', 'Consents'], ['wants_time', 'Wants time to decide'], ['declines', 'Declines']]} />
            <input placeholder="Decision note (optional)" value={counselling.decisionNote} onChange={e => setC({ decisionNote: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
            <input placeholder="Witness name" value={counselling.witnessName} onChange={e => setC({ witnessName: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
            <p className="text-xs text-gray-500">Consenting clinician: {actor?.name ?? '—'} (recorded from your session when saved)</p>
            {gaps.length > 0 && <p className="text-xs text-amber-700">Not yet complete: {gaps.join('; ')}</p>}
          </div>
        </fieldset>
      )}

      {/* 5. Review & sign */}
      {step === 'review' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">The note this produces</p>
          <pre className="text-xs whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-96 overflow-y-auto">{reading.narrative.text}</pre>
          {reading.completeness.missing.length > 0 && (
            <p className="text-xs text-gray-500">Still worth recording: {reading.completeness.missing.join(' · ')}</p>
          )}
          <p className="text-xs text-gray-400">Written into the encounter's own fields, so the summary, the encounter PDF and the discharge summary read it as usual. {plan.problems.length} problem(s), {plan.general.length} plan headings.</p>
          <div className="flex flex-wrap gap-2">
            {!locked && (
              <button type="button" onClick={save} disabled={busy !== null} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save draft
              </button>
            )}
            {!locked && (
              <button type="button" onClick={submit} disabled={busy !== null} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                {busy === 'submit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {canSign(actor) ? 'Sign the review' : 'Submit for review'}
              </button>
            )}
            <button type="button" onClick={exportPdf} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export PDF</button>
            <button type="button" onClick={sharePdf} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-2"><Share2 className="w-4 h-4" /> WhatsApp</button>
            {enc && review?.status !== 'entered_in_error' && (
              <button type="button" onClick={markError} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Entered in error</button>
            )}
          </div>
          {locked && <p className="text-xs text-gray-500">This review is {review?.status.replace(/_/g, ' ')}. Record changes in a new follow-up review.</p>}
        </div>
      )}

      {/* Bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-2 flex justify-between gap-2 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <button type="button" disabled={stepIndex === 0} onClick={() => setStep(STEPS[stepIndex - 1].id)} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1 disabled:opacity-40 bg-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {!locked && (
          <button type="button" onClick={save} disabled={busy !== null} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1 bg-white disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
          </button>
        )}
        <button type="button" disabled={stepIndex === STEPS.length - 1} onClick={() => setStep(STEPS[stepIndex + 1].id)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-40">
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const Choice: React.FC<{ label: string; value: string; options: (readonly [string, string])[] | string[][]; onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
  <div>
    <p className="text-sm text-gray-800 mb-1">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-lg border text-xs ${value === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'}`}>{l}</button>
      ))}
    </div>
  </div>
);

export default ProcedureReviewForm;
