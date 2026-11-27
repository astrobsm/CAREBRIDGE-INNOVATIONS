/**
 * /derm-rheum — the Dermatology & Rheumatology review on its own page.
 * Pick a patient, then either one of their treatment plans with a skin or
 * ulcer condition, or a quick lesion / ulcer assessment (the atypical-ulcer
 * screen's own questions), saved as a plan so the consult and its accepted
 * lines live with the patient. ?patient= and ?plan= open it directly.
 * Claude runs only from the review's own button.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import { SkeletonText } from '../../../components/motion';
import type { Question } from '../../clinical/clerking/types';
import { emptyClerking } from '../../clinical/clerking/engine';
import { patientContext, patientIdentifiers, patientLabelOf } from '../../clinical/services/clerkingService';
import { ATYPICAL_ULCER } from '../../clinical/clerkingPlan/conditions/dermRheum';
import { buildRulesPlan } from '../../clinical/clerkingPlan/rulesPlan';
import { resultMaps } from '../../clinical/clerkingPlan/results';
import { savePlanDraft } from '../../clinical/clerkingPlan/service';
import { reviewApplies } from '../review';
import type { ClerkingPlanRecord } from '../../clinical/clerkingPlan/records';
import { DermRheumReview } from '../components/DermRheumReview';

type Ans = Record<string, string | string[] | number>;

const QuestionField: React.FC<{ q: Question; value: Ans[string] | undefined; onChange: (v: Ans[string] | undefined) => void }> = ({ q, value, onChange }) => {
  if (q.type === 'select') return (
    <label className="block text-[13px] text-gray-800">{q.label}
      <select className="mt-1 w-full border rounded-lg px-2 py-2 bg-white min-h-[44px]" value={String(value ?? '')} onChange={e => onChange(e.target.value || undefined)}>
        <option value="">—</option>{q.options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
  if (q.type === 'multiselect') {
    const v = Array.isArray(value) ? value : [];
    return (
      <fieldset className="text-[13px] text-gray-800"><legend className="mb-1">{q.label}</legend>
        <div className="flex flex-wrap gap-1.5">{q.options?.map(o => {
          const on = v.includes(o);
          return <button key={o} type="button" aria-pressed={on} onClick={() => onChange(on ? v.filter(x => x !== o) : [...v, o])} className={`px-2.5 py-1.5 rounded-full border text-[12px] min-h-[36px] ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700'}`}>{o}</button>;
        })}</div>
      </fieldset>
    );
  }
  return (
    <label className="block text-[13px] text-gray-800">{q.label}{q.unit ? ` (${q.unit})` : ''}
      <input className="mt-1 w-full border rounded-lg px-2 py-2 min-h-[44px]" type={q.type === 'number' ? 'number' : 'text'} inputMode={q.type === 'number' ? 'decimal' : undefined} value={value === undefined ? '' : String(value)}
        onChange={e => onChange(e.target.value === '' ? undefined : q.type === 'number' ? Number(e.target.value) : e.target.value)} />
    </label>
  );
};

export default function DermRheumPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const patientId = params.get('patient') || '';
  const planParam = params.get('plan') || '';
  const patient = useLiveQuery(() => (patientId ? db.patients.get(patientId) : undefined), [patientId]);
  const plans = useLiveQuery<ClerkingPlanRecord[]>(() => (patientId ? db.clerkingPlans.where('patientId').equals(patientId).toArray() : Promise.resolve([] as ClerkingPlanRecord[])), [patientId]);
  const [quick, setQuick] = useState(false);
  const [hist, setHist] = useState<Ans>({});
  const [exam, setExam] = useState<Ans>({});
  const [quickPlanId, setQuickPlanId] = useState<string | null>(null);
  const planId = planParam || quickPlanId || '';
  const record = useLiveQuery(() => (planId ? db.clerkingPlans.get(planId) : undefined), [planId]);
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };

  const skinPlans = (plans ?? []).filter(r => reviewApplies(r.clerking, r.conditionIds)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ctx = useMemo(() => (record && planParam ? record.ctx : patientContext(patient)), [record, planParam, patient]);
  const quickData = useMemo(() => {
    const d = emptyClerking();
    d.complaints = [{ uid: 'dr_quick', complaintId: 'cond_atypical_ulcer', label: ATYPICAL_ULCER.label, answers: hist }];
    d.exam = { [ATYPICAL_ULCER.exam.id]: exam };
    return d;
  }, [hist, exam]);
  const data = planParam && record ? record.clerking : quickData;
  const showReview = !!patientId && ((!!planParam && !!record) || quick);
  const maps = useMemo(() => resultMaps(record?.results ?? []), [record?.results]);
  const rules = useMemo(() => buildRulesPlan({ data, ctx, labs: maps.labs, qualitative: maps.qualitative, conditionIds: record?.conditionIds }), [data, ctx, maps, record?.conditionIds]);

  const ensurePlan = async () => {
    if (!user) { toast.error('Sign in to save the review'); return null; }
    if (planParam && record) return record;
    const r = await savePlanDraft({ id: quickPlanId ?? undefined, patientId, hospitalId: patient?.registeredHospitalId, source: 'initial', clerking: quickData, ctx }, user);
    setQuickPlanId(r.id);
    return r;
  };

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-5 space-y-3" data-testid="derm-rheum-page">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Dermatology &amp; Rheumatology review</h1>
        <p className="text-xs text-gray-500">Skin lesions and ulcers: rule-based screen, cited knowledge base and score tools; Claude only when you ask.</p>
      </div>
      <div className="bg-white rounded-xl border p-3">
        <PatientSelector value={patientId || undefined} onChange={id => { set('patient', id ?? null); set('plan', null); setQuick(false); setQuickPlanId(null); }} label="Patient" placeholder="Search by name or hospital number" />
      </div>

      {patientId && !showReview && (
        <div className="bg-white rounded-xl border p-3 space-y-2">
          {plans === undefined ? <SkeletonText lines={3} /> : (
            <>
              <p className="text-sm font-semibold text-gray-900">Review from a treatment plan</p>
              {skinPlans.length ? (
                <ul className="space-y-1">{skinPlans.map(r => (
                  <li key={r.id}>
                    <button type="button" onClick={() => set('plan', r.id)} className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border hover:bg-gray-50 min-h-[52px]">
                      <ClipboardList size={18} className="text-indigo-600 shrink-0" />
                      <span className="flex-1 min-w-0"><span className="block text-sm text-gray-900 truncate">{r.conditions.map(c => c.label).join(', ') || 'Plan'}</span>
                        <span className="block text-[11px] text-gray-500">{new Date(r.updatedAt).toLocaleDateString()} · {r.status}{r.dermRheum?.length ? ` · ${r.dermRheum.length} review(s)` : ''}</span></span>
                    </button>
                  </li>
                ))}</ul>
              ) : <p className="text-[12px] text-gray-600">No plan with a skin lesion or ulcer yet.</p>}
              <button type="button" onClick={() => setQuick(true)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm min-h-[44px]" data-testid="dr-quick"><Plus size={16} /> New lesion / ulcer assessment</button>
            </>
          )}
        </div>
      )}

      {showReview && (
        <>
          <button type="button" onClick={() => { set('plan', null); setQuick(false); }} className="inline-flex items-center gap-1 text-sm text-indigo-700"><ArrowLeft size={16} /> {patientLabelOf(patient)}</button>
          {quick && !planParam && (
            <details className="bg-white rounded-xl border p-3" open data-testid="dr-quick-form">
              <summary className="text-sm font-semibold text-gray-900 cursor-pointer">Lesion / ulcer assessment</summary>
              <div className="mt-2 space-y-3">
                {ATYPICAL_ULCER.history.questions.map(q => <QuestionField key={q.id} q={q} value={hist[q.id]} onChange={v => setHist(h => { const n = { ...h }; if (v === undefined || (Array.isArray(v) && !v.length)) delete n[q.id]; else n[q.id] = v; return n; })} />)}
                {ATYPICAL_ULCER.exam.questions.map(q => <QuestionField key={q.id} q={q} value={exam[q.id]} onChange={v => setExam(h => { const n = { ...h }; if (v === undefined || (Array.isArray(v) && !v.length)) delete n[q.id]; else n[q.id] = v; return n; })} />)}
              </div>
            </details>
          )}
          {planParam && record && <p className="text-xs text-gray-500">From the plan of {new Date(record.createdAt).toLocaleDateString()}. <Link className="text-indigo-700 underline" to={`/patients/${encodeURIComponent(patientId)}/plan/${encodeURIComponent(record.id)}`}>Open the plan</Link></p>}
          <div className="bg-white rounded-xl border p-3">
            <DermRheumReview patientId={patientId} data={data} ctx={ctx} identifiers={patientIdentifiers(patient)} record={record ?? null} ensurePlan={ensurePlan}
              planHardRules={rules.hardRules} inputsHash={rules.inputsHash}
              patientInfo={patient ? { name: `${patient.firstName} ${patient.lastName}`.trim(), hospitalNumber: patient.hospitalNumber || '', gender: patient.gender } : undefined} />
          </div>
        </>
      )}
    </div>
  );
}
