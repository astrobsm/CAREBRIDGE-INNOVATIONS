/**
 * Results for the planned investigations: direct entry (value + unit,
 * converted and graded by the clinician-assistant engine) or "Scan report"
 * (the clinician-assistant scan pipeline: PDF text layer, else OCR through
 * Claude vision, then labParser), mapped to the planned rows and confirmed by
 * the clinician. Shows "7 of 11 results in"; when all are in (or on
 * "Interpret now") the deterministic interpretation runs, and "Interpret with
 * Claude" offers a narrative and plan changes to accept or reject. Confirmed
 * results are saved to db.investigations.
 */
import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { db } from '../../../../database';
import type { PatientContext } from '../../clerking/engine';
import { emptyPatient } from '../../../clinician-assistant/services/engine/types';
import { scanReports } from '../../../clinician-assistant/services/scanPipeline';
import { ANALYTE_BY_KEY } from '../../../clinician-assistant/services/engine/referenceRanges';
import { completeness, enterValue, interpretResults, mapScanned, plannedRows, qualitativeValue, type ResultValue } from '../results';
import { requestClaudeInterpretation, interpretationToLines } from '../aiInterpret';
import { saveResultsToInvestigations, updatePlan } from '../service';
import type { ClerkingPlanRecord } from '../records';
import type { PlanLine, RulesPlan } from '../types';

interface Props {
  record: ClerkingPlanRecord | null;
  finalLines: PlanLine[];
  rules: RulesPlan;
  ensure: () => Promise<ClerkingPlanRecord | null>;
  ctx: PatientContext;
  patientId: string;
  identifiers?: string[];
}

const sexOf = (s?: string | null) => ((s || '').toLowerCase().startsWith('f') ? 'female' as const : (s || '').toLowerCase().startsWith('m') ? 'male' as const : null);

