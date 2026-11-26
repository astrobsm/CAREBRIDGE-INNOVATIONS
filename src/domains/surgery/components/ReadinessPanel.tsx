/**
 * The readiness checklist for one surgery: what is done, what is missing,
 * what to look at — each line linking to where it is fixed. Used at the top
 * of the Surgical Workflow and in the surgery list.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Readiness, ReadinessItem } from '../journey/readiness';

const ICON = {
  done: <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  missing: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
};

export function ReadinessItemRow({ item, onSection }: { item: ReadinessItem; onSection?: (section: string) => void }) {
  const body = (
    <span className="flex items-start gap-2 min-w-0">
      {ICON[item.status]}
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-800">{item.label}</span>
        {item.detail && <span className="block text-xs text-gray-500 break-words">{item.detail}</span>}
      </span>
    </span>
  );
  if (item.status === 'done' || (!item.link && !item.section)) return <li className="py-1.5">{body}</li>;
  return (
    <li className="py-1.5">
      {item.section && onSection
        ? <button type="button" onClick={() => onSection(item.section!)} className="text-left w-full hover:bg-gray-50 rounded">{body}</button>
        : <Link to={item.link!} className="block hover:bg-gray-50 rounded">{body}</Link>}
    </li>
  );
}

export default function ReadinessPanel({ readiness, title = 'Readiness for theatre', onSection, defaultOpen }: {
  readiness: Readiness | null | undefined;
  title?: string;
  /** Open a Surgical Workflow section instead of following the link. */
  onSection?: (section: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? !readiness?.ready);
  if (!readiness) return null;
  const missing = readiness.items.filter(i => i.status === 'missing').length;
  const warn = readiness.items.filter(i => i.status === 'warning').length;
  return (
    <div className={`rounded-lg border ${readiness.ready ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`} data-testid="readiness-panel">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="flex items-center gap-2 min-w-0">
          {readiness.ready ? ICON.done : ICON.missing}
          <span className="text-sm font-semibold text-gray-900 truncate">{title}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-gray-600 flex-shrink-0">
          {readiness.ready ? 'Ready' : `${missing} missing`}{warn ? ` · ${warn} to check` : ''}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <ul className="px-3 pb-2 divide-y divide-white/60 bg-white/60 rounded-b-lg">
          {readiness.items.map(i => <ReadinessItemRow key={i.id} item={i} onSection={onSection} />)}
        </ul>
      )}
    </div>
  );
}
