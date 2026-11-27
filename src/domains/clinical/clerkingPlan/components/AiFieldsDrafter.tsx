/**
 * "Draft clerking fields with Claude" on a free-text complaint (a condition
 * with no template): uses this device's saved fields for the condition if
 * there are any, otherwise asks Claude (validated, rejected if invalid).
 * Drafts are labelled "AI-drafted fields", can be trimmed and relabelled,
 * and are approved by a clinician.
 */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import type { ComplaintEntry } from '../../clerking/types';
import type { PatientContext } from '../../clerking/engine';
import { approveFields, editFields, fieldsCache, requestDraftFields } from '../aiFields';
import { findCondition } from '../conditions';
import type { AiDraftedFields } from '../types';

export const AiFieldsDrafter: React.FC<{
  entry: ComplaintEntry; ctx: PatientContext; identifiers: string[]; userName: string;
  onChange: (f: AiDraftedFields | undefined) => void;
}> = ({ entry, ctx, identifiers, userName, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const f = entry.aiFields;
  const template = findCondition(entry.label);
  const cached = !f ? fieldsCache.load(entry.label) : null;

  const draft = async () => {
    if (!navigator.onLine) { toast.error('Offline — Claude needs a connection'); return; }
    setBusy(true);
    const r = await requestDraftFields(entry.label, ctx, identifiers);
    setBusy(false);
    if (r.status === 'error') { toast.error(r.message); return; }
    fieldsCache.save(entry.label, r.fields);
    onChange(r.fields);
  };
  const set = (next: AiDraftedFields) => { fieldsCache.save(entry.label, next); onChange(next); };

  if (template) return <p className="text-xs text-blue-800 bg-blue-50 rounded p-2">“{entry.label}” has a condition template: add “{template.label}” from the complaint search to get its fields.</p>;

  if (!f) {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-2 text-xs flex flex-wrap items-center gap-2">
        <span className="text-purple-900">No condition template for “{entry.label}”.</span>
        {cached && <button type="button" onClick={() => onChange(cached)} className="px-2 py-1 rounded border border-purple-500 text-purple-800">Use saved fields ({cached.status === 'approved' ? 'approved' : 'AI-drafted'})</button>}
        <button type="button" disabled={busy} onClick={draft} className="px-2 py-1 rounded bg-purple-700 text-white disabled:opacity-50" data-testid="draft-fields">{busy ? 'Claude is drafting…' : '✨ Draft clerking fields with Claude'}</button>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-purple-300 bg-purple-50 p-2 text-xs space-y-1">
      <p className="font-semibold text-purple-900">AI-drafted fields — {f.status === 'approved' ? `approved by ${f.approvedBy}` : 'check before use'}</p>
      <div className="flex flex-wrap gap-2">
        {f.status !== 'approved' && <button type="button" onClick={() => set(approveFields(f, userName))} className="px-2 py-1 rounded bg-green-600 text-white">Approve fields</button>}
        <button type="button" onClick={() => setEditing(e => !e)} className="px-2 py-1 rounded border border-purple-500 text-purple-800">{editing ? 'Done editing' : 'Edit fields'}</button>
        <button type="button" onClick={() => onChange(undefined)} className="px-2 py-1 rounded border border-red-300 text-red-700">Remove</button>
      </div>
      {editing && f.modules.map(m => (
        <div key={m.id}>
          <p className="font-semibold text-purple-900">{m.title}</p>
          <ul className="space-y-1">{m.questions.map(q => (
            <li key={q.id} className="flex items-center gap-1">
              <input className="flex-1 border rounded px-1.5 py-0.5" defaultValue={q.label} onBlur={e => e.target.value !== q.label && set(editFields(f, { relabel: { id: q.id, label: e.target.value } }))} aria-label="Question label" />
              <button type="button" className="text-red-600 px-1" onClick={() => set(editFields(f, { removeId: q.id }))} aria-label="Remove question">✕</button>
            </li>
          ))}</ul>
        </div>
      ))}
    </div>
  );
};
