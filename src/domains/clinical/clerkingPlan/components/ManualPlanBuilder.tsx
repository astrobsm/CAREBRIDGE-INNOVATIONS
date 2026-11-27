/**
 * "Build manually": the treatment plan built by picking from the app's own
 * catalogues, one tab per plan section. No AI and no network call, so it is
 * free and works offline. Every pick becomes a clinician line in the plan's
 * manualLines (manualPlan.ts builds the lines), so approval, both PDFs,
 * WhatsApp and booking are unchanged. Inline on a wide screen, a full-height
 * sheet on a phone.
 */
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getFrequencyLabel, getRouteLabel, type BNFDrug, type DrugCategory, type DrugRoute } from '../../../../data/bnfDrugDatabase';
import type { SurgicalProcedure } from '../../../../data/surgicalFees';
import {
  counsellingLine, counsellingTopics, dressingOptions, drugCategories, duplicatesOf, followUpLine, freeTextLine, investigationCategories,
  investigationLine, investigationPanels, medicationLine, medicationOptions, newManualIds, procedureCategories, procedureLine, referralLine,
  referralSpecialties, searchFormulary, woundCareLine, DRESSING_CLEANSING, DRESSING_FREQUENCIES, FOLLOW_UP_INTERVALS, FOLLOW_UP_PURPOSES,
  FREQUENCY_PLAIN, PROCEDURE_TIMINGS, WHO_DRESSES, type BuilderContext, type CounselTopic, type TestPick,
} from '../manualPlan';
import { PLAN_SECTIONS, type PlanLine, type PlanSection } from '../types';

export interface ManualPlanBuilderProps {
  ctx: BuilderContext;
  /** Every line already in the plan (rules, Claude's, the clinician's), for duplicate warnings. */
  existing: PlanLine[];
  onAdd: (lines: PlanLine[]) => Promise<void>;
  onClose: () => void;
}

type Tab = 'investigations' | 'medications' | 'procedures' | 'wound' | 'counselling' | 'referrals' | 'follow_up' | 'free';
const TABS: { id: Tab; label: string }[] = [
  { id: 'investigations', label: 'Investigations' }, { id: 'medications', label: 'Medications' }, { id: 'procedures', label: 'Procedures' },
  { id: 'wound', label: 'Wound care' }, { id: 'counselling', label: 'Counselling' }, { id: 'referrals', label: 'Referrals' },
  { id: 'follow_up', label: 'Follow-up' }, { id: 'free', label: 'Free text' },
];
const OTHER = '__other__';
const SHORT: Record<string, string> = { protocol: 'Protocol', template: 'Template', guideline: 'Guideline', engine: 'Nutrition engine', clerking: 'Clerking', ai: 'AI-drafted', clinician: 'Clinician' };

const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white';
const Label: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <label className="block text-xs text-gray-700 space-y-0.5"><span className="font-medium">{text}</span>{children}</label>
);

/** A dropdown with the catalogue's options and "Other…", which opens a text box. */
const PickOrOther: React.FC<{
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; group?: string }[]; placeholder?: string; testId?: string;
}> = ({ label, value, onChange, options, placeholder, testId }) => {
  const known = options.some(o => o.value === value);
  const [other, setOther] = useState(!!value && !known);
  const groups = [...new Set(options.map(o => o.group ?? ''))];
  return (
    <Label text={label}>
      <select className={inputCls} value={other ? OTHER : value} data-testid={testId}
        onChange={e => { if (e.target.value === OTHER) { setOther(true); onChange(''); } else { setOther(false); onChange(e.target.value); } }}>
        <option value="">{placeholder ?? 'Choose…'}</option>
        {groups.map(g => {
          const opts = options.filter(o => (o.group ?? '') === g).map(o => <option key={o.value} value={o.value}>{o.label}</option>);
          return g ? <optgroup key={g} label={g}>{opts}</optgroup> : <React.Fragment key="_">{opts}</React.Fragment>;
        })}
        <option value={OTHER}>Other…</option>
      </select>
      {other && <input className={inputCls} autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder={`Type the ${label.toLowerCase()}`} />}
    </Label>
  );
};

