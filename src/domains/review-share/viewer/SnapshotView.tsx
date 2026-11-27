/**
 * The read-only, printable patient summary. Renders the snapshot's generic
 * sections as plain text (React escapes everything; nothing is rendered as
 * HTML) and the photos as an image gallery.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Camera, Printer, X } from 'lucide-react';
import type { ReviewPhoto, ReviewSnapshot, SnapItem, SnapSection } from '../snapshotTypes';
import { photoSrc, type ReviewShareMeta } from './api';

export const fmt = (iso?: string | null, withTime = true) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime && !dateOnly && (d.getHours() || d.getMinutes()) ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

function Item({ item }: { item: SnapItem }) {
  return (
    <article className="rv-item border-t border-gray-100 first:border-t-0 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="font-semibold text-gray-900">{item.title}</h3>
        <p className="text-sm text-gray-500">{[fmt(item.date), item.status].filter(Boolean).join(' · ')}</p>
      </div>
      {item.subtitle && <p className="text-sm text-gray-600">{item.subtitle}</p>}
      {item.lines && item.lines.length > 0 && (
        <ul className="mt-1.5 list-disc pl-5 space-y-0.5 text-sm text-gray-800">
          {item.lines.map((l, i) => <li key={i} className="whitespace-pre-wrap break-words">{l}</li>)}
        </ul>
      )}
      {item.fields && item.fields.length > 0 && (
        <dl className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(9rem,14rem)_1fr] text-sm">
          {item.fields.map((f, i) => (
            <div key={i} className="contents">
              <dt className="text-gray-500 sm:pt-0">{f.label}</dt>
              <dd className="text-gray-900 whitespace-pre-wrap break-words mb-1 sm:mb-0">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.table && item.table.rows.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50"><tr>{item.table.columns.map((c, i) => <th key={i} scope="col" className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">{c}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {item.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2 py-1.5 align-top text-gray-800 whitespace-pre-wrap">{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function Section({ s }: { s: SnapSection }) {
  return (
    <section id={`rv-${s.id}`} className="rv-section rounded-2xl bg-white border border-gray-200 px-4 py-3 sm:px-5" aria-labelledby={`rv-h-${s.id}`}>
      <h2 id={`rv-h-${s.id}`} className="text-base font-bold text-gray-900 flex items-center justify-between gap-2">
        {s.title}
        <span className="text-xs font-medium text-gray-400">{s.items.length || ''}</span>
      </h2>
      {s.note && <p className="text-xs text-gray-500">{s.note}</p>}
      {s.items.length === 0 ? <p className="py-1 text-sm text-gray-400">None recorded.</p> : s.items.map((it, i) => <Item key={i} item={it} />)}
    </section>
  );
}

function Gallery({ photos, summary }: { photos: ReviewPhoto[]; summary: ReviewSnapshot['photos'] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const shown = photos.map(p => ({ p, src: photoSrc(p) })).filter(x => x.src);
  const cur = open !== null ? shown[open] : null;
  return (
    <section id="rv-photos" className="rv-section rounded-2xl bg-white border border-gray-200 px-4 py-3 sm:px-5" aria-labelledby="rv-h-photos">
      <h2 id="rv-h-photos" className="text-base font-bold text-gray-900 flex items-center gap-2"><Camera size={18} aria-hidden="true" /> Clinical photos <span className="text-xs font-medium text-gray-400">{shown.length || ''}</span></h2>
      {summary.note && <p className="mt-1 rounded-lg bg-amber-50 border border-amber-200 p-2 text-sm text-amber-900">{summary.note}</p>}
      {shown.length === 0 ? <p className="py-1 text-sm text-gray-400">No photos in this record.</p> : (
        <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="rv-gallery">
          {shown.map(({ p, src }, i) => (
            <li key={p.seq} className="rv-photo">
              <button type="button" onClick={() => setOpen(i)} className="block w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100" aria-label={`Enlarge photo: ${p.caption || p.source || 'photo'}`}>
                <img src={src!} alt={p.caption || p.source || 'Clinical photo'} className="aspect-square w-full object-cover" loading="lazy" draggable={false} />
              </button>
              <p className="mt-1 text-xs text-gray-800 line-clamp-2">{p.caption || 'Photo'}</p>
              <p className="text-[11px] text-gray-500 line-clamp-2">{[p.source, fmt(p.taken_at ?? undefined)].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}
      {cur && (
        <div role="dialog" aria-modal="true" aria-label="Photo" className="rv-no-print fixed inset-0 z-50 flex flex-col bg-black/90 p-3" onClick={() => setOpen(null)}>
          <div className="flex justify-end"><button type="button" className="rounded-full bg-white/10 p-2 text-white" aria-label="Close photo" onClick={() => setOpen(null)}><X size={22} /></button></div>
          <img src={cur.src!} alt={cur.p.caption || 'Clinical photo'} className="m-auto max-h-[80vh] max-w-full object-contain" onClick={e => e.stopPropagation()} draggable={false} />
          <p className="text-center text-sm text-white/90">{[cur.p.caption, cur.p.source, fmt(cur.p.taken_at ?? undefined)].filter(Boolean).join(' · ')}</p>
        </div>
      )}
    </section>
  );
}

export function ConfidentialBanner({ share }: { share: ReviewShareMeta }) {
  return (
    <div className="rv-banner sticky top-0 z-40 bg-indigo-950 text-white text-xs sm:text-sm px-3 py-2 text-center shadow" role="note" data-testid="rv-banner">
      <strong>Confidential</strong> — shared by {share.shared_by || 'an AstroHEALTH clinician'} for clinical review · view only · link expires {fmt(share.expires_at)}
    </div>
  );
}

export default function SnapshotView({ share, snapshot, photos }: { share: ReviewShareMeta; snapshot: ReviewSnapshot; photos: ReviewPhoto[] }) {
  const a = snapshot.alerts;
  const sections = snapshot.sections ?? [];
  return (
    <div className="min-h-screen bg-gray-50" data-testid="rv-summary">
      <ConfidentialBanner share={share} />
      <main className="mx-auto max-w-5xl p-3 sm:p-6 space-y-4">
        <header className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Patient summary for review</p>
              <h1 className="text-2xl font-bold text-gray-900 break-words">{snapshot.patient.name}</h1>
              <p className="text-gray-600">{snapshot.patient.summary}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="rv-no-print inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Printer size={16} aria-hidden="true" /> Print
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Snapshot of the record as of {fmt(snapshot.snapshotAt || share.snapshot_at)}{share.invitee_name ? ` · for ${share.invitee_name}` : ''}. Later changes to the record are not shown unless the sharing clinician refreshes it.
          </p>
          {snapshot.patient.fields.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
              {snapshot.patient.fields.map((f, i) => (
                <div key={i}><dt className="text-xs text-gray-500">{f.label}</dt><dd className="text-gray-900 break-words">{f.value}</dd></div>
              ))}
            </dl>
          )}
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Alerts">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-red-900"><AlertTriangle size={16} aria-hidden="true" /> Allergies</h2>
            {a.allergies.length ? <ul className="mt-1 text-sm text-red-900 list-disc pl-5">{a.allergies.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-sm text-red-900/70">None recorded</p>}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <h2 className="text-sm font-bold text-amber-900">Comorbidities</h2>
            {a.conditions.length ? <ul className="mt-1 text-sm text-amber-950 list-disc pl-5">{a.conditions.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-sm text-amber-900/70">None recorded</p>}
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
            <h2 className="text-sm font-bold text-sky-900">Medicines on record</h2>
            {a.medicines.length ? <ul className="mt-1 text-sm text-sky-950 list-disc pl-5">{a.medicines.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="mt-1 text-sm text-sky-900/70">None recorded</p>}
          </div>
        </section>

        <nav className="rv-no-print rounded-2xl bg-white border border-gray-200 p-3" aria-label="Sections">
          <ul className="flex flex-wrap gap-2 text-sm">
            {sections.map(s => (
              <li key={s.id}><a href={`#rv-${s.id}`} className={`inline-block rounded-full border px-3 py-1 ${s.items.length ? 'border-gray-300 text-gray-800' : 'border-gray-200 text-gray-400'}`}>{s.title}{s.items.length ? ` (${s.items.length})` : ''}</a></li>
            ))}
            <li><a href="#rv-photos" className="inline-block rounded-full border border-gray-300 px-3 py-1 text-gray-800">Photos ({photos.length})</a></li>
          </ul>
        </nav>

        {sections.map(s => <Section key={s.id} s={s} />)}
        <Gallery photos={photos} summary={snapshot.photos ?? { included: photos.length, total: photos.length, omitted: 0 }} />

        <footer className="pb-8 pt-2 text-center text-xs text-gray-500 space-y-1">
          <p>View-only copy shared from AstroHEALTH for clinical review. Do not forward, download or store it beyond your review.</p>
          <p className="rv-no-print"><a href="/login" className="text-indigo-700 underline">AstroHEALTH staff sign in</a></p>
        </footer>
      </main>
    </div>
  );
}
