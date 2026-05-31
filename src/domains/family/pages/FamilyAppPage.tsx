import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ExternalLink, RefreshCw, AlertCircle, Home as HomeIcon, Radio } from 'lucide-react';

/**
 * Family App (Part C) — AstroHEALTH integration host.
 *
 * The Family App ships as a standalone React (CRA) + Express + Postgres stack
 * under `C:\Users\user\Documents\FAMILY APP2026`.  AstroHEALTH embeds it via
 * an isolated iframe.  Data lives in the `family.*` Postgres schema (see
 * supabase-family-app-migration.sql) so it cannot collide with AstroHEALTH
 * tables.
 *
 * Configuration (vite env, optional):
 *   VITE_FAMILY_APP_URL   — frontend URL  (default http://localhost:3001)
 *   VITE_FAMILY_API_URL   — backend URL   (default http://localhost:5000)
 *
 * The current AstroHEALTH user id is forwarded as `?astrohealth_user_id=...`
 * so the Family App can link parent accounts (column added by the migration).
 */
export default function FamilyAppPage() {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [lastRealtime, setLastRealtime] = useState<{ table: string; event: string; at: number } | null>(null);

  const familyUrl = (import.meta.env.VITE_FAMILY_APP_URL as string | undefined) || 'http://localhost:3001';
  const apiUrl = (import.meta.env.VITE_FAMILY_API_URL as string | undefined) || 'http://localhost:5000';

  const src = (() => {
    const url = new URL(familyUrl);
    if (user?.id) url.searchParams.set('astrohealth_user_id', user.id);
    if (user?.email) url.searchParams.set('astrohealth_email', user.email);
    return url.toString();
  })();

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  // Listen for realtime events the embedded Family App posts up from
  // services/realtimeSync.js so we can show a live indicator.
  useEffect(() => {
    const onMsg = (evt: MessageEvent) => {
      const data = evt.data as { type?: string; table?: string; event?: string } | null;
      if (!data || data.type !== 'family-realtime') return;
      try {
        const origin = new URL(familyUrl).origin;
        if (evt.origin && origin && evt.origin !== origin) return;
      } catch {/* allow */}
      setLastRealtime({ table: data.table || 'unknown', event: data.event || 'change', at: Date.now() });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [familyUrl]);

  // When this device goes online, tell the iframe to drain its sync queue.
  useEffect(() => {
    const onOnline = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'astrohealth-trigger-family-sync' },
        '*'
      );
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const reload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = src + (src.includes('?') ? '&' : '?') + '_=' + Date.now();
      setLoaded(false);
      setErrored(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <HomeIcon size={18} className="text-pink-600" />
          <h1 className="font-semibold text-gray-900 text-sm">Family (Part C)</h1>
          <span className="text-xs text-gray-500 hidden sm:inline">parent / children / chores / payroll / boarding</span>
          {lastRealtime && Date.now() - lastRealtime.at < 4000 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
              <Radio size={10} /> live: {lastRealtime.table}/{lastRealtime.event}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
            title="Reload Family App"
          >
            <RefreshCw size={12} /> Reload
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs px-2 py-1 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"
            title="Open Family App in a new tab"
          >
            <ExternalLink size={12} /> Open in new tab
          </a>
        </div>
      </header>

      <div className="relative flex-1 bg-white">
        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Loading Family App from {familyUrl}…
          </div>
        )}
        {errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-gray-700 px-6 text-center">
            <AlertCircle size={32} className="text-amber-500 mb-2" />
            <div className="font-medium">Could not reach the Family App at {familyUrl}.</div>
            <div className="text-xs text-gray-500 mt-2 max-w-md">
              Make sure the Family backend is running (<code>cd "FAMILY APP2026/backend" &amp;&amp; npm run dev</code>)
              and the frontend dev server is up (<code>cd "FAMILY APP2026/frontend" &amp;&amp; npm start</code>).
              The API should be reachable at <code>{apiUrl}</code>.
            </div>
            <button
              type="button"
              onClick={reload}
              className="mt-3 text-xs px-3 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Retry
            </button>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={src}
          title="Family App (Part C)"
          className="w-full h-full border-0"
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      </div>
    </div>
  );
}
