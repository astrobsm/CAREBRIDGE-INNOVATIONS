/**
 * Renders a validated scale from its definition.
 *
 * Every item shows where its answer comes from. This is not decoration: a
 * clinician filling in POSAS needs to see that thickness and pliability are
 * palpation items they must actually perform, and that the patient scale is
 * the patient's answer rather than their impression of it. A form that hid the
 * distinction would quietly turn a validated instrument into guesswork.
 *
 * Items marked `image_assisted` may be *prefilled* from measurement, shown as a
 * suggestion the clinician can accept or change. The stored value is always the
 * clinician's, never the suggestion.
 */

import React from 'react';
import { Camera, Hand, User, AlertTriangle, Info } from 'lucide-react';
import type { ScaleDefinition, ScaleItem, ScaleItemSource } from '../data/scales';
import { scoreScale } from '../data/scales';

const SOURCE_META: Record<ScaleItemSource, { Icon: typeof Camera; label: string; className: string }> = {
  image_assisted: {
    Icon: Camera, label: 'From photograph — confirm',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  clinician: {
    Icon: Hand, label: 'Examination required',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  patient: {
    Icon: User, label: 'Patient’s own answer',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

interface Props {
  scale: ScaleDefinition;
  responses: Record<string, number>;
  onChange: (responses: Record<string, number>) => void;
  /** Values proposed from measurement, shown as suggestions only. */
  suggestions?: Record<string, { value: number; basis: string }>;
  disabled?: boolean;
}

const ScaleForm: React.FC<Props> = ({ scale, responses, onChange, suggestions, disabled }) => {
  const set = (id: string, value: number) => onChange({ ...responses, [id]: value });
  const result = scoreScale(scale, responses);

  if (scale.requiresVerification) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {scale.name} — items not yet verified
            </p>
            <p className="text-sm text-amber-800 mt-1">{scale.verificationNote}</p>
            <p className="text-xs text-amber-700 mt-2">
              The module carries this scale structurally: baseline, follow-up, component scores,
              change from baseline and trend all work once the items are entered. It will not score
              an instrument whose wording has not been confirmed against the source.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bySubscale = scale.subscales
    ? scale.subscales.map(sub => ({
        sub,
        items: scale.items.filter(i => i.subscale === sub.id),
      }))
    : [{ sub: null, items: scale.items }];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {scale.name} <span className="text-gray-400 font-normal">v{scale.version}</span>
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">{scale.citation}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums text-gray-900">
            {result.total ?? '—'}
            {scale.totalRange && (
              <span className="text-sm text-gray-400 font-normal"> / {scale.totalRange[1]}</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {result.incompleteItems.length
              ? `${result.incompleteItems.length} item${result.incompleteItems.length === 1 ? '' : 's'} unanswered`
              : 'complete'}
          </div>
        </div>
      </div>

      {result.incompleteItems.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No total is shown until every item is answered. A partial total is a different quantity,
          and comparing one against a complete total across visits would read a gap in the record
          as clinical change.
        </p>
      )}

      {bySubscale.map(({ sub, items }) => (
        <div key={sub?.id ?? 'all'} className="space-y-3">
          {sub && (
            <div className="flex items-baseline justify-between border-b pb-1">
              <h5 className="text-sm font-medium text-gray-700">{sub.label}</h5>
              <span className="text-sm tabular-nums text-gray-600">
                {result.subscales[sub.id] ?? '—'}
                <span className="text-xs text-gray-400"> / {sub.range[1]}</span>
              </span>
            </div>
          )}
          {items.map(item => (
            <Item
              key={item.id}
              item={item}
              value={responses[item.id]}
              suggestion={suggestions?.[item.id]}
              onChange={v => set(item.id, v)}
              disabled={disabled}
            />
          ))}
        </div>
      ))}

      {scale.notes?.length ? (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          {scale.notes.map((n, i) => (
            <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />{n}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const Item: React.FC<{
  item: ScaleItem;
  value: number | undefined;
  suggestion?: { value: number; basis: string };
  onChange: (v: number) => void;
  disabled?: boolean;
}> = ({ item, value, suggestion, onChange, disabled }) => {
  const meta = SOURCE_META[item.source];
  const answered = typeof value === 'number';

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <label className="text-sm font-medium text-gray-800">{item.label}</label>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${meta.className}`}>
          <meta.Icon className="w-3 h-3" /> {meta.label}
        </span>
      </div>

      {item.help && <p className="text-xs text-gray-500 mb-2">{item.help}</p>}

      {suggestion && !answered && (
        <button
          type="button"
          onClick={() => onChange(suggestion.value)}
          disabled={disabled}
          className="w-full text-left mb-2 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 hover:bg-sky-100 disabled:opacity-60"
        >
          <span className="text-xs text-sky-900 font-medium">
            Suggested: {suggestion.value} — tap to accept
          </span>
          <span className="block text-[11px] text-sky-700">{suggestion.basis}</span>
        </button>
      )}

      {item.options ? (
        <div className="space-y-1">
          {item.options.map(o => (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-sm transition-colors disabled:opacity-60 ${
                value === o.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
              }`}
            >
              <span className="tabular-nums font-medium mr-2">{o.value}</span>{o.label}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <input
            type="range"
            min={item.min ?? 1}
            max={item.max ?? 10}
            step={1}
            value={value ?? item.min ?? 1}
            disabled={disabled}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
            aria-label={item.label}
          />
          <div className="flex justify-between text-[11px] text-gray-500 mt-0.5">
            <span>{item.min ?? 1} — {item.minLabel}</span>
            <span className={`font-semibold tabular-nums ${answered ? 'text-indigo-700' : 'text-gray-300'}`}>
              {answered ? value : 'not answered'}
            </span>
            <span>{item.maxLabel} — {item.max ?? 10}</span>
          </div>
          {!answered && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.min ?? 1)}
              className="mt-1 text-xs text-indigo-600 hover:underline"
            >
              Record this answer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ScaleForm;
