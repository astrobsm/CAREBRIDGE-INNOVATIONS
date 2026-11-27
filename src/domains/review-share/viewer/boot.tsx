/**
 * Standalone start-up for /review/<token>, loaded by src/main.tsx instead of
 * the EMR (src/bootEmr.tsx).
 *
 * Does none of the EMR's start-up: no AuthProvider (no Supabase session
 * restore), no supabase-js, no device database, no cloud sync, no demo data,
 * no notification services. It talks to the server only through
 * ./api.ts (two RPCs with plain fetch and the anon key).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import ReviewViewerApp, { VIEWER_TITLE } from './ReviewViewerApp';
import '../../../index.css';

/** Keep the page out of search engines and referrers, and off home screens. */
export function applyReviewPageHead(doc: Document = document) {
  const meta = (name: string, content: string) => {
    let m = doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!m) { m = doc.createElement('meta'); m.name = name; doc.head.appendChild(m); }
    m.content = content;
  };
  meta('robots', 'noindex, nofollow, noarchive');
  meta('referrer', 'no-referrer');
  // index.html carries the manifest link twice (ours and vite-plugin-pwa's).
  doc.querySelectorAll('link[rel="manifest"]').forEach(l => l.remove());
  doc.title = VIEWER_TITLE;
}

class ViewerErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[Review] Crashed:', error.message); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>{VIEWER_TITLE}</h1>
        <p style={{ margin: '12px 0' }}>Something went wrong showing this record.</p>
        <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 48, padding: '0 16px', borderRadius: 12, background: '#312e81', color: '#fff', fontWeight: 600 }}>
          Reload
        </button>
      </div>
    );
  }
}

applyReviewPageHead();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ViewerErrorBoundary>
      <ReviewViewerApp />
    </ViewerErrorBoundary>
  </React.StrictMode>,
);