const Dups: React.FC<{ lines: PlanLine[] }> = ({ lines }) => lines.length ? (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900" data-testid="manual-duplicate">
    <p className="font-semibold">Already in the plan:</p>
    <ul className="list-disc pl-4">{lines.map(l => <li key={l.id}>{l.text} <span className="text-amber-700">({SHORT[l.source.kind]}{l.withheld ? `, not recommended: ${l.withheld}` : ''})</span></li>)}</ul>
  </div>
) : null;

const Preview: React.FC<{ line: PlanLine | null }> = ({ line }) => line ? (
  <div className="rounded-lg bg-gray-50 border p-2 text-[11px] space-y-0.5" data-testid="manual-preview">
    <p><span className="font-semibold text-gray-700">Plan line:</span> {line.text}</p>
    {line.medication?.weightBasis && <p className="text-indigo-700">Dose basis: {line.medication.weightBasis}</p>}
    {line.medication?.cautions.length ? <p className="text-amber-800">⚠ {line.medication.cautions.join(' ')}</p> : null}
    <p><span className="font-semibold text-gray-700">Patient copy:</span> {line.patient ?? <em className="text-gray-500">not printed on the patient copy</em>}</p>
  </div>
) : null;

const AddButton: React.FC<{ onClick: () => void; disabled?: boolean; dup?: boolean; children: React.ReactNode; testId?: string }> = ({ onClick, disabled, dup, children, testId }) => (
  <button type="button" onClick={onClick} disabled={disabled} data-testid={testId}
    className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 ${dup ? 'bg-amber-600' : 'bg-indigo-600'}`}>
    {dup ? 'Add anyway' : children}
  </button>
);

const searchable = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.toLowerCase().trim());

export default function ManualPlanBuilder({ ctx, existing, onAdd, onClose }: ManualPlanBuilderProps) {
  const [tab, setTab] = useState<Tab>('investigations');
  const [busy, setBusy] = useState(false);
  const idsFor = (section: PlanSection, n: number) => newManualIds(section, n, existing);
  const add = async (lines: PlanLine[], after?: () => void) => {
    if (!lines.length) return;
    setBusy(true);
    try { await onAdd(lines); toast.success(lines.length === 1 ? 'Added to the plan' : `${lines.length} lines added to the plan`); after?.(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not add to the plan'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white sm:static sm:z-auto sm:rounded-lg sm:border sm:border-indigo-300" data-testid="manual-builder" role="dialog" aria-label="Build the plan manually">
      <div className="flex items-start justify-between gap-2 border-b px-3 py-2 bg-indigo-50 sm:rounded-t-lg">
        <div>
          <p className="text-sm font-bold text-indigo-900">Build the plan manually</p>
          <p className="text-[11px] text-indigo-800">Pick from the app's lists. No AI: free, and works offline.{ctx.facts.isChild ? ` Child${ctx.facts.weightKg ? `, ${ctx.facts.weightKg} kg` : ', weight not recorded'}.` : ''}{ctx.egfr != null ? ` eGFR ${ctx.egfr}${ctx.egfrSource === 'calculated' ? ' (calculated)' : ''}.` : ''}</p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 px-3 py-1 rounded-lg border border-indigo-300 bg-white text-xs" data-testid="manual-close">Done</button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 py-2 border-b" aria-label="Plan sections">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} data-testid={`manual-tab-${t.id}`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${tab === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700'}`}>{t.label}</button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 sm:max-h-[70vh]">
        {tab === 'investigations' && <InvestigationsTab existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'medications' && <MedicationsTab ctx={ctx} existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'procedures' && <ProceduresTab existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'wound' && <WoundTab existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'counselling' && <CounsellingTab existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'referrals' && <ReferralsTab existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'follow_up' && <FollowUpTab existing={existing} busy={busy} add={add} idsFor={idsFor} />}
        {tab === 'free' && <FreeTab busy={busy} add={add} idsFor={idsFor} />}
      </div>
    </div>
  );
}

