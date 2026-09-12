/**
 * Skin Graft Monitor — photographic assessment of graft take and donor healing.
 *
 * The clinician's loop is capture → review → confirm. Areas come from tracing
 * the margin on a calibrated photograph, so every percentage is geometry
 * measured against the printed marker rather than a judgement typed into a box.
 *
 * Three views, matching how a graft is actually followed:
 *   episodes → the operations being monitored, worst take surfaced first
 *   episode  → its recipient and donor sites side by side
 *   site     → the serial timeline, and the button that adds to it
 */

import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, Camera, ChevronRight, Layers, Plus, RefreshCw,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient } from '../../../types';
import GroupedSelect from '../../../components/common/GroupedSelect';
import { PatientSelector } from '../../../components/patient/PatientSelector';
import { ANATOMICAL_SITES } from '../../../data/anatomy';
import { assessCanvasQuality } from '../../../services/imageQualityService';
import { detectCalibrationMarker } from '../../../services/woundMeasurementEngine';
import type { Trace } from '../../../services/planimetry';
import {
  createEpisode, listEpisodes, createSite, listSites, recordAssessment,
  summariseEpisode, type SiteSummary,
} from '../services/skinGraftService';
import GraftProgressChart from '../components/GraftProgressChart';
import { HealingPredictionCard, HealingRecommendations } from '../components/HealingOutlook';
import type { GraftSite, GraftType, SkinGraftEpisode, SiteKind } from '../types';

const WoundTracer = lazy(() => import('../../../components/clinical/WoundTracer'));

const GRAFT_TYPES: { value: GraftType; label: string }[] = [
  { value: 'stsg', label: 'Split-thickness (STSG)' },
  { value: 'ftsg', label: 'Full-thickness (FTSG)' },
  { value: 'composite', label: 'Composite' },
  { value: 'allograft', label: 'Allograft' },
  { value: 'xenograft', label: 'Xenograft' },
  { value: 'cultured_epithelium', label: 'Cultured epithelium' },
];

type View =
  | { kind: 'episodes' }
  | { kind: 'episode'; episode: SkinGraftEpisode }
  | { kind: 'site'; episode: SkinGraftEpisode; site: GraftSite };

export default function SkinGraftMonitorPage() {
  const [view, setView] = useState<View>({ kind: 'episodes' });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Skin Graft Monitor</h1>
          <p className="text-sm text-gray-500">
            Graft take and donor healing, measured from traced photographs
          </p>
        </div>
      </header>

      {view.kind === 'episodes' && (
        <EpisodeList onOpen={episode => setView({ kind: 'episode', episode })} />
      )}
      {view.kind === 'episode' && (
        <EpisodeDetail
          episode={view.episode}
          onBack={() => setView({ kind: 'episodes' })}
          onOpenSite={site => setView({ kind: 'site', episode: view.episode, site })}
        />
      )}
      {view.kind === 'site' && (
        <SiteDetail
          episode={view.episode}
          site={view.site}
          onBack={() => setView({ kind: 'episode', episode: view.episode })}
        />
      )}
    </div>
  );
}

// ── Episodes ────────────────────────────────────────────────────────────────

