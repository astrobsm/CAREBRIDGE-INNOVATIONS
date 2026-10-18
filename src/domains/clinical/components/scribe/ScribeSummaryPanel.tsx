/**
 * Medical Scribe Summary — the whole record as one note, built from the
 * structured clerking first, with key points, evidence-backed findings, the
 * draft treatment plan for consultant approval and (once approved) its
 * implementation.
 *
 * Live: every record it reads is a Dexie live query, so the note is rebuilt
 * the moment anything changes — an approval, a logged step, a result, or a
 * sync pull from another device. (The original polled its server every 30 s;
 * here the database tells us.)
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Download, FileText, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../../database';
import { createSafePDF } from '../../../../utils/pdfTextSafe';
import { forPatient } from '../../scribe/scribeService';
import { buildScribeSummary, type ScribeSources } from '../../scribe/scribeSummary';
import { ScribeTreatmentPlanPanel } from './ScribeTreatmentPlanPanel';

/** Everything the scribe reads about one patient, from this device's database. */
async function loadSources(patientId: string): Promise<ScribeSources | null> {
  const patient = await db.patients.get(patientId);
  if (!patient) return null;
  const [admissions, encounters, rounds, prescriptions, investigations, vitals, surgeries, problems, planItems, scribe] = await Promise.all([
    db.admissions.where('patientId').equals(patientId).toArray(),
    db.clinicalEncounters.where('patientId').equals(patientId).toArray(),
    db.wardRounds.toArray(),
    db.prescriptions.where('patientId').equals(patientId).toArray(),
    db.investigations.where('patientId').equals(patientId).toArray(),
    db.vitalSigns.where('patientId').equals(patientId).toArray(),
    db.surgeries.where('patientId').equals(patientId).toArray(),
    db.clinicalProblems.where('patientId').equals(patientId).toArray(),
    db.clinicalPlanItems.where('patientId').equals(patientId).toArray(),
    forPatient(patientId),
  ]);
  return {
    patient, admissions, encounters, prescriptions, investigations, surgeries, scribe,
    problems: problems.filter(p => p.status !== 'withdrawn'),
    planItems: planItems.filter(p => p.status !== 'withdrawn'),
    vitals: vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    wardRoundEntries: rounds.flatMap(r => (r.patients || []).filter(p => p.patientId === patientId).map(p => ({
      date: r.roundDate, roundType: r.roundType, doctor: r.leadDoctorName, diagnosis: p.diagnosis, notes: p.notes, orders: p.orders,
    }))),
  };
}

const SECTIONS = ['keyPoints', 'findings', 'vitals', 'content', 'problems', 'meds', 'pending', 'plan'] as const;
type SectionKey = typeof SECTIONS[number];

