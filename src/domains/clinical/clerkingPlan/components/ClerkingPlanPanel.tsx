/**
 * The live plan beside the clerking.
 *
 *   Plan     the rules plan, recomputed (debounced 300 ms) as the clinician
 *            types — no AI call. Every line shows its source; rules lines are
 *            in the final plan unless rejected; any line can be edited.
 *            "Build Plan" asks Claude for the detailed plan ONLY
 *            when pressed; its lines are shown labelled AI-drafted, beside the
 *            rules plan, with the hard rules repeated, and enter the final
 *            plan only when accepted. A stale marker shows when the clerking
 *            changed after the draft. "Build manually" opens the no-AI
 *            builder (ManualPlanBuilder): picks from the app's catalogues
 *            become clinician lines, which can be edited or removed.
 *   Results  result rows for the planned investigations (ResultsPanel).
 *   Approve  approval, PDFs, WhatsApp and follow-up booking (ApprovePanel).
 *
 * The same component runs inside the clerking form and on the plan page.
 */
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../../../../database';
import { useAuth } from '../../../../contexts/AuthContext';
import { LongTaskProgress, Sheet, SkeletonText } from '../../../../components/motion';
import type { ClerkingData } from '../../clerking/types';
import type { PatientContext } from '../../clerking/engine';
import { buildRulesPlan } from '../rulesPlan';
import { suggestedConditions, CONDITIONS } from '../conditions';
import { requestClaudePlan, draftToLines } from '../aiPlan';
import { buildFinalPlan, decide, decisionFor, isIncluded, isStale } from '../finalPlan';
import { resultMaps } from '../results';
import { savePlanDraft, updatePlan, latestApproval, getPlan } from '../service';
import { patientFacts } from '../facts';
import { builderContext, freeTextLine, newManualIds } from '../manualPlan';
import { PLAN_SECTIONS, type PlanLine, type PlanSection } from '../types';
import type { ClerkingPlanRecord, ClerkingPlanSource } from '../records';
import { ResultsPanel } from './ResultsPanel';
import { ApprovePanel } from './ApprovePanel';
import { reviewApplies } from '../../../derm-rheum/review';
import { dermRheumLines } from '../../../derm-rheum/store';

/** The manual builder carries the catalogues (formulary, procedures, education library): loaded when opened. */
const ManualPlanBuilder = lazy(() => import('./ManualPlanBuilder'));
/** The derm & rheum review (knowledge base, score tools, Claude on a press): loaded when opened. */
const DermRheumReview = lazy(() => import('../../../derm-rheum/components/DermRheumReview'));

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

const SOURCE_STYLE: Record<string, string> = {
  protocol: 'bg-teal-100 text-teal-800', template: 'bg-blue-100 text-blue-800', guideline: 'bg-slate-100 text-slate-700',
  engine: 'bg-emerald-100 text-emerald-800', clerking: 'bg-gray-100 text-gray-700', ai: 'bg-purple-100 text-purple-800', clinician: 'bg-amber-100 text-amber-800',
};
const SOURCE_SHORT: Record<string, string> = { protocol: 'Protocol', template: 'Template', guideline: 'Guideline', engine: 'Nutrition engine', clerking: 'Clerking', ai: 'AI-drafted', clinician: 'Clinician' };

export interface ClerkingPlanPanelProps {
  patientId: string;
  hospitalId?: string;
  encounterId?: string;
  source: ClerkingPlanSource;
  data: ClerkingData;
  ctx: PatientContext;
  identifiers?: string[];
  planId: string | null;
  onPlanId: (id: string) => void;
  /** Add a condition template's complaint to the clerking (form only). */
  onAddCondition?: (complaintId: string, label: string) => void;
  readOnlyClerking?: boolean;
}

