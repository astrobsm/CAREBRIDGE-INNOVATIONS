/**
 * Standalone start-up for /wound-tool, loaded by src/main.tsx instead of the
 * EMR (src/bootEmr.tsx).
 *
 * Deliberately does none of the EMR's start-up: no AuthProvider (so no
 * Supabase session restore), no cloud sync, no demo-data seeding, no
 * notification or reminder services. The service worker is still registered
 * by vite-plugin-pwa's script in index.html, so the page works offline after
 * the first visit.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import WoundToolApp, { TOOL_TITLE } from './WoundToolApp';
import '../../../index.css';

class ToolErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[WoundTool] Crashed:', error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>{TOOL_TITLE}</h1>
        <p style={{ margin: '12px 0' }}>Something went wrong on this screen. Your saved records are still on this phone.</p>
        <button
          type="button"
          onClick={() => { window.location.hash = ''; window.location.reload(); }}
          style={{ minHeight: 48, padding: '0 16px', borderRadius: 12, background: '#115e59', color: '#fff', fontWeight: 600 }}
        >
          Reload
        </button>
      </div>
    );
  }
}

/** Point "Add to home screen" at the tool, not at the EMR's start page. */
function applyToolManifest() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) link.href = '/wound-tool.webmanifest';
  const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (appleTitle) appleTitle.content = 'Wound Measure';
  document.title = TOOL_TITLE;
}

applyToolManifest();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToolErrorBoundary>
      <WoundToolApp />
      <Toaster position="top-center" />
    </ToolErrorBoundary>
  </React.StrictMode>,
);