interface TabProps { existing: PlanLine[]; busy: boolean; add: (lines: PlanLine[], after?: () => void) => Promise<void>; idsFor: (s: PlanSection, n: number) => string[] }

// ── Investigations ─────────────────────────────────────────────────────────

function InvestigationsTab({ existing, busy, add, idsFor }: TabProps) {
  const cats = useMemo(() => investigationCategories(), []);
  const panels = useMemo(() => investigationPanels(), []);
  const [cat, setCat] = useState(cats[0].id);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Map<string, TestPick>>(new Map());
  const [panelDups, setPanelDups] = useState<{ panel: string; fresh: TestPick[]; all: TestPick[]; dups: PlanLine[] } | null>(null);
  const linesOf = (picks: TestPick[]) => { const ids = idsFor('investigations', picks.length); return picks.map((t, i) => investigationLine(t, ids[i])); };
  const dupsOf = (picks: TestPick[]) => linesOf(picks).map(l => ({ l, d: duplicatesOf(l, existing) }));
  const category = cats.find(c => c.id === cat)!;
  const toggle = (t: TestPick) => setPicked(m => { const n = new Map(m); if (n.has(t.key)) n.delete(t.key); else n.set(t.key, t); return n; });
  const sel = [...picked.values()];
  const selDups = dupsOf(sel).flatMap(x => x.d);

  const addPanel = (id: string) => {
    const p = panels.find(x => x.id === id)!;
    const checked = dupsOf(p.tests);
    const dups = checked.flatMap(x => x.d);
    if (!dups.length) { add(linesOf(p.tests)); return; }
    setPanelDups({ panel: p.label, all: p.tests, fresh: p.tests.filter((_, i) => !checked[i].d.length), dups });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-700">Panels: add a group at once</p>
        <div className="flex flex-wrap gap-1">
          {panels.map(p => <button key={p.id} type="button" disabled={busy} onClick={() => addPanel(p.id)} data-testid={`manual-panel-${p.id}`} className="px-2 py-1.5 rounded-lg border border-teal-400 bg-teal-50 text-teal-900 text-xs">+ {p.label} ({p.tests.length})</button>)}
        </div>
        {panelDups && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 space-y-1" data-testid="manual-duplicate">
            <p className="font-semibold">{panelDups.dups.length} line(s) of the {panelDups.panel} are already in the plan:</p>
            <ul className="list-disc pl-4">{[...new Map(panelDups.dups.map(d => [d.id, d])).values()].map(d => <li key={d.id}>{d.text} ({SHORT[d.source.kind]})</li>)}</ul>
            <div className="flex flex-wrap gap-1">
              <button type="button" disabled={busy || !panelDups.fresh.length} onClick={() => add(linesOf(panelDups.fresh), () => setPanelDups(null))} className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-40">Add the {panelDups.fresh.length} new one(s)</button>
              <button type="button" disabled={busy} onClick={() => add(linesOf(panelDups.all), () => setPanelDups(null))} className="px-2 py-1 rounded bg-amber-600 text-white">Add all anyway</button>
              <button type="button" onClick={() => setPanelDups(null)} className="px-2 py-1 rounded border">Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="Category"><select className={inputCls} value={cat} onChange={e => setCat(e.target.value)} data-testid="manual-inv-category">{cats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Label>
        <Label text="Search tests"><input className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. CRP, X-ray, culture" data-testid="manual-inv-search" /></Label>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
        {category.groups.map(g => {
          const tests = g.tests.filter(t => searchable(t.label, q));
          if (!tests.length) return null;
          const all = tests.every(t => picked.has(t.key));
          return (
            <div key={g.id} className="p-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase text-gray-500">{g.label}</p>
                <button type="button" className="text-[11px] text-indigo-700" onClick={() => setPicked(m => { const n = new Map(m); for (const t of tests) all ? n.delete(t.key) : n.set(t.key, t); return n; })}>{all ? 'Clear group' : 'Select group'}</button>
              </div>
              {tests.map(t => (
                <label key={t.key} className="flex items-start gap-2 py-1 text-sm">
                  <input type="checkbox" className="mt-1" checked={picked.has(t.key)} onChange={() => toggle(t)} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <Dups lines={[...new Map(selDups.map(d => [d.id, d])).values()]} />
      <AddButton disabled={busy || !sel.length} dup={!!selDups.length} onClick={() => add(linesOf(sel), () => setPicked(new Map()))} testId="manual-add-tests">Add {sel.length || ''} test{sel.length === 1 ? '' : 's'}</AddButton>
    </div>
  );
}

// ── Medications ────────────────────────────────────────────────────────────

function MedicationsTab({ ctx, existing, busy, add, idsFor }: TabProps & { ctx: BuilderContext }) {
  const cats = useMemo(() => drugCategories(), []);
  const [cat, setCat] = useState<DrugCategory | ''>('');
  const [q, setQ] = useState('');
  const [drugId, setDrugId] = useState('');
  const [route, setRoute] = useState('');
  const [formulation, setFormulation] = useState('');
  const [dose, setDose] = useState('');
  const [freq, setFreq] = useState('');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const drugs = useMemo(() => searchFormulary(q, cat), [q, cat]);
  const drug: BNFDrug | undefined = drugs.find(d => d.id === drugId) ?? (drugId ? searchFormulary('', '').find(d => d.id === drugId) : undefined);
  const o = drug ? medicationOptions(drug, ctx, route) : null;
  const choose = (id: string) => {
    setDrugId(id);
    const d = searchFormulary('', '').find(x => x.id === id);
    const opts = d ? medicationOptions(d, ctx) : null;
    setRoute(opts?.routes[0] ?? ''); setFormulation(''); setNote('');
    setDose(opts?.defaultDose ?? '');
    setFreq(opts?.frequencies[0] ?? ''); setDuration('');
  };
  const weightBasis = o?.weight && dose === o.weight.dose ? o.weight.basis : undefined;
  const candidate = drug && dose.trim() && freq.trim()
    ? medicationLine({ drug, route, formulation: formulation || undefined, dose, frequency: freq, duration, weightBasis, note }, ctx, idsFor('medications', 1)[0]) : null;
  const dups = candidate ? duplicatesOf(candidate, existing) : [];
  const dbFreq = new Set(o ? (ctx.facts.isChild && drug?.dosage.pediatric ? drug.dosage.pediatric.frequency : drug!.dosage.adult.frequency) : []);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="Category"><select className={inputCls} value={cat} onChange={e => { setCat(e.target.value as DrugCategory | ''); setDrugId(''); }} data-testid="manual-med-category">
          <option value="">All categories</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select></Label>
        <Label text="Search medicines"><input className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder="Generic or brand name" data-testid="manual-med-search" /></Label>
      </div>
      <Label text={`Medicine (${drugs.length})`}>
        <select className={inputCls} value={drugId} onChange={e => choose(e.target.value)} data-testid="manual-med-drug">
          <option value="">Choose a medicine…</option>
          {drugs.map(d => <option key={d.id} value={d.id}>{d.genericName}{d.brandNames.length ? ` — ${d.brandNames.slice(0, 2).join(', ')}` : ''}</option>)}
        </select>
      </Label>
      {drug && o && (
        <>
          <p className="text-[11px] text-gray-600 bg-gray-50 rounded p-1.5">Formulary: {o.guide}</p>
          {ctx.facts.isChild && (o.weight
            ? <p className="text-[11px] text-indigo-800 bg-indigo-50 rounded p-1.5" data-testid="manual-weight-dose">Weight-based dose: <strong>{o.weight.dose}</strong> per dose — {o.weight.basis}{dose !== o.weight.dose && <button type="button" className="ml-1 underline" onClick={() => setDose(o.weight!.dose)}>use it</button>}</p>
            : <p className="text-[11px] text-amber-800 bg-amber-50 rounded p-1.5">{o.weightNote}</p>)}
          <div className="grid gap-2 sm:grid-cols-2">
            <Label text="Route"><select className={inputCls} value={route} onChange={e => { setRoute(e.target.value); setFormulation(''); }} data-testid="manual-med-route">
              {o.routes.map(r => <option key={r} value={r}>{getRouteLabel(r as DrugRoute)}</option>)}</select></Label>
            <Label text="Strength / form"><select className={inputCls} value={formulation} onChange={e => setFormulation(e.target.value)} data-testid="manual-med-form">
              <option value="">Not specified</option>{o.formulations.map(f => <option key={f} value={f}>{f}</option>)}</select></Label>
            <PickOrOther key={`dose-${drug.id}`} label="Dose" value={dose} onChange={setDose} testId="manual-med-dose"
              options={[...(o.weight ? [{ value: o.weight.dose, label: `${o.weight.dose} (by weight)` }] : []), ...o.doses.filter(d => d !== o.weight?.dose).map(d => ({ value: d, label: d }))]} />
            <PickOrOther key={`freq-${drug.id}`} label="Frequency" value={freq} onChange={setFreq} testId="manual-med-frequency"
              options={o.frequencies.map(f => ({ value: f, label: `${getFrequencyLabel(f)}${FREQUENCY_PLAIN[f] && !getFrequencyLabel(f).toLowerCase().includes(FREQUENCY_PLAIN[f]) ? ` — ${FREQUENCY_PLAIN[f]}` : ''}`, group: dbFreq.has(f) ? 'Formulary' : 'Other frequencies' }))} />
            <PickOrOther key={`dur-${drug.id}`} label="Duration" value={duration} onChange={setDuration} testId="manual-med-duration" options={o.durations.map(d => ({ value: d, label: d }))} />
            <Label text="Note (optional)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. with food" /></Label>
          </div>
        </>
      )}
      <Preview line={candidate} />
      <Dups lines={dups} />
      <AddButton disabled={busy || !candidate} dup={!!dups.length} onClick={() => candidate && add([candidate], () => { setDrugId(''); setQ(''); })} testId="manual-add-medicine">Add medicine</AddButton>
    </div>
  );
}

// ── Procedures ─────────────────────────────────────────────────────────────

function ProceduresTab({ existing, busy, add, idsFor }: TabProps) {
  const cats = useMemo(() => procedureCategories(), []);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [procId, setProcId] = useState('');
  const [timing, setTiming] = useState('next_list');
  const [note, setNote] = useState('');
  const pool: SurgicalProcedure[] = (cat ? cats.filter(c => c.id === cat) : cats).flatMap(c => c.procedures).filter(p => searchable(p.name, q));
  const proc = cats.flatMap(c => c.procedures).find(p => p.id === procId);
  const candidate = proc ? procedureLine(proc, timing, idsFor('procedures', 1)[0], note) : null;
  const dups = candidate ? duplicatesOf(candidate, existing) : [];
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="Category"><select className={inputCls} value={cat} onChange={e => setCat(e.target.value)} data-testid="manual-proc-category"><option value="">All categories</option>{cats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Label>
        <Label text="Search procedures"><input className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. graft, flap, debridement" data-testid="manual-proc-search" /></Label>
      </div>
      <Label text={`Procedure (${pool.length})`}><select className={inputCls} value={procId} onChange={e => setProcId(e.target.value)} data-testid="manual-proc"><option value="">Choose a procedure…</option>{pool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="Timing"><select className={inputCls} value={timing} onChange={e => setTiming(e.target.value)} data-testid="manual-proc-timing">{PROCEDURE_TIMINGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Label>
        <Label text="Note (optional)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Side, site, anaesthesia" /></Label>
      </div>
      {candidate?.procedureReviewModuleId && <p className="text-[11px] text-indigo-700">A procedure review template exists for this procedure; the plan line links to it.</p>}
      <Preview line={candidate} />
      <Dups lines={dups} />
      <AddButton disabled={busy || !candidate} dup={!!dups.length} onClick={() => candidate && add([candidate], () => { setProcId(''); setNote(''); })} testId="manual-add-procedure">Add procedure</AddButton>
    </div>
  );
}

// ── Wound care ─────────────────────────────────────────────────────────────

function WoundTab({ existing, busy, add, idsFor }: TabProps) {
  const dressings = useMemo(() => dressingOptions(), []);
  const [dressing, setDressing] = useState('');
  const [frequency, setFrequency] = useState('');
  const [cleansing, setCleansing] = useState('');
  const [who, setWho] = useState('');
  const [note, setNote] = useState('');
  const candidate = dressing.trim() && frequency.trim() ? woundCareLine({ dressing, frequency, cleansing, who, note }, idsFor('procedures', 1)[0]) : null;
  const dups = candidate ? duplicatesOf(candidate, existing) : [];
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <PickOrOther label="Dressing" value={dressing} onChange={setDressing} testId="manual-dressing" options={dressings.map(d => ({ value: d.id, label: d.whenUsed ? `${d.label} — ${d.whenUsed}` : d.label }))} />
        <PickOrOther label="How often" value={frequency} onChange={setFrequency} testId="manual-dressing-frequency" options={DRESSING_FREQUENCIES} />
        <Label text="Cleansing"><select className={inputCls} value={cleansing} onChange={e => setCleansing(e.target.value)}><option value="">Not specified</option>{DRESSING_CLEANSING.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Label>
        <Label text="Who does the dressings"><select className={inputCls} value={who} onChange={e => setWho(e.target.value)}><option value="">Not specified</option>{WHO_DRESSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Label>
      </div>
      <Label text="Note (optional)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Secondary dressing, offloading, compression" /></Label>
      <p className="text-[11px] text-gray-500">Wound care is a treatment line: the patient copy prints it under "Your treatment options".</p>
      <Preview line={candidate} />
      <Dups lines={dups} />
      <AddButton disabled={busy || !candidate} dup={!!dups.length} onClick={() => candidate && add([candidate], () => setNote(''))} testId="manual-add-wound">Add wound care</AddButton>
    </div>
  );
}

// ── Counselling ────────────────────────────────────────────────────────────

function CounsellingTab({ existing, busy, add, idsFor }: TabProps) {
  const groups = useMemo(() => counsellingTopics(), []);
  const [group, setGroup] = useState(groups[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Map<string, CounselTopic>>(new Map());
  const topics = (q.trim() ? groups.flatMap(g => g.topics) : groups.find(g => g.id === group)?.topics ?? []).filter(t => searchable(t.label, q)).slice(0, 200);
  const sel = [...picked.values()];
  const lines = () => { const ids = idsFor('counselling', sel.length); return sel.map((t, i) => counsellingLine(t, ids[i])); };
  const dups = lines().flatMap(l => duplicatesOf(l, existing));
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="Topic list"><select className={inputCls} value={group} onChange={e => setGroup(e.target.value)} data-testid="manual-counsel-group">{groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></Label>
        <Label text="Search all topics"><input className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. burns, keloid, diabetes" /></Label>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
        {topics.map(t => (
          <label key={t.id} className="flex items-start gap-2 p-2 text-sm">
            <input type="checkbox" className="mt-1" checked={picked.has(t.id)} onChange={() => setPicked(m => { const n = new Map(m); if (n.has(t.id)) n.delete(t.id); else n.set(t.id, t); return n; })} />
            <span>{t.label}</span>
          </label>
        ))}
        {!topics.length && <p className="p-2 text-xs text-gray-500">No topic matches.</p>}
      </div>
      {sel.length > 0 && <Preview line={lines()[0]} />}
      <Dups lines={[...new Map(dups.map(d => [d.id, d])).values()]} />
      <AddButton disabled={busy || !sel.length} dup={!!dups.length} onClick={() => add(lines(), () => setPicked(new Map()))} testId="manual-add-counselling">Add {sel.length || ''} topic{sel.length === 1 ? '' : 's'}</AddButton>
    </div>
  );
}

// ── Referrals ──────────────────────────────────────────────────────────────

function ReferralsTab({ existing, busy, add, idsFor }: TabProps) {
  const specialties = useMemo(() => referralSpecialties(), []);
  const [specialty, setSpecialty] = useState('');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState<'urgent' | 'soon' | 'routine'>('routine');
  const candidate = specialty.trim() ? referralLine(specialty, reason, urgency, idsFor('referrals', 1)[0]) : null;
  const dups = candidate ? duplicatesOf(candidate, existing) : [];
  return (
    <div className="space-y-3">
      <PickOrOther label="Specialty" value={specialty} onChange={setSpecialty} testId="manual-referral" options={specialties.flatMap(g => g.items.map(i => ({ value: i.name, label: i.name, group: g.group })))} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="Reason"><input className={inputCls} value={reason} onChange={e => setReason(e.target.value)} placeholder="What you want them to do" /></Label>
        <Label text="Urgency"><select className={inputCls} value={urgency} onChange={e => setUrgency(e.target.value as typeof urgency)}><option value="routine">Routine</option><option value="soon">Soon</option><option value="urgent">Urgent</option></select></Label>
      </div>
      <p className="text-[11px] text-gray-500">Referrals are on the clinician copy only.</p>
      <Preview line={candidate} />
      <Dups lines={dups} />
      <AddButton disabled={busy || !candidate} dup={!!dups.length} onClick={() => candidate && add([candidate], () => { setSpecialty(''); setReason(''); })} testId="manual-add-referral">Add referral</AddButton>
    </div>
  );
}

// ── Follow-up ──────────────────────────────────────────────────────────────

function FollowUpTab({ existing, busy, add, idsFor }: TabProps) {
  const [interval, setIv] = useState('2w');
  const [purpose, setPurpose] = useState('');
  const known = FOLLOW_UP_PURPOSES.some(p => p.id === purpose);
  const candidate = purpose.trim() ? followUpLine(interval, known ? { id: purpose } : { other: purpose }, idsFor('follow_up', 1)[0]) : null;
  const dups = candidate ? duplicatesOf(candidate, existing) : [];
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Label text="When"><select className={inputCls} value={interval} onChange={e => setIv(e.target.value)} data-testid="manual-fu-interval">{FOLLOW_UP_INTERVALS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</select></Label>
        <PickOrOther label="Purpose" value={purpose} onChange={setPurpose} testId="manual-fu-purpose" options={FOLLOW_UP_PURPOSES.map(p => ({ value: p.id, label: p.label }))} />
      </div>
      <p className="text-[11px] text-gray-500">Booked as an appointment from the Approve tab, after the plan is approved.</p>
      <Preview line={candidate} />
      <Dups lines={dups} />
      <AddButton disabled={busy || !candidate} dup={!!dups.length} onClick={() => candidate && add([candidate], () => setPurpose(''))} testId="manual-add-follow-up">Add follow-up</AddButton>
    </div>
  );
}

// ── Free text ──────────────────────────────────────────────────────────────

function FreeTab({ busy, add, idsFor }: Omit<TabProps, 'existing'>) {
  const [section, setSection] = useState<PlanSection>('counselling');
  const [text, setText] = useState('');
  const [toPatient, setToPatient] = useState(false);
  const candidate = text.trim() ? freeTextLine(section, text, toPatient, idsFor(section, 1)[0]) : null;
  return (
    <div className="space-y-3">
      <Label text="Section"><select className={inputCls} value={section} onChange={e => setSection(e.target.value as PlanSection)} data-testid="manual-free-section">{PLAN_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Label>
      <Label text="Text"><textarea className={inputCls} rows={3} value={text} onChange={e => setText(e.target.value)} data-testid="manual-free-text" /></Label>
      <label className="flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={toPatient} onChange={e => setToPatient(e.target.checked)} /> Also print these words on the patient copy</label>
      {toPatient && section === 'medications' && candidate && !candidate.patient && <p className="text-[11px] text-amber-800">Not printed for the patient: medicine text with mg/kg or "e.g." stays on the clinician copy.</p>}
      <Preview line={candidate} />
      <AddButton disabled={busy || !candidate} onClick={() => candidate && add([candidate], () => setText(''))} testId="manual-add-free">Add line</AddButton>
    </div>
  );
}