const LineRow: React.FC<{
  line: PlanLine; included: boolean; patientId: string; decided?: 'accepted' | 'rejected'; edited?: string;
  onDecide: (d: 'accepted' | 'rejected' | null, text?: string) => void; disabled?: boolean;
  /** The clinician's own line: edit or remove (accept / reject do not apply). */
  onRemove?: () => void;
}> = ({ line, included, patientId, decided, edited, onDecide, disabled, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(edited || line.text);
  const ai = line.source.kind === 'ai';
  return (
    <li className={`rounded-lg border px-2 py-1.5 text-xs ${included ? (ai ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white') : 'border-dashed border-gray-300 bg-gray-50 opacity-80'}`} data-testid="plan-line" data-line={line.id}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <textarea className="w-full border rounded px-1.5 py-1 text-xs" rows={2} value={text} onChange={e => setText(e.target.value)} />
          ) : (
            <p className={`text-gray-900 ${included ? '' : 'line-through decoration-gray-400'}`}>
              {line.urgency === 'urgent' && <span className="text-red-700 font-semibold">URGENT · </span>}
              {edited || line.text}
            </p>
          )}
          {line.medication?.weightBasis && <p className="text-[11px] text-indigo-700">Dose basis: {line.medication.weightBasis}</p>}
          {line.medication?.cautions?.length ? <p className="text-[11px] text-amber-800">⚠ {line.medication.cautions.join(' ')}</p> : null}
          {line.why && <p className="text-[11px] text-gray-500">Why: {line.why}</p>}
          {line.withheld && <p className="text-[11px] text-red-700">Not recommended: {line.withheld}</p>}
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${SOURCE_STYLE[line.source.kind]}`} title={line.source.label}>{SOURCE_SHORT[line.source.kind]}: {line.source.label}</span>
            {line.procedureReviewModuleId && <Link to={`/patients/${encodeURIComponent(patientId)}/procedure-review?module=${line.procedureReviewModuleId}&phase=pre_op`} className="text-[10px] text-indigo-700 underline">→ open the procedure review template</Link>}
            {edited && <span className="text-[10px] text-amber-700">edited</span>}
          </div>
        </div>
        {!disabled && (
          <div className="flex flex-col gap-1 shrink-0">
            {editing ? (
              <button type="button" className="px-1.5 py-0.5 rounded bg-green-600 text-white" onClick={() => { onDecide('accepted', text); setEditing(false); }}>Save</button>
            ) : onRemove ? (
              <>
                <button type="button" aria-label="Edit" title="Edit this line" onClick={() => setEditing(true)} className="px-1.5 py-0.5 rounded border border-gray-300 text-gray-600">✎</button>
                <button type="button" aria-label="Remove" title="Remove this line from the plan" onClick={onRemove} className="px-1.5 py-0.5 rounded border border-red-300 text-red-600" data-testid="remove-line">🗑</button>
              </>
            ) : (
              <>
                <button type="button" aria-label="Accept" title="Keep in the final plan" onClick={() => onDecide(included && decided === 'accepted' ? null : 'accepted')}
                  className={`px-1.5 py-0.5 rounded border ${included ? 'bg-green-600 text-white border-green-600' : 'border-green-600 text-green-700'}`}>✓</button>
                <button type="button" aria-label="Reject" title="Leave out of the final plan" onClick={() => onDecide(!included ? null : 'rejected')}
                  className={`px-1.5 py-0.5 rounded border ${!included && decided === 'rejected' ? 'bg-red-600 text-white border-red-600' : 'border-red-300 text-red-600'}`}>✕</button>
                <button type="button" aria-label="Edit" title="Edit this line" onClick={() => setEditing(true)} className="px-1.5 py-0.5 rounded border border-gray-300 text-gray-600">✎</button>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

export const ClerkingPlanPanel: React.FC<ClerkingPlanPanelProps> = React.memo(function ClerkingPlanPanel(p) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'plan' | 'results' | 'approve'>('plan');
  const record = useLiveQuery(() => (p.planId ? db.clerkingPlans.get(p.planId) : undefined), [p.planId]) as ClerkingPlanRecord | undefined;
  const [conditionIds, setConditionIds] = useState<string[]>([]);
  const [woundOverride, setWoundOverride] = useState<boolean | null>(null);
  // stage: which step of "Build Plan" is running (shown as progress text only).
  const [ai, setAi] = useState<{ state: 'idle' | 'loading' | 'error'; message?: string; stage?: number }>({ state: 'idle' });
  const [adding, setAdding] = useState<{ section: PlanSection; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [dermOpen, setDermOpen] = useState(false);

  useEffect(() => { if (record) { setConditionIds(record.conditionIds); setWoundOverride(record.woundProtocol); } }, [record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useDebounced(p.data, 300);
  const maps = useMemo(() => resultMaps(record?.results ?? []), [record?.results]);
  const rules = useMemo(
    () => buildRulesPlan({ data, ctx: p.ctx, labs: maps.labs, qualitative: maps.qualitative, conditionIds, woundProtocol: woundOverride }),
    [data, p.ctx, maps, conditionIds, woundOverride],
  );
  const decisions = record?.decisions ?? [];
  const aiLines = useMemo(() => [...(record?.aiDraft?.lines ?? []), ...(record?.interpretation?.ai?.lines ?? []), ...dermRheumLines(record?.dermRheum, record?.decisions ?? [])], [record?.aiDraft, record?.interpretation, record?.dermRheum, record?.decisions]);
  const finalLines = useMemo(() => buildFinalPlan(rules.lines, aiLines, decisions, record?.manualLines ?? []), [rules.lines, aiLines, decisions, record?.manualLines]);
  const suggestions = useMemo(() => suggestedConditions(data), [data]);
  const stale = isStale(rules, record?.aiDraft?.inputsHash);
  const builderCtx = useMemo(() => builderContext(patientFacts({ data, ctx: p.ctx, labs: maps.labs, qualitative: maps.qualitative }), data.allergies.map(a => a.substance)), [data, p.ctx, maps]);
  const planLines = useMemo(() => [...rules.lines, ...aiLines, ...(record?.manualLines ?? [])], [rules.lines, aiLines, record?.manualLines]);
  const approved = record ? latestApproval(record) : undefined;
  const dermAvailable = reviewApplies(data, rules.conditions.map(c => c.id));

  const ensure = useCallback(async (patch: Partial<ClerkingPlanRecord> = {}): Promise<ClerkingPlanRecord | null> => {
    if (!user) { toast.error('Sign in to save the plan'); return null; }
    const r = await savePlanDraft({
      id: p.planId ?? undefined, patientId: p.patientId, hospitalId: p.hospitalId, encounterId: p.encounterId, source: p.source,
      clerking: p.data, ctx: p.ctx, conditionIds, woundProtocol: woundOverride,
    }, user, patch);
    if (!p.planId) p.onPlanId(r.id);
    return r;
  }, [user, p, conditionIds, woundOverride]);

  const onDecide = async (line: PlanLine, d: 'accepted' | 'rejected' | null, text?: string) => {
    const r = record ?? await ensure();
    if (!r) return;
    const next = d === null ? r.decisions.filter(x => x.lineId !== line.id) : decide(r.decisions, { lineId: line.id, decision: d, editedText: text, by: user?.id, at: new Date().toISOString() });
    await updatePlan(r.id, { decisions: next });
  };

  const buildWithClaude = async () => {
    if (!data.complaints.length) { toast.error('Add the presenting condition first'); return; }
    if (!navigator.onLine) { setAi({ state: 'error', message: 'Offline — Claude needs a connection. The rules plan is complete without it.' }); return; }
    setAi({ state: 'loading', stage: 0 });
    const r = await ensure();
    if (!r) { setAi({ state: 'idle' }); return; }
    const results = Object.fromEntries(r.results.filter(v => v.confirmed && !v.error).map(v => [v.analyte ?? v.testId, v.text ?? `${v.value} ${v.unit ?? ''}`.trim()]));
    setAi({ state: 'loading', stage: 1 });
    const res = await requestClaudePlan({ data: p.data, ctx: p.ctx, rules, weightKg: Number(p.data.vitals?.weight) || null, results, identifiers: p.identifiers });
    if (res.status === 'error') { setAi({ state: 'error', message: res.message }); return; }
    setAi({ state: 'loading', stage: 2 });
    await updatePlan(r.id, { aiDraft: { draft: res.value, lines: draftToLines(res.value), inputsHash: rules.inputsHash, at: new Date().toISOString(), by: user?.id, missingHardRules: res.missingHardRules } });
    setAi({ state: 'idle' });
    toast.success('Claude drafted a plan — check each line before accepting it');
  };

  const addManual = async () => {
    if (!adding?.text.trim()) { setAdding(null); return; }
    const r = record ?? await ensure();
    if (!r) return;
    await updatePlan(r.id, { manualLines: [...r.manualLines, freeTextLine(adding.section, adding.text, false, newManualIds(adding.section, 1, r.manualLines)[0])] });
    setAdding(null);
  };

  /** Lines from the manual builder join the plan's manualLines (read fresh, so quick adds are not lost). */
  const addManualLines = async (lines: PlanLine[]) => {
    const r = record ?? await ensure();
    if (!r) throw new Error('Sign in to save the plan');
    const latest = (await getPlan(r.id)) ?? r;
    await updatePlan(r.id, { manualLines: [...latest.manualLines, ...lines] });
  };

  const removeManual = async (id: string) => {
    if (!record) return;
    const latest = (await getPlan(record.id)) ?? record;
    await updatePlan(record.id, { manualLines: latest.manualLines.filter(l => l.id !== id), decisions: latest.decisions.filter(d => d.lineId !== id) });
  };

  const toggleCondition = async (id: string) => {
    const t = CONDITIONS.find(c => c.id === id);
    if (t && p.onAddCondition) {
      const complaintId = t.complaintIds[0] ?? `cond_${t.id}`;
      p.onAddCondition(complaintId, t.label);
      return;
    }
    const next = conditionIds.includes(id) ? conditionIds.filter(x => x !== id) : [...conditionIds, id];
    setConditionIds(next);
    if (record) await updatePlan(record.id, { conditionIds: next });
  };

  const counts = PLAN_SECTIONS.map(s => ({ ...s, n: finalLines.filter(l => l.section === s.id).length }));

  return (
    <div className="space-y-3 text-sm" data-testid="clerking-plan-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-900">Treatment plan</h3>
          <p className="text-[11px] text-gray-500">{finalLines.length} lines · {rules.conditions.map(c => c.label).join(', ') || 'no condition yet'}{approved ? ` · v${approved.version} approved` : ' · draft'}</p>
        </div>
        <nav className="flex gap-1" aria-label="Plan sections">
          {(['plan', 'results', 'approve'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`px-2 py-1 rounded-full text-xs border ${tab === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700'}`}>
              {t === 'plan' ? 'Plan' : t === 'results' ? 'Results' : 'Approve'}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'plan' && (
        <>
          {suggestions.length > 0 && p.onAddCondition && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs">
              <p className="font-semibold text-blue-900 mb-1">Condition fields available — add the working diagnosis:</p>
              <div className="flex flex-wrap gap-1">{suggestions.map(s => <button key={s.id} type="button" onClick={() => toggleCondition(s.id)} className="px-2 py-1 rounded-full bg-white border border-blue-300 text-blue-800">+ {s.label}</button>)}</div>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={rules.woundProtocolApplied} onChange={e => setWoundOverride(e.target.checked)} />
            Apply the wound clinic protocol{woundOverride === null ? ' (automatic)' : ''}
          </label>
          {rules.hardRules.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-2" data-testid="hard-rules">
              <p className="text-xs font-semibold text-red-800">Hard rules — always apply</p>
              <ul className="list-disc pl-4 text-[11px] text-red-800 space-y-0.5">{rules.hardRules.map(r => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
          {rules.missing.length > 0 && <p className="text-[11px] text-amber-800 bg-amber-50 rounded p-1.5">Not documented yet: {rules.missing.join('; ')}</p>}

          <div className="rounded-lg border border-purple-300 bg-purple-50 p-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={buildWithClaude} disabled={ai.state === 'loading'} className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-semibold disabled:opacity-50" data-testid="build-with-claude">
                {ai.state === 'loading' ? 'Claude is writing the plan…' : record?.aiDraft ? 'Rebuild Plan' : 'Build Plan'}
              </button>
              <button type="button" onClick={() => setManualOpen(o => !o)} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${manualOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-700 border-indigo-500'}`} data-testid="build-manually" aria-expanded={manualOpen}>
                Build manually
              </button>
              <span className="text-[11px] text-purple-900">Build Plan uses Claude, sent without name, hospital number or phone. Build manually: no AI, free, works offline.</span>
            </div>
            {ai.state === 'loading' && (
              <div className="pt-1 space-y-2" data-testid="build-progress">
                <LongTaskProgress
                  tone="purple"
                  label="Claude is writing the plan…"
                  stages={['Saving the clerking', 'Writing the plan', 'Adding the draft lines']}
                  current={ai.stage ?? 0}
                  hint={ai.stage === 1 ? 'Writing the plan… this usually takes 20–40 seconds. The rules plan below is already complete.' : undefined}
                />
                <SkeletonText lines={3} className="max-w-md" />
              </div>
            )}
            {ai.state === 'error' && <p className="text-[11px] text-amber-800">{ai.message}</p>}
            {record?.aiDraft && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-purple-900">AI-drafted — check before use{stale && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900" data-testid="stale">Stale: the clerking changed after this draft</span>}</p>
                <p className="text-[11px] text-purple-900">{record.aiDraft.draft.assessment}</p>
                {record.aiDraft.missingHardRules.length > 0 && <p className="text-[11px] text-red-700">The draft did not restate {record.aiDraft.missingHardRules.length} hard rule(s); they still apply.</p>}
                {record.aiDraft.draft.unknowns.length > 0 && <p className="text-[11px] text-purple-900">Unknown: {record.aiDraft.draft.unknowns.join('; ')}</p>}
              </div>
            )}
          </div>

          {dermAvailable && (
            <div className="rounded-lg border border-orange-300 bg-orange-50 p-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setDermOpen(true)} className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold min-h-[36px]" data-testid="derm-rheum-open">Derm &amp; Rheum review</button>
              <span className="text-[11px] text-orange-900">Skin lesion or ulcer: knowledge base, score tools and hard rules (free); Claude only if you ask.{record?.dermRheum?.length ? ` ${record.dermRheum.length} review(s) saved.` : ''}</span>
            </div>
          )}
          <Sheet open={dermOpen} onClose={() => setDermOpen(false)} label="Dermatology and rheumatology review" className="sm:max-w-2xl">
            {close => (
              <div className="px-3 pb-4 pt-2">
                <div className="flex justify-end"><button type="button" onClick={close} className="px-3 py-1.5 text-sm text-gray-600 min-h-[40px]">Close</button></div>
                <Suspense fallback={<SkeletonText lines={5} />}>
                  <DermRheumReview patientId={p.patientId} data={data} ctx={p.ctx} identifiers={p.identifiers} record={record ?? null} ensurePlan={ensure} planHardRules={rules.hardRules} inputsHash={rules.inputsHash} />
                </Suspense>
              </div>
            )}
          </Sheet>

          {manualOpen && (
            <Suspense fallback={<div className="rounded-lg border border-indigo-200 p-3 space-y-2"><p className="text-xs text-gray-500">Loading the lists…</p><SkeletonText lines={4} /></div>}>
              <ManualPlanBuilder ctx={builderCtx} existing={planLines} onAdd={addManualLines} onClose={() => setManualOpen(false)} />
            </Suspense>
          )}

          {PLAN_SECTIONS.map(s => {
            const rl = rules.lines.filter(l => l.section === s.id);
            const al = aiLines.filter(l => l.section === s.id);
            const ml = (record?.manualLines ?? []).filter(l => l.section === s.id);
            if (!rl.length && !al.length && !ml.length) return null;
            const row = (l: PlanLine) => {
              const d = decisionFor(decisions, l.id);
              const mine = l.source.kind === 'clinician';
              return <LineRow key={l.id} line={l} patientId={p.patientId} included={mine || isIncluded(l, decisions)} decided={d?.decision} edited={d?.editedText} disabled={busy}
                onDecide={(dec, text) => { setBusy(true); onDecide(l, dec, text).finally(() => setBusy(false)); }}
                onRemove={mine ? () => { setBusy(true); removeManual(l.id).finally(() => setBusy(false)); } : undefined} />;
            };
            return (
              <section key={s.id} aria-label={s.label}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{s.label} <span className="text-gray-400">({counts.find(c => c.id === s.id)?.n})</span></h4>
                  <button type="button" className="text-[11px] text-indigo-700" onClick={() => setAdding({ section: s.id, text: '' })}>+ add</button>
                </div>
                <ul className="mt-1 space-y-1">{rl.map(row)}{ml.map(row)}</ul>
                {al.length > 0 && <ul className="mt-1 space-y-1 border-l-2 border-purple-300 pl-2">{al.map(row)}</ul>}
                {adding?.section === s.id && (
                  <div className="mt-1 flex gap-1">
                    <input autoFocus className="flex-1 border rounded px-2 py-1 text-xs" value={adding.text} onChange={e => setAdding({ ...adding, text: e.target.value })} placeholder={`Add to ${s.label.toLowerCase()}`} />
                    <button type="button" className="px-2 rounded bg-indigo-600 text-white text-xs" onClick={addManual}>Add</button>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {tab === 'results' && <ResultsPanel record={record ?? null} finalLines={finalLines} rules={rules} ensure={ensure} ctx={p.ctx} patientId={p.patientId} identifiers={p.identifiers} />}
      {tab === 'approve' && <ApprovePanel record={record ?? null} finalLines={finalLines} rules={rules} ensure={ensure} />}
    </div>
  );
});

export default ClerkingPlanPanel;
