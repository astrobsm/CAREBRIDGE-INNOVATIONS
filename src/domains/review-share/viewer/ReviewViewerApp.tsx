/**
 * The public review page, /review/<token>: no login, view only.
 *
 * status -> (PIN screen) -> open -> the summary. The summary lives only in
 * this page's memory: nothing is written to storage, and closing the tab
 * forgets it. Every refusal that is about the link itself (unknown, expired,
 * revoked) shows the same message.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { reviewTokenFromPath } from '../route';
import type { ReviewPhoto, ReviewSnapshot } from '../snapshotTypes';
import { createReviewApi, envConfig, ReviewApiError, type ReviewApi, type ReviewShareMeta } from './api';
import SnapshotView, { fmt } from './SnapshotView';
import './viewer.css';

export const VIEWER_TITLE = 'AstroHEALTH — confidential patient review';
export const INVALID_MESSAGE = 'This review link is not available. It may have expired or been withdrawn, or the address may be incomplete. Please ask the doctor who shared it for a new link.';
export const STAFF_SIGN_IN_URL = '/login';

type Screen =
  | { name: 'loading' }
  | { name: 'pin'; message?: string; lockedUntil?: string }
  | { name: 'opening' }
  | { name: 'invalid' }
  | { name: 'error'; message: string }
  | { name: 'summary'; share: ReviewShareMeta; snapshot: ReviewSnapshot; photos: ReviewPhoto[] };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-950 text-white px-4 py-3 text-sm font-semibold">AstroHEALTH · Confidential patient review</header>
      <main className="flex-1 flex items-start sm:items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 shadow-sm p-5">{children}</div>
      </main>
      <footer className="p-4 text-center text-xs text-gray-500">
        <a href={STAFF_SIGN_IN_URL} className="text-indigo-700 underline">AstroHEALTH staff sign in</a>
      </footer>
    </div>
  );
}

function PinScreen({ message, lockedUntil, busy, onSubmit }: { message?: string; lockedUntil?: string; busy: boolean; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, [message]);
  const submit = (e: FormEvent) => { e.preventDefault(); if (/^\d{4}$/.test(pin)) { onSubmit(pin); setPin(''); } };
  const locked = !!lockedUntil && new Date(lockedUntil).getTime() > Date.now();
  return (
    <Shell>
      <form onSubmit={submit} className="space-y-4" data-testid="rv-pin">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><Lock size={22} aria-hidden="true" /></span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Enter the PIN</h1>
            <p className="text-sm text-gray-600">The doctor who shared this record sent you a 4-digit PIN separately.</p>
          </div>
        </div>
        <label className="block">
          <span className="sr-only">4-digit PIN</span>
          <input ref={ref} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric" autoComplete="one-time-code" pattern="\d{4}" maxLength={4} aria-label="4-digit PIN"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-mono text-3xl tracking-[0.5em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="••••" disabled={busy || locked} data-testid="rv-pin-input" />
        </label>
        {message && <p role="alert" className={`rounded-lg p-2.5 text-sm ${locked ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{message}</p>}
        <button type="submit" disabled={busy || locked || pin.length !== 4} className="w-full min-h-[48px] rounded-xl bg-indigo-700 font-semibold text-white disabled:opacity-50" data-testid="rv-pin-submit">
          {busy ? 'Opening…' : 'Open record'}
        </button>
        <p className="text-xs text-gray-500">View only. Five wrong PINs lock the link for 15 minutes.</p>
      </form>
    </Shell>
  );
}

export function InvalidScreen() {
  return (
    <Shell>
      <div className="space-y-3 text-center" data-testid="rv-invalid">
        <span className="mx-auto inline-flex rounded-full bg-gray-100 p-3 text-gray-600"><ShieldAlert size={28} aria-hidden="true" /></span>
        <h1 className="text-lg font-bold text-gray-900">Link not available</h1>
        <p className="text-sm text-gray-600">{INVALID_MESSAGE}</p>
      </div>
    </Shell>
  );
}

export default function ReviewViewerApp({ api: apiProp, pathname }: { api?: ReviewApi; pathname?: string }) {
  const api = useMemo(() => apiProp ?? createReviewApi(envConfig()), [apiProp]);
  const token = reviewTokenFromPath(pathname ?? window.location.pathname);
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [busy, setBusy] = useState(false);

  const open = useCallback(async (pin: string | null) => {
    if (!token) { setScreen({ name: 'invalid' }); return; }
    setBusy(true);
    try {
      const r = await api.open(token, pin);
      if (r.ok) { setScreen({ name: 'summary', share: r.share, snapshot: r.snapshot, photos: r.photos ?? [] }); return; }
      if (r.error === 'invalid') setScreen({ name: 'invalid' });
      else if (r.error === 'locked') setScreen({ name: 'pin', lockedUntil: r.locked_until, message: `Too many wrong PINs. The link is locked until ${fmt(r.locked_until)}. Check the PIN with the doctor who shared it.` });
      else if (r.error === 'wrong_pin') setScreen({ name: 'pin', message: `That PIN is not right. ${r.attempts_left ?? 0} ${r.attempts_left === 1 ? 'try' : 'tries'} left before the link locks for 15 minutes.` });
      else setScreen({ name: 'pin' });
    } catch (e) {
      setScreen({ name: 'error', message: e instanceof ReviewApiError ? e.message : 'Something went wrong. Please try again.' });
    } finally { setBusy(false); }
  }, [api, token]);

  const start = useCallback(async () => {
    if (!token) { setScreen({ name: 'invalid' }); return; }
    setScreen({ name: 'loading' });
    try {
      const s = await api.status(token);
      if (s.expired_or_invalid) setScreen({ name: 'invalid' });
      else if (s.needs_pin) setScreen({ name: 'pin' });
      else { setScreen({ name: 'opening' }); await open(null); }
    } catch (e) {
      setScreen({ name: 'error', message: e instanceof ReviewApiError ? e.message : 'Something went wrong. Please try again.' });
    }
  }, [api, token, open]);

  useEffect(() => { void start(); }, [start]);

  useEffect(() => {
    document.title = screen.name === 'summary' ? `${VIEWER_TITLE}` : VIEWER_TITLE;
  }, [screen.name]);

  if (screen.name === 'summary') return <SnapshotView share={screen.share} snapshot={screen.snapshot} photos={screen.photos} />;
  if (screen.name === 'invalid') return <InvalidScreen />;
  if (screen.name === 'pin') return <PinScreen message={screen.message} lockedUntil={screen.lockedUntil} busy={busy} onSubmit={pin => void open(pin)} />;
  if (screen.name === 'error') {
    return (
      <Shell>
        <div className="space-y-3 text-center" data-testid="rv-error">
          <h1 className="text-lg font-bold text-gray-900">Could not open the record</h1>
          <p className="text-sm text-gray-600">{screen.message}</p>
          <button type="button" onClick={() => void start()} className="w-full min-h-[48px] rounded-xl bg-indigo-700 font-semibold text-white">Try again</button>
        </div>
      </Shell>
    );
  }
  return (
    <Shell>
      <p className="text-center text-sm text-gray-600" role="status" data-testid="rv-loading">Opening the shared record…</p>
    </Shell>
  );
}
