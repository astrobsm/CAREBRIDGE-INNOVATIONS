/**
 * /surgery/outcomes — the surgeon's audit: operations, recorded 30-day
 * outcomes, SSI rate (CDC categories), Clavien–Dindo grades, return to
 * theatre, readmission, VTE and death, by procedure and by wound class; and
 * the outcome checks that are due.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subMonths } from 'date-fns';
import { db } from '../../../database';
import { summariseOutcomes, outcomesDue, pct } from '../journey/outcomes';
import { GRADE_ORDER } from '../journey/clavienDindo';
import { woundClassLabel } from '../journey/whoChecklist';
import type { SurgicalWoundClass } from '../../../types';

const RANGES = [{ id: '3', label: '3 months' }, { id: '12', label: '12 months' }, { id: 'all', label: 'All' }] as const;

export default function OutcomesSummaryPage() {
  const surgeries = useLiveQuery(() => db.surgeries.toArray(), []);
  const outcomes = useLiveQuery(() => db.surgicalOutcomes.toArray(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const [range, setRange] = useState<typeof RANGES[number]['id']>('12');
  const now = new Date();
  const s = useMemo(() => (surgeries && outcomes
    ? summariseOutcomes(surgeries, outcomes, range === 'all' ? undefined : { from: subMonths(new Date(), Number(range)) }) : undefined), [surgeries, outcomes, range]);
  const due = useMemo(() => (surgeries && outcomes ? outcomesDue(surgeries, outcomes, now) : []), [surgeries, outcomes]);
  const name = (id: string) => { const p = patients?.find(x => x.id === id); return p ? `${p.firstName} ${p.lastName}` : ''; };

  if (!s) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  const maxGrade = Math.max(1, ...GRADE_ORDER.map(g => s.byHighestGrade[g]));
  const tile = (label: string, value: string, sub?: string) => (
    <div className="bg-white rounded-lg shadow-sm border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4" data-testid="outcomes-summary">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Surgical outcomes</h1>
          <p className="text-sm text-gray-500">30-day outcomes (90 with an implant). SSI: CDC/NHSN. Complications: Clavien–Dindo.</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.id} type="button" onClick={() => setRange(r.id)}
              className={`px-3 py-1 text-xs rounded-full border ${range === r.id ? 'bg-gray-900 text-white' : 'bg-white'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tile('Operations', String(s.operations), `${s.recorded} outcomes recorded`)}
        {tile('SSI rate', pct(s.ssiRate), `${s.ssi} of ${s.recorded}`)}
        {tile('Any complication', s.recorded ? pct(s.withComplication / s.recorded) : '—', `${s.withComplication} of ${s.recorded}`)}
        {tile('Return to theatre', String(s.returnToTheatre), `Readmission ${s.readmission} · VTE ${s.vte} · Death ${s.death}`)}
      </div>

      <section className="bg-white rounded-lg shadow-sm border p-3">
        <h2 className="text-sm font-semibold mb-2">Highest Clavien–Dindo grade per operation</h2>
        <ul className="space-y-1">
          {GRADE_ORDER.map(g => (
            <li key={g} className="flex items-center gap-2 text-sm">
              <span className="w-12 text-gray-600">{g}</span>
              <span className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                <span className="block h-4 bg-slate-600" style={{ width: `${(s.byHighestGrade[g] / maxGrade) * 100}%` }} />
              </span>
              <span className="w-8 text-right tabular-nums">{s.byHighestGrade[g]}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-2">SSI: superficial {s.ssiByCategory.superficial_incisional} · deep {s.ssiByCategory.deep_incisional} · organ/space {s.ssiByCategory.organ_space}</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-3 overflow-x-auto">
        <h2 className="text-sm font-semibold mb-2">By procedure</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500"><th className="py-1 pr-2">Procedure</th><th className="pr-2">Ops</th><th className="pr-2">Recorded</th><th className="pr-2">SSI</th><th className="pr-2">Compl.</th><th>≥ III</th></tr></thead>
          <tbody>
            {s.byProcedure.map(p => (
              <tr key={p.procedure} className="border-t">
                <td className="py-1 pr-2">{p.procedure}</td><td className="pr-2">{p.operations}</td><td className="pr-2">{p.recorded}</td>
                <td className="pr-2">{p.ssi} ({pct(p.ssiRate)})</td><td className="pr-2">{p.withComplication}</td>
                <td>{(['IIIa', 'IIIb', 'IVa', 'IVb', 'V'] as const).reduce((n, g) => n + p.byHighestGrade[g], 0)}</td>
              </tr>
            ))}
            {!s.byProcedure.length && <tr><td colSpan={6} className="py-3 text-gray-500">No completed operations in this period.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-3">
        <h2 className="text-sm font-semibold mb-2">SSI by wound class</h2>
        <ul className="text-sm space-y-1">
          {s.byWoundClass.map(w => (
            <li key={w.woundClass} className="flex justify-between"><span>{w.woundClass === 'not recorded' ? 'Not recorded' : woundClassLabel(w.woundClass as SurgicalWoundClass)}</span><span>{w.ssi} / {w.recorded} ({pct(w.ssiRate)})</span></li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-lg shadow-sm border p-3">
        <h2 className="text-sm font-semibold mb-2">Outcome checks due ({due.length})</h2>
        {!due.length && <p className="text-sm text-gray-500">None due.</p>}
        <ul className="divide-y">
          {due.map(d => (
            <li key={d.surgery.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0"><span className="block font-medium truncate">{name(d.surgery.patientId)}</span>
                <span className="block text-xs text-gray-500">{d.surgery.procedureName} · window ends {format(d.dueDate, 'd MMM')}{d.state === 'overdue' ? ' (overdue)' : ''}</span></span>
              <Link to={`/surgery/outcome/${d.surgery.id}`} className="text-blue-600 text-sm flex-shrink-0">Record</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