const EpisodeList: React.FC<{ onOpen: (e: SkinGraftEpisode) => void }> = ({ onOpen }) => {
  const [episodes, setEpisodes] = useState<SkinGraftEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setEpisodes(await listEpisodes());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const patientName = (id: string) => {
    const p = patients?.find(x => x.id === id);
    return p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown patient';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Grafts being monitored</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New episode
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
      ) : !episodes.length ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No grafts are being monitored yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Start an episode, add its recipient and donor sites, then photograph each one.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {episodes.map(e => (
            <li key={e.id}>
              <button
                onClick={() => onOpen(e)}
                className="w-full text-left bg-white rounded-xl border p-4 hover:border-teal-300 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">
                    {e.label || GRAFT_TYPES.find(t => t.value === e.graftType)?.label || 'Graft episode'}
                  </div>
                  <div className="text-sm text-gray-500">{patientName(e.patientId)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {e.graftedAt ? `Grafted ${new Date(e.graftedAt).toLocaleDateString()}` : 'Not yet grafted'}
                    {e.meshRatio ? ` · meshed 1:${e.meshRatio}` : ''}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <NewEpisodeModal
          onClose={() => setCreating(false)}
          onCreated={e => { setCreating(false); load(); onOpen(e); }}
        />
      )}
    </div>
  );
};

const NewEpisodeModal: React.FC<{
  onClose: () => void;
  onCreated: (e: SkinGraftEpisode) => void;
}> = ({ onClose, onCreated }) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [graftType, setGraftType] = useState<GraftType>('stsg');
  const [meshRatio, setMeshRatio] = useState('1.5');
  const [graftedAt, setGraftedAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!patient) { setError('Select a patient.'); return; }
    setSaving(true);
    try {
      const episode = await createEpisode({
        patientId: patient.id,
        hospitalId: patient.registeredHospitalId,
        graftType,
        meshRatio: Number(meshRatio) || undefined,
        graftedAt: graftedAt ? new Date(graftedAt).toISOString() : undefined,
        createdBy: user?.id,
        label: `${GRAFT_TYPES.find(t => t.value === graftType)?.label}`,
      });
      onCreated(episode);
    } catch (e: any) {
      setError(e?.message || 'Could not create the episode.');
      setSaving(false);
    }
  };

  return (
    <Modal title="New graft episode" onClose={onClose}>
      <div className="space-y-3">
        {/* The shared selector searches the patient database and can register a
            new patient inline, so a graft can be started for someone who has
            just arrived without leaving this screen. */}
        <PatientSelector
          label="Patient"
          required
          value={patient?.id}
          onChange={(_id, p) => setPatient(p ?? null)}
          placeholder="Search by name or folder number…"
        />

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Graft type</span>
          <select value={graftType} onChange={e => setGraftType(e.target.value as GraftType)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {GRAFT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Mesh expansion (1:x)</span>
            <input value={meshRatio} onChange={e => setMeshRatio(e.target.value)}
              placeholder="1 for unmeshed" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Date grafted</span>
            <input type="date" value={graftedAt} onChange={e => setGraftedAt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Postoperative day is counted from the graft date, so the timeline and healing
          prediction depend on it.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            Create episode
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── One episode ─────────────────────────────────────────────────────────────

const EpisodeDetail: React.FC<{
  episode: SkinGraftEpisode;
  onBack: () => void;
  onOpenSite: (s: GraftSite) => void;
}> = ({ episode, onBack, onOpenSite }) => {
  const [summaries, setSummaries] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingKind, setAddingKind] = useState<SiteKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSummaries(await summariseEpisode(episode.id));
    setLoading(false);
  }, [episode.id]);
  useEffect(() => { load(); }, [load]);

  const recipients = summaries.filter(s => s.site.kind === 'recipient');
  const donors = summaries.filter(s => s.site.kind === 'donor');

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> All episodes
      </button>

      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {episode.label || 'Graft episode'}
        </h2>
        <p className="text-sm text-gray-500">
          {episode.graftedAt ? `Grafted ${new Date(episode.graftedAt).toLocaleDateString()}` : 'Not yet grafted'}
          {episode.meshRatio ? ` · meshed 1:${episode.meshRatio}` : ''}
        </p>
      </div>

      {loading ? (
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SiteColumn
            title="Recipient sites" kind="recipient" summaries={recipients}
            onAdd={() => setAddingKind('recipient')} onOpen={onOpenSite}
          />
          <SiteColumn
            title="Donor sites" kind="donor" summaries={donors}
            onAdd={() => setAddingKind('donor')} onOpen={onOpenSite}
          />
        </div>
      )}

      {addingKind && (
        <NewSiteModal
          episode={episode} kind={addingKind}
          onClose={() => setAddingKind(null)}
          onCreated={() => { setAddingKind(null); load(); }}
        />
      )}
    </div>
  );
};