export function ScribeSummaryPanel({ patientId }: { patientId: string }) {
  const sources = useLiveQuery(() => loadSources(patientId), [patientId]);
  const summary = sources ? buildScribeSummary(sources) : null;
  const [open, setOpen] = useState<Set<SectionKey>>(new Set(['keyPoints', 'findings', 'problems', 'plan']));
  const toggle = (k: SectionKey) => setOpen(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  if (sources === undefined) return <p className="text-sm text-gray-500">Generating medical scribe summary…</p>;
  if (!sources || !summary) return null;

  const plain = summary.content.replace(/\*\*/g, '');
  const name = `${sources.patient.firstName} ${sources.patient.lastName}`.trim();
  const critical = summary.findings.filter(f => f.severity === 'critical');

  const copy = () => { void navigator.clipboard?.writeText(plain); toast.success('Copied'); };
  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    w.document.write(`<html><head><title>Medical Scribe Summary — ${esc(name)}</title></head><body style="font-family:monospace;white-space:pre-wrap;font-size:11px">${esc(plain)}</body></html>`);
    w.document.close();
    w.print();
  };
  const pdf = () => {
    const doc = createSafePDF('p', 'mm', 'a4');
    const margin = 12.7, width = doc.internal.pageSize.getWidth() - 2 * margin, bottom = doc.internal.pageSize.getHeight() - margin;
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    let y = margin;
    for (const raw of plain.split('\n')) {
      for (const l of doc.splitTextToSize(raw || ' ', width) as string[]) {
        if (y > bottom) { doc.addPage(); y = margin; }
        doc.text(l, margin, y);
        y += 3.6;
      }
    }
    doc.save(`scribe-summary-${(sources.patient.hospitalNumber || patientId).replace(/[^\w-]+/g, '_')}.pdf`);
  };

  const Head = ({ k, title }: { k: SectionKey; title: string }) => (
    <button onClick={() => toggle(k)} className="w-full flex items-center justify-between text-left">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <span className="text-gray-400 text-xs">{open.has(k) ? '▼' : '▶'}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <h3 className="text-red-800 font-semibold mb-2">Critical findings ({critical.length})</h3>
          <div className="space-y-2">
            {critical.map((f, i) => (
              <div key={i} className="bg-red-100 rounded-lg p-3">
                <p className="text-red-900 font-medium text-sm">[{f.specialty}] {f.finding}</p>
                <p className="text-red-700 text-xs mt-1">&rarr; {f.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-4 py-3 border-b bg-gradient-to-r from-green-50 to-white flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-700" /> Medical Scribe Summary
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Data sources: clerking, encounters, ward rounds, prescriptions, investigations, vitals, plan log
              <span className="ml-1 inline-flex items-center gap-1 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />live</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {summary.findings.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{summary.findings.length} specialty findings</span>}
            <button onClick={copy} className="p-1.5 rounded-lg border hover:bg-gray-50" title="Copy the note"><Copy className="w-4 h-4" /></button>
            <button onClick={print} className="p-1.5 rounded-lg border hover:bg-gray-50" title="Print"><Printer className="w-4 h-4" /></button>
            <button onClick={pdf} className="p-1.5 rounded-lg border hover:bg-gray-50" title="Download PDF"><Download className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="px-4 py-3 border-b">
          <Head k="keyPoints" title={`Key Clinical Points (${summary.keyPoints.length})`} />
          {open.has('keyPoints') && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {summary.keyPoints.map((point, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${point.startsWith('!!') ? 'bg-yellow-100 text-yellow-800' : point.startsWith('CRITICAL') ? 'bg-red-100 text-red-800' : 'bg-green-50 text-green-800'}`}>{point}</span>
              ))}
            </div>
          )}
        </div>

        {summary.findings.length > 0 && (
          <div className="px-4 py-3 border-b">
            <Head k="findings" title={`Clinical recommendations (${summary.findings.length})`} />
            {open.has('findings') && (
              <ul className="space-y-1.5 mt-2">
                {summary.findings.map((f, i) => (
                  <li key={i} className={`rounded-lg border p-2.5 text-sm ${f.severity === 'critical' ? 'bg-red-50 border-red-200' : f.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="font-medium text-gray-900">[{f.specialty}] {f.finding}</p>
                    <p className="text-xs text-gray-700">&rarr; {f.recommendation}</p>
                    <p className="text-[11px] text-gray-500">Evidence: {f.evidence}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {summary.vitalTrends.length > 0 && (
          <div className="px-4 py-3 border-b">
            <Head k="vitals" title="Vital Signs" />
            {open.has('vitals') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                {summary.vitalTrends.map((vt, i) => (
                  <div key={i} className={`rounded-lg p-2.5 text-center ${vt.alert ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-[10px] text-gray-500 font-medium uppercase">{vt.parameter}</p>
                    <p className={`text-base font-bold ${vt.alert ? 'text-red-700' : 'text-gray-900'}`}>{vt.current}</p>
                    {vt.previous && <p className="text-[10px] text-gray-400">{vt.direction === 'rising' ? '↑' : vt.direction === 'falling' ? '↓' : '→'} from {vt.previous}</p>}
                    {vt.alert && <p className="text-[10px] text-red-600 font-semibold mt-0.5">{vt.alert}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-b">
          <Head k="content" title="Full Scribe Note" />
          {open.has('content') && (
            <div className="mt-2 bg-gray-50 rounded-lg p-4 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto font-mono">
              {summary.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith('**') && part.endsWith('**')
                ? <strong key={i} className="text-green-700 font-semibold">{part.replace(/\*\*/g, '')}</strong>
                : <span key={i}>{part}</span>))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b">
          <Head k="problems" title={`Active Problems (${summary.currentProblems.length})`} />
          {open.has('problems') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {summary.currentProblems.map((p, i) => <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-2.5"><span className="text-red-800 text-sm font-medium">{p}</span></div>)}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-b">
          <Head k="meds" title={`Current Medications (${summary.medications.length})`} />
          {open.has('meds') && (
            <div className="space-y-1.5 mt-2">
              {summary.medications.map((m, i) => <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-2.5"><span className="text-blue-800 text-sm">{m}</span></div>)}
            </div>
          )}
        </div>

        {summary.pendingInvestigations.length > 0 && (
          <div className="px-4 py-3 border-b">
            <Head k="pending" title={`Pending Investigations (${summary.pendingInvestigations.length})`} />
            {open.has('pending') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {summary.pendingInvestigations.map((inv, i) => <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5"><span className="text-yellow-800 text-sm">{inv}</span></div>)}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-b">
          <ScribeTreatmentPlanPanel
            patientId={patientId}
            hospitalId={sources.patient.hospitalId || sources.patient.registeredHospitalId}
            draft={summary.scribePlan}
            findings={summary.findings}
            defaultPlace={summary.place}
          />
        </div>

        <div className="px-4 py-3">
          <Head k="plan" title={`Management Plan (${summary.plan.length})`} />
          {open.has('plan') && (
            <ol className="space-y-1.5 mt-2">
              {summary.plan.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-gray-700 text-sm">{item}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScribeSummaryPanel;