export const ResultsPanel: React.FC<Props> = ({ record, finalLines, rules, ensure, ctx, patientId, identifiers }) => {
  const { user } = useAuth();
  const rows = useMemo(() => plannedRows(finalLines), [finalLines]);
  const values = record?.results ?? [];
  const done = completeness(rows, values);
  const [draft, setDraft] = useState<Record<string, { value: string; unit: string }>>({});
  const [proposals, setProposals] = useState<ResultValue[]>([]);
  const [scanning, setScanning] = useState<string | null>(null);
  const [showInterp, setShowInterp] = useState(false);
  const [aiState, setAiState] = useState<{ loading?: boolean; message?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const entry = { sex: sexOf(ctx.sex), ageYears: ctx.ageYears ?? null };
  const deterministic = useMemo(() => interpretResults(values, { ...entry, ageMonths: ctx.ageMonths ?? null, isChild: (ctx.ageYears ?? 99) < 18 }), [values]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (next: ResultValue[]) => {
    const r = record ?? await ensure();
    if (!r || !user) return;
    const updated = await updatePlan(r.id, { results: next });
    try {
      const patient = await db.patients.get(patientId);
      await saveResultsToInvestigations(updated, user, patient);
    } catch (e) { console.warn('[ClerkingPlan] saving to investigations failed', e); }
  };

  const saveNumeric = async (testId: string, key: string, fallbackUnit: string) => {
    const d = draft[`${testId}:${key}`];
    if (!d?.value) return;
    const v = enterValue(testId, key, Number(d.value), d.unit || fallbackUnit, entry);
    if (v.error) { toast.error(v.error); return; }
    await save([...values.filter(x => !(x.testId === testId && x.analyte === key)), v]);
    setDraft(s => ({ ...s, [`${testId}:${key}`]: { value: '', unit: d.unit } }));
  };

  const onScan = async (files: FileList | null) => {
    if (!files?.length) return;
    setScanning('Reading the report…');
    try {
      const res = await scanReports([...files], { ...emptyPatient(), age: ctx.ageYears ?? null, sex: sexOf(ctx.sex) ?? 'unspecified' }, fs => setScanning(fs.map(f => `${f.name}: ${f.status}`).join(', ')));
      const { proposals: p, unplanned } = mapScanned(res.extraction.analytes, rows, entry);
      setProposals(p);
      if (!p.length) toast.error('No planned results were found on the report. Enter them directly.');
      else toast.success(`${p.length} value(s) read — check and confirm each one`);
      if (unplanned.length) toast(`Also on the report (not planned): ${unplanned.slice(0, 5).join(', ')}`);
    } catch (e) {
      toast.error('Could not read the report');
      console.error(e);
    } finally { setScanning(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  const confirmProposals = async (which: ResultValue[]) => {
    const ok = which.filter(p => !p.error).map(p => ({ ...p, confirmed: true }));
    await save([...values.filter(v => !ok.some(o => o.testId === v.testId && o.analyte === v.analyte)), ...ok]);
    setProposals(ps => ps.filter(p => !which.includes(p)));
  };

  const interpretWithClaude = async () => {
    const r = record ?? await ensure();
    if (!r) return;
    setAiState({ loading: true });
    const results = Object.fromEntries(values.filter(v => v.confirmed && !v.error).map(v => [v.analyte ?? v.testId, v.text ?? `${v.value} ${v.unit ?? ''}${v.flag && v.flag !== 'normal' ? ` (${v.flag})` : ''}`.trim()]));
    const res = await requestClaudeInterpretation({ summary: { age_years: ctx.ageYears ?? null, sex: ctx.sex ?? null }, rules, finalLines, results, deterministic, identifiers });
    if (res.status === 'error') { setAiState({ message: res.message }); return; }
    await updatePlan(r.id, { interpretation: { deterministic, at: new Date().toISOString(), ai: { value: res.value, lines: interpretationToLines(res.value), at: new Date().toISOString(), missingHardRules: res.missingHardRules } } });
    setAiState({});
    toast.success('Claude interpretation added — accept its recommendations in the Plan tab');
  };

  return (
    <div className="space-y-3" data-testid="results-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900" data-testid="results-count">{done.done} of {done.total} results in</p>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => onScan(e.target.files)} data-testid="scan-input" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!scanning} className="px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-700 text-xs font-semibold disabled:opacity-50">📷 Scan report</button>
        </div>
      </div>
      {scanning && <p className="text-xs text-indigo-700">{scanning}</p>}
      {proposals.length > 0 && (
        <div className="rounded-lg border border-indigo-300 bg-indigo-50 p-2 text-xs space-y-1" data-testid="scan-proposals">
          <p className="font-semibold text-indigo-900">Read from the report — confirm each value</p>
          {proposals.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span>{ANALYTE_BY_KEY[p.analyte ?? '']?.label ?? p.analyte}: {p.error ? <span className="text-red-700">{p.error}</span> : <strong>{p.value} {p.unit}</strong>} {p.flag && p.flag !== 'normal' && <span className="text-red-700">({p.flag})</span>}</span>
              {!p.error && <button type="button" className="px-2 py-0.5 rounded bg-indigo-600 text-white" onClick={() => confirmProposals([p])}>Confirm</button>}
            </div>
          ))}
          <button type="button" className="px-2 py-1 rounded bg-indigo-700 text-white" onClick={() => confirmProposals(proposals)}>Confirm all</button>
        </div>
      )}

      <ul className="space-y-2">
        {rows.map(r => {
          const mine = values.filter(v => v.testId === r.testId && v.confirmed);
          const complete = !done.missing.includes(r.label);
          return (
            <li key={`${r.testId}:${r.lineId}`} className={`rounded-lg border p-2 ${complete ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`} data-testid="result-row">
              <p className="text-xs font-semibold text-gray-900">{complete ? '✓ ' : ''}{r.label}</p>
              {r.target && <p className="text-[11px] text-gray-500">Target / action: {r.target}</p>}
              {r.analytes.length > 0 ? (
                <div className="mt-1 grid grid-cols-1 gap-1">
                  {r.analytes.map(a => {
                    const have = mine.find(v => v.analyte === a.key);
                    const k = `${r.testId}:${a.key}`;
                    return (
                      <div key={a.key} className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="w-28 text-gray-700">{a.label}</span>
                        {have && <span className={`font-semibold ${have.flag === 'low' || have.flag === 'high' ? 'text-red-700' : 'text-green-800'}`}>{have.value} {have.unit}{have.flag && have.flag !== 'normal' ? ` (${have.flag})` : ''}{have.via === 'scan' ? ' · scanned' : ''}</span>}
                        <input inputMode="decimal" className="w-20 border rounded px-1.5 py-1" placeholder={have ? 'change' : 'value'} value={draft[k]?.value ?? ''}
                          onChange={e => setDraft(s => ({ ...s, [k]: { value: e.target.value, unit: s[k]?.unit ?? a.unit } }))} aria-label={`${a.label} value`} />
                        <select className="border rounded px-1 py-1" value={draft[k]?.unit ?? a.unit} onChange={e => setDraft(s => ({ ...s, [k]: { value: s[k]?.value ?? '', unit: e.target.value } }))} aria-label={`${a.label} unit`}>
                          {a.units.map(u => <option key={u}>{u}</option>)}
                        </select>
                        <button type="button" className="px-2 py-1 rounded bg-green-600 text-white disabled:opacity-40" disabled={!draft[k]?.value} onClick={() => saveNumeric(r.testId, a.key, a.unit)}>Save</button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                  {mine.find(v => v.text) && <span className="font-semibold text-green-800">{mine.find(v => v.text)!.text}</span>}
                  {r.qualitative?.options?.length ? (
                    <select className="border rounded px-1 py-1" value="" onChange={e => e.target.value && save([...values.filter(v => v.testId !== r.testId), qualitativeValue(r.testId, e.target.value)])} aria-label={`${r.label} result`}>
                      <option value="">— result —</option>{r.qualitative.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="flex-1 min-w-[10rem] border rounded px-1.5 py-1" placeholder="Result / report summary — Enter to save" aria-label={`${r.label} result`}
                      onKeyDown={e => { const t = (e.target as HTMLInputElement).value.trim(); if (e.key === 'Enter' && t) { save([...values.filter(v => v.testId !== r.testId), qualitativeValue(r.testId, t)]); (e.target as HTMLInputElement).value = ''; } }} />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowInterp(true)} className="px-3 py-1.5 rounded-lg border border-gray-400 text-xs font-semibold">Interpret now</button>
        <button type="button" onClick={interpretWithClaude} disabled={aiState.loading || !values.length} className="px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-semibold disabled:opacity-50">{aiState.loading ? 'Claude is interpreting…' : '✨ Interpret with Claude'}</button>
      </div>
      {aiState.message && <p className="text-[11px] text-amber-800">{aiState.message}</p>}
      {(done.complete || showInterp) && (
        <div className="rounded-lg border border-gray-300 bg-white p-2 text-xs" data-testid="interpretation">
          <p className="font-semibold text-gray-900">Interpretation (rules){done.complete ? ' — all planned results are in' : ''}</p>
          {deterministic.findings.length ? <ul className="list-disc pl-4 space-y-0.5">{deterministic.findings.map((f, i) => <li key={i} className={f.severity === 'normal' ? 'text-gray-700' : 'text-red-800'}>{f.text} <span className="text-gray-400">({f.source})</span></li>)}</ul> : <p className="text-gray-500">No results entered yet.</p>}
          {deterministic.implications.length > 0 && <><p className="mt-1 font-semibold">What this changes</p><ul className="list-disc pl-4">{deterministic.implications.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          <p className="mt-1 text-[11px] text-gray-500">The plan's medicines already follow these results (e.g. iron only once iron deficiency is proven).</p>
        </div>
      )}
      {record?.interpretation?.ai && (
        <div className="rounded-lg border border-purple-300 bg-purple-50 p-2 text-xs">
          <p className="font-semibold text-purple-900">Claude interpretation — AI-drafted, check before use</p>
          <p className="text-purple-900">{record.interpretation.ai.value.interpretation}</p>
          <p className="text-[11px] text-purple-800 mt-1">{record.interpretation.ai.lines.length} recommendation(s) are in the Plan tab to accept or reject.</p>
        </div>
      )}
    </div>
  );
};
