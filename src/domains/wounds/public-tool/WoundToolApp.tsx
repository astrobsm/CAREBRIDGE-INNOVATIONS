/**
 * AstroHEALTH Wound Measure: the public, no-login wound tool at /wound-tool.
 *
 * Its own small app: no EMR layout, no sign-in, no sync. Records stay in this
 * browser (toolDb.ts). Screens are kept in the URL hash (route.ts).
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Database, LogIn, Plus, ShieldAlert } from 'lucide-react';
import { HEALING_STATUS_META } from '../monitorTypes';
import { getWoundStore } from './toolDb';
import type { WoundSummary } from './store';
import { parseHash, viewHash, type ToolView } from './route';
import { getLastBackupAt, readStorageState, type StorageState } from './deviceStorage';
import type { ToolWound } from './types';
import WoundForm from './components/WoundForm';
import AssessmentForm from './components/AssessmentForm';
import WoundDetail from './components/WoundDetail';
import DataView, { StorageBadge } from './components/DataView';
import { Button, Card, fmtArea, fmtDate } from './components/ui';

export const TOOL_TITLE = 'AstroHEALTH Wound Measure';
export const PRACTICE = 'AstroHEALTH Services, Enugu';
export const DATA_NOTICE =
  'Data stays only on this phone. Nothing is uploaded. Clearing the browser or losing the phone loses it — export a backup.';
export const PRIVACY_NOTICE =
  'Use initials or a bed number, not full patient names. Follow your facility’s photo-consent rules.';
/** The EMR's sign-in, for AstroHEALTH staff. A full page load, not a route change. */
export const STAFF_SIGN_IN_URL = '/login';

const BACKUP_NUDGE_DAYS = 7;