const SiteColumn: React.FC<{
  title: string;
  kind: SiteKind;
  summaries: SiteSummary[];
  onAdd: () => void;
  onOpen: (s: GraftSite) => void;
}> = ({ title, kind, summaries, onAdd, onOpen }) => (
  <div className="bg-white rounded-xl border p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <button onClick={onAdd} className="text-xs text-teal-700 hover:text-teal-900 flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    </div>

    {!summaries.length ? (
      <p className="text-sm text-gray-400 py-4">
        No {kind} site recorded yet.
      </p>
    ) : (
      <ul className="space-y-2">
        {summaries.map(s => (
          <li key={s.site.id}>
            <button onClick={() => onOpen(s.site)}
              className="w-full text-left rounded-lg border p-3 hover:border-teal-300">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {[s.site.anatomicalLocation, s.site.bodySide].filter(Boolean).join(' · ') || 'Site'}
                </span>
                <span className="text-base font-semibold tabular-nums text-gray-900">
                  {s.currentPercent === null ? '—' : `${s.currentPercent}%`}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {kind === 'recipient' ? 'graft take' : 're-epithelialised'}
                {' · '}
                {s.assessments.length} assessment{s.assessments.length === 1 ? '' : 's'}
                {s.site.baselineAreaCm2 != null ? ` · baseline ${s.site.baselineAreaCm2} cm²` : ''}
              </div>
              {s.prediction?.predictedClosurePodFrom != null && (
                <div className="text-xs text-teal-700 mt-1">
                  Projected closure POD {s.prediction.predictedClosurePodFrom}–{s.prediction.predictedClosurePodTo}
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const NewSiteModal: React.FC<{
  episode: SkinGraftEpisode;
  kind: SiteKind;
  onClose: () => void;
  onCreated: () => void;
}> = ({ episode, kind, onClose, onCreated }) => {
  const [location, setLocation] = useState('');
  const [side, setSide] = useState('Left');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!location.trim()) { setError('Select the anatomical site.'); return; }
    setSaving(true);
    try {
      await createSite({
        episodeId: episode.id,
        patientId: episode.patientId,
        kind,
        anatomicalLocation: location,
        bodySide: side,
      });
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'Could not add the site.');
      setSaving(false);
    }
  };

  return (
    <Modal title={kind === 'recipient' ? 'Add recipient site' : 'Add donor site'} onClose={onClose}>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Anatomical site *</span>
          <GroupedSelect
            value={location} onChange={setLocation} groups={ANATOMICAL_SITES}
            placeholder="Select the site…" otherPlaceholder="Describe the site"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Body side</span>
          <select value={side} onChange={e => setSide(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {['Left', 'Right', 'Midline', 'Bilateral'].map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <p className="text-xs text-gray-500">
          The first traced photograph sets this site's baseline area. Every take or
          re-epithelialization figure afterwards is measured against it.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            Add site
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── One site ────────────────────────────────────────────────────────────────

const SiteDetail: React.FC<{
  episode: SkinGraftEpisode;
  site: GraftSite;
  onBack: () => void;
}> = ({ episode, site, onBack }) => {
  const [summary, setSummary] = useState<SiteSummary | null>(null);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async () => {
    const sites = await listSites(episode.id);
    const fresh = sites.find(s => s.id === site.id) ?? site;
    // Comorbidities steer the guidance, so they are read from the patient
    // record rather than asked for again here.
    const patient = await db.patients.get(site.patientId);
    const all = await summariseEpisode(episode.id, {
      chronicConditions: patient?.chronicConditions,
    });
    setSummary(all.find(s => s.site.id === fresh.id) ?? null);
  }, [episode.id, site]);
  useEffect(() => { load(); }, [load]);

  const isRecipient = site.kind === 'recipient';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> {episode.label || 'Episode'}
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {[site.anatomicalLocation, site.bodySide].filter(Boolean).join(' · ') || 'Site'}
          </h2>
          <p className="text-sm text-gray-500">
            {isRecipient ? 'Recipient site — graft take' : 'Donor site — re-epithelialization'}
            {summary?.site.baselineAreaCm2 != null
              ? ` · baseline ${summary.site.baselineAreaCm2} cm²` : ' · no baseline yet'}
          </p>
        </div>
        <button onClick={() => setCapturing(true)}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
          <Camera className="w-4 h-4" /> New assessment
        </button>
      </div>

      {summary && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <GraftProgressChart
                series={summary.series}
                kind={site.kind}
                prediction={summary.prediction}
                baselineAreaCm2={summary.site.baselineAreaCm2}
                undatedAssessments={summary.undatedAssessments}
              />
            </div>
            <HealingPredictionCard
              prediction={summary.prediction}
              latestPod={summary.latest?.postOpDay ?? null}
            />
          </div>

          <HealingRecommendations recommendations={summary.recommendations} />
        </>
      )}

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Assessment timeline</h3>
        {!summary?.assessments.length ? (
          <p className="text-sm text-gray-400">
            No assessments yet. Photograph the site with the green marker in frame, then trace it.
          </p>
        ) : (
          <ul className="divide-y">
            {summary.assessments.map(a => {
              const percent = isRecipient ? a.graft?.takePercent : a.donor?.epithelializedPercent;
              const healed = isRecipient ? a.graft?.healedPercent : a.donor?.epithelializedPercent;
              return (
                <li key={a.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {a.postOpDay !== null ? `POD ${a.postOpDay}` : 'Undated'}
                      <span className="ml-2 text-gray-400 font-normal">
                        {new Date(a.capturedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {a.measurement?.areaCm2 != null ? `${a.measurement.areaCm2} cm² traced` : 'not measured'}
                      {a.imageQuality?.score != null ? ` · image quality ${a.imageQuality.score}%` : ''}
                    </div>
                    {a.uncertaintyReasons?.length ? (
                      <div className="text-xs text-amber-700 flex items-start gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        {a.uncertaintyReasons[0]}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-semibold tabular-nums text-gray-900 block">
                      {percent == null ? '—' : `${percent}%`}
                    </span>
                    <span className="text-[11px] text-gray-400 block">
                      {isRecipient
                        ? (healed == null ? 'take' : `take · ${healed}% closed`)
                        : 'epithelialised'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {capturing && (
        <CaptureModal
          episode={episode} site={site}
          onClose={() => setCapturing(false)}
          onSaved={() => { setCapturing(false); load(); }}
        />
      )}
    </div>
  );
};

// ── Capture ─────────────────────────────────────────────────────────────────

const CaptureModal: React.FC<{
  episode: SkinGraftEpisode;
  site: GraftSite;
  onClose: () => void;
  onSaved: () => void;
}> = ({ episode, site, onClose, onSaved }) => {
  const { user } = useAuth();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prepared, setPrepared] = useState<{
    dataUrl: string;
    pxPerCm: number | null;
    quality: ReturnType<typeof assessCanvasQuality>;
  } | null>(null);

  const prepare = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not read the photograph.');
      ctx.drawImage(bitmap, 0, 0);

      // The gate runs before anything else: a frame that cannot be measured
      // honestly should be re-shot while the patient is still in front of you.
      const quality = assessCanvasQuality(canvas);

      let pxPerCm: number | null = null;
      try {
        const cal = await detectCalibrationMarker(canvas);
        if (cal?.pixelsPerCm) pxPerCm = cal.pixelsPerCm;
      } catch { /* reported by the gate's calibration check */ }

      setPrepared({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), pxPerCm, quality });
    } catch (e: any) {
      setError(e?.message || 'Could not read the photograph.');
    } finally {
      setBusy(false);
    }
  };

  const save = async (traces: Trace[], annotated: string) => {
    if (!prepared) return;
    setBusy(true);
    try {
      await recordAssessment({
        episode, site, traces,
        pixelsPerCm: prepared.pxPerCm,
        imageQuality: prepared.quality,
        photo: { imageData: annotated, hasContourOverlay: true },
        assessedBy: user?.id,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save the assessment.');
      setBusy(false);
    }
  };

  // Recipient sites are judged on what has failed; donor sites on what has
  // healed. The palette follows.
  const surfaceKinds = site.kind === 'recipient'
    ? (['necrotic', 'slough'] as const)
    : (['raw', 'slough', 'epithelialised'] as const);

  return (
    <Modal title={site.kind === 'recipient' ? 'Assess graft' : 'Assess donor site'} onClose={onClose} wide>
      {!prepared ? (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) prepare(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="w-full py-8 border-2 border-dashed border-teal-300 rounded-xl text-teal-700 hover:bg-teal-50 flex flex-col items-center gap-2 disabled:opacity-60">
            <Camera className="w-7 h-7" />
            <span className="text-sm font-medium">{busy ? 'Checking the photograph…' : 'Capture or upload photo'}</span>
            <span className="text-xs text-gray-500">
              Green marker flat beside the site — it sets the scale everything is measured in
            </span>
          </button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      ) : prepared.quality.verdict === 'recapture' ? (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-medium text-red-800">
              This photograph cannot be measured reliably ({prepared.quality.score}%)
            </p>
            <ul className="mt-1.5 space-y-1">
              {prepared.quality.problems.map((p, i) => (
                <li key={i} className="text-xs text-red-700">{p}</li>
              ))}
            </ul>
          </div>
          <img src={prepared.dataUrl} alt="Rejected frame" className="w-full rounded-lg border" />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
            <button onClick={() => setPrepared(null)}
              className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">
              Retake
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-lg px-3 py-2 text-xs ${
            prepared.quality.verdict === 'accept'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            Image quality {prepared.quality.score}%
            {prepared.quality.problems.length > 0 && ` — ${prepared.quality.problems[0]}`}
          </div>
          <Suspense fallback={<div className="h-48 bg-gray-50 rounded-xl animate-pulse" />}>
            <WoundTracer
              imageSrc={prepared.dataUrl}
              pixelsPerCm={prepared.pxPerCm}
              surfaceKinds={[...surfaceKinds]}
              onCancel={() => setPrepared(null)}
              onComplete={({ traces, annotatedDataUrl }) => save(traces, annotatedDataUrl)}
            />
          </Suspense>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </Modal>
  );
};

// ── Shared ──────────────────────────────────────────────────────────────────

const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <Activity className="w-4 h-4 rotate-45" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
