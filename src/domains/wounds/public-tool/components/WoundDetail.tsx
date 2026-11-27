import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, FileText, Pencil, Trash2 } from 'lucide-react';
import { healingAlerts } from '../../services/woundAnalytics';
import { HEALING_STATUS_META } from '../../monitorTypes';
import { getWoundStore } from '../toolDb';
import { analyticsFor, progressEntriesFor } from '../store';
import { blobToBase64 } from '../backup';
import { downloadBlob } from '../deviceStorage';
import type { ToolAssessment, ToolWound } from '../types';
import { Button, Card, fmtArea, fmtDate, usePhotoUrl } from './ui';

const MonitorTrendChart = lazy(() => import('../../components/MonitorTrendChart'));
const WoundHealingMap = lazy(() => import('../../components/WoundHealingMap'));

const METHOD: Record<ToolAssessment['method'], string> = {
  trace: 'Traced on photo', auto: 'Auto from photo', guided: 'Guided capture', manual: 'Typed in',
};

function AssessmentRow({ a, baseline, onDelete }: { a: ToolAssessment; baseline: number | null; onDelete: () => void }) {
  const url = usePhotoUrl(a.photoId);
  const reduction = baseline && baseline > 0 ? ((baseline - a.areaCm2) / baseline) * 100 : null;
  return (
    <li className="py-3 flex gap-3">
      {url
        ? <img src={url} alt={`Wound on ${fmtDate(a.assessedAt)}`} className="w-20 h-20 rounded-xl object-cover border shrink-0" />
        : <div className="w-20 h-20 rounded-xl bg-gray-100 border shrink-0 flex items-center justify-center text-xs text-gray-400">No photo</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-gray-900 whitespace-nowrap">{fmtDate(a.assessedAt)}</span>
          <span className="font-bold tabular-nums whitespace-nowrap">{fmtArea(a.areaCm2)}</span>
        </div>
        <div className="text-sm text-gray-600 tabular-nums">
          {a.lengthCm != null && a.widthCm != null ? `${a.lengthCm} × ${a.widthCm} cm` : ''}
          {a.depthCm != null ? ` × ${a.depthCm} cm deep` : ''}
          {reduction != null && Math.abs(reduction) > 0.05
            ? <span className={reduction > 0 ? 'text-green-700' : 'text-red-700'}> · {reduction > 0 ? '−' : '+'}{Math.abs(reduction).toFixed(0)}%</span>
            : null}
        </div>
        <div className="text-xs text-gray-500">
          {METHOD[a.method]}{a.scaleReliable ? '' : ' · scale uncertain'}
        </div>
        {a.notes ? <p className="text-sm text-gray-700 mt-1 break-words">{a.notes}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete the assessment of ${fmtDate(a.assessedAt)}`}
        className="self-start w-11 h-11 rounded-xl text-gray-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center shrink-0"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </li>
  );
}

export default function WoundDetail({
  woundId, onAssess, onEdit, onDeleted, onChanged,
}: { woundId: string; onAssess: () => void; onEdit: () => void; onDeleted: () => void; onChanged: () => void }) {
  const [wound, setWound] = useState<ToolWound | null | undefined>(undefined);
  const [rows, setRows] = useState<ToolAssessment[]>([]);
  const [version, setVersion] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let live = true;
    const store = getWoundStore();
    Promise.all([store.getWound(woundId), store.listAssessments(woundId)]).then(([w, list]) => {
      if (!live) return;
      setWound(w ?? null);
      setRows(list);
    });
    return () => { live = false; };
  }, [woundId, version]);

  const analytics = useMemo(() => analyticsFor(rows), [rows]);
  const entries = useMemo(() => progressEntriesFor(rows), [rows]);
  const alerts = useMemo(() => healingAlerts(analytics), [analytics]);
  const hasContours = entries.filter(e => e.contourCm?.length).length >= 1;

  if (wound === undefined) return <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />;
  if (wound === null) return <Card><p>This wound is no longer on this phone.</p></Card>;

  const first = rows[0];
  const latest = rows[rows.length - 1];
  const meta = HEALING_STATUS_META[analytics.status];

  const removeWound = async () => {
    if (!window.confirm(`Delete ${wound.patientLabel} (${wound.site}) and all ${rows.length} assessments from this phone? This cannot be undone.`)) return;
    await getWoundStore().deleteWound(wound.id);
    onDeleted();
  };

  const removeAssessment = async (a: ToolAssessment) => {
    if (!window.confirm(`Delete the assessment of ${fmtDate(a.assessedAt)}?`)) return;
    await getWoundStore().deleteAssessment(a.id);
    setVersion(v => v + 1);
    onChanged();
  };

  const exportPdf = async () => {
    setPdfBusy(true);
    setMessage('');
    try {
      const { buildWoundReport, reportFileName } = await import('../report');
      const store = getWoundStore();
      const photos = new Map<string, { dataUrl: string; widthPx?: number; heightPx?: number }>();
      for (const a of [first, latest]) {
        if (!a?.photoId || photos.has(a.id)) continue;
        const p = await store.getPhoto(a.photoId);
        if (p) photos.set(a.id, { dataUrl: `data:${p.mimeType};base64,${await blobToBase64(p.blob)}`, widthPx: p.widthPx, heightPx: p.heightPx });
      }
      const doc = buildWoundReport(wound, rows, photos);
      downloadBlob(doc.output('blob'), reportFileName(wound));
      setMessage('PDF saved to this phone’s downloads.');
    } catch (e) {
      console.error('[WoundTool] PDF failed:', e);
      setMessage('Could not make the PDF.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 break-words">{wound.patientLabel}</h2>
            <p className="text-gray-700 break-words">{wound.site}</p>
            <p className="text-sm text-gray-500 break-words">
              {wound.aetiology || 'Aetiology not recorded'} · first seen {fmtDate(wound.dateFirstSeen)}
            </p>
          </div>
          <button type="button" onClick={onEdit} aria-label="Edit wound details" className="w-11 h-11 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center justify-center shrink-0">
            <Pencil className="w-5 h-5" />
          </button>
        </div>
        <Button className="w-full mt-4" onClick={onAssess}><Camera className="w-5 h-5" /> New assessment</Button>
      </Card>

      {rows.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Healing</h3>
            <span className={`text-sm px-2.5 py-1 rounded-full border ${meta.color}`}>{meta.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Area now" value={fmtArea(latest?.areaCm2)} sub={latest ? fmtDate(latest.assessedAt) : ''} />
            <Stat label="First area" value={fmtArea(first?.areaCm2)} sub={first ? fmtDate(first.assessedAt) : ''} />
            <Stat
              label="Area reduction"
              value={rows.length >= 2 ? `${analytics.percentAreaReduction.toFixed(0)}%` : '-'}
              sub={rows.length >= 2 ? 'since the first assessment' : 'needs 2 assessments'}
              tone={rows.length < 2 ? undefined : analytics.percentAreaReduction > 0 ? 'good' : 'bad'}
            />
            <Stat
              label="Rate"
              value={rows.length >= 2 ? `${analytics.velocityCm2PerWeek.toFixed(2)}` : '-'}
              sub={analytics.projectedDaysToClosure != null ? `cm²/week · closes in ~${analytics.projectedDaysToClosure} d` : 'cm²/week'}
            />
          </div>
          {alerts.length > 0 && (
            <ul className="mt-3 space-y-1">
              {alerts.map((t, i) => (
                <li key={i} className="text-sm text-amber-800 flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{t}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {rows.length > 0 && (
        <Suspense fallback={<div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />}>
          <MonitorTrendChart measurements={entries} />
          {hasContours && (
            <div className="mt-4 bg-white rounded-2xl border p-3 overflow-hidden">
              <h3 className="font-semibold text-gray-900 mb-2">Outline over time</h3>
              <WoundHealingMap measurements={entries} height={260} />
            </div>
          )}
        </Suspense>
      )}

      <Card>
        <h3 className="font-semibold text-gray-900">Assessments ({rows.length})</h3>
        {rows.length === 0
          ? <p className="text-gray-600 mt-2">No assessments yet. Tap “New assessment” to measure the wound.</p>
          : (
            <ul className="divide-y">
              {rows.slice().reverse().map(a => (
                <AssessmentRow key={a.id} a={a} baseline={first?.areaCm2 ?? null} onDelete={() => removeAssessment(a)} />
              ))}
            </ul>
          )}
      </Card>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <Button variant="secondary" onClick={exportPdf} disabled={pdfBusy || rows.length === 0}>
          <FileText className="w-5 h-5" /> {pdfBusy ? 'Making PDF…' : 'PDF report'}
        </Button>
        <Button variant="danger" onClick={removeWound}><Trash2 className="w-5 h-5" /> Delete wound</Button>
      </div>
      {message && <p className="text-sm text-gray-700" role="status">{message}</p>}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-green-700' : tone === 'bad' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="rounded-xl bg-gray-50 p-3 min-w-0">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      {sub ? <div className="text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}