function useHashView(): [ToolView, (v: ToolView, replace?: boolean) => void] {
  const [view, setView] = useState<ToolView>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setView(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);
  const go = useCallback((v: ToolView, replace = false) => {
    const url = `${window.location.pathname}${window.location.search}${viewHash(v)}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setView(v);
    window.scrollTo(0, 0);
  }, []);
  return [view, go];
}

function WoundCard({ w, onOpen }: { w: WoundSummary; onOpen: () => void }) {
  const meta = HEALING_STATUS_META[w.analytics.status];
  const reduction = w.assessmentCount >= 2 ? w.analytics.percentAreaReduction : null;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:border-teal-500 active:bg-gray-50 min-h-[72px]"
      >
        <span className={`w-3 h-3 rounded-full shrink-0 ${meta.dot}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-gray-900 truncate">{w.patientLabel}</span>
          <span className="block text-sm text-gray-600 truncate">{w.site}</span>
          <span className="block text-xs text-gray-500">
            {w.assessmentCount === 0
              ? 'No assessments yet'
              : `${w.assessmentCount} assessment${w.assessmentCount === 1 ? '' : 's'} · last ${fmtDate(w.latestAssessedAt)}`}
          </span>
        </span>
        <span className="text-right shrink-0">
          <span className="block font-bold tabular-nums">{fmtArea(w.latestAreaCm2)}</span>
          {reduction != null && (
            <span className={`block text-xs font-medium ${reduction > 0 ? 'text-green-700' : 'text-red-700'}`}>
              {reduction > 0 ? '−' : '+'}{Math.abs(reduction).toFixed(0)}% area
            </span>
          )}
        </span>
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
      </button>
    </li>
  );
}

export default function WoundToolApp() {
  const [view, go] = useHashView();
  const [wounds, setWounds] = useState<WoundSummary[] | null>(null);
  const [editing, setEditing] = useState<ToolWound | null>(null);
  const [assessFor, setAssessFor] = useState<ToolWound | null>(null);
  const [storage, setStorage] = useState<StorageState | null>(null);
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState('');
  const refresh = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    document.title = TOOL_TITLE;
  }, []);

  useEffect(() => {
    getWoundStore().listWounds().then(setWounds).catch(e => {
      console.error('[WoundTool] Could not open storage:', e);
      setLoadError('This browser would not open its storage. Try another browser, or leave private mode.');
      setWounds([]);
    });
    readStorageState().then(setStorage);
  }, [version]);

  // Screens that need a wound record load it from the id in the URL.
  const woundIdInView = view.name === 'edit' || view.name === 'assess' ? view.id : null;
  useEffect(() => {
    if (!woundIdInView) return;
    getWoundStore().getWound(woundIdInView).then(w => {
      if (view.name === 'edit') setEditing(w ?? null);
      if (view.name === 'assess') setAssessFor(w ?? null);
    });
  }, [woundIdInView, view.name]);

  const back = () => {
    if (view.name === 'assess' || view.name === 'edit') go({ name: 'wound', id: view.id });
    else go({ name: 'list' });
  };

  const lastBackup = getLastBackupAt();
  const totalAssessments = (wounds ?? []).reduce((s, w) => s + w.assessmentCount, 0);
  const backupDue = totalAssessments > 0 &&
    (!lastBackup || Date.now() - new Date(lastBackup).getTime() > BACKUP_NUDGE_DAYS * 86_400_000);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden">
      <header className="bg-teal-800 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          {view.name !== 'list' ? (
            <button type="button" onClick={back} aria-label="Back" className="w-11 h-11 -ml-2 rounded-xl flex items-center justify-center hover:bg-teal-700">
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-base xs:text-lg font-bold leading-tight">{TOOL_TITLE}</h1>
            <p className="text-xs text-teal-100 truncate">{PRACTICE}</p>
          </div>
          <a
            href={STAFF_SIGN_IN_URL}
            className="shrink-0 inline-flex items-center gap-1 min-h-[44px] px-3 rounded-xl text-sm font-medium text-teal-50 hover:bg-teal-700"
          >
            <LogIn className="w-4 h-4" /> Staff sign in
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-16">
        {view.name === 'list' && (
          <>
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 space-y-2" role="note">
              <p className="flex gap-2 font-medium">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{DATA_NOTICE}</span>
              </p>
              <p className="text-sm pl-7">{PRIVACY_NOTICE}</p>
            </div>

            {loadError && <p className="text-red-700" role="alert">{loadError}</p>}

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
              <Button onClick={() => go({ name: 'new' })}><Plus className="w-5 h-5" /> New wound</Button>
              <Button variant="secondary" onClick={() => go({ name: 'data' })}><Database className="w-5 h-5" /> Backup &amp; data</Button>
            </div>

            {backupDue && (
              <button type="button" onClick={() => go({ name: 'data' })} className="w-full text-left text-sm rounded-xl bg-white border border-gray-300 p-3 min-h-[48px]">
                {lastBackup ? `Last backup ${fmtDate(lastBackup)}.` : 'No backup yet.'} <span className="font-semibold text-teal-800 underline">Export a backup now</span>
              </button>
            )}

            {wounds === null
              ? <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              : wounds.length === 0
                ? (
                  <Card className="text-center space-y-2">
                    <p className="font-semibold">No wounds on this phone yet</p>
                    <p className="text-sm text-gray-600">Add a wound, then photograph it beside the green marker or a ruler to measure it.</p>
                  </Card>
                )
                : (
                  <ul className="space-y-3" aria-label="Wounds">
                    {wounds.map(w => <WoundCard key={w.id} w={w} onOpen={() => go({ name: 'wound', id: w.id })} />)}
                  </ul>
                )}

            <div className="pt-2"><StorageBadge state={storage} /></div>
          </>
        )}

        {view.name === 'new' && (
          <WoundForm
            onCancel={() => go({ name: 'list' })}
            onSaved={w => { refresh(); go({ name: 'wound', id: w.id }, true); }}
          />
        )}

        {view.name === 'edit' && (
          editing && editing.id === view.id
            ? <WoundForm existing={editing} onCancel={back} onSaved={() => { refresh(); go({ name: 'wound', id: view.id }, true); }} />
            : <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        )}

        {view.name === 'wound' && (
          <WoundDetail
            key={`${view.id}:${version}`}
            woundId={view.id}
            onAssess={() => go({ name: 'assess', id: view.id })}
            onEdit={() => go({ name: 'edit', id: view.id })}
            onDeleted={() => { refresh(); go({ name: 'list' }, true); }}
            onChanged={refresh}
          />
        )}

        {view.name === 'assess' && (
          assessFor && assessFor.id === view.id
            ? (
              <AssessmentForm
                wound={assessFor}
                onCancel={back}
                onSaved={() => { refresh(); go({ name: 'wound', id: view.id }, true); }}
              />
            )
            : <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        )}

        {view.name === 'data' && <DataView onChanged={refresh} />}
      </main>

      <footer className="max-w-2xl mx-auto px-4 pb-8 text-xs text-gray-500 space-y-1">
        <p>{TOOL_TITLE} · {PRACTICE}. Measurements are made on this phone. Check them clinically.</p>
        <p>AstroHEALTH staff: <a className="underline text-teal-800" href={STAFF_SIGN_IN_URL}>sign in to the main app</a>.</p>
      </footer>
    </div>
  );
}
