/**
 * One encounter-model field, rendered for touch: options as buttons, yes / no
 * as a pair, numbers with their unit, a 0–10 slider for scales.
 *
 * Extracted from StructuredHistory so the guided history and the procedure
 * reviews draw fields with the same component — one renderer for one field
 * model. Flagged options are tinted red / amber before they are chosen, so a
 * clinician sees which answers matter.
 */
import React from 'react';
import { Check } from 'lucide-react';
import type { EncounterAnswers, EncounterField } from '../data/encounterModel';


export const EncounterFieldInput: React.FC<{
  field: EncounterField;
  value: EncounterAnswers[string];
  otherText?: string;
  onChange: (v: EncounterAnswers[string]) => void;
  onOther: (t: string) => void;
}> = ({ field, value, otherText, onChange, onOther }) => {
  const selected = Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : [];

  const toggleMulti = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter(s => s !== option)
      : [...selected, option];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-800">
        {field.label}
        {field.important && <span className="text-indigo-500 ml-1" title="Key field">•</span>}
      </label>
      {field.help && <p className="text-xs text-gray-500 mt-0.5 mb-1.5">{field.help}</p>}

      {(field.kind === 'select' || field.kind === 'multiselect') && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {(field.options ?? []).map(o => {
            const on = selected.includes(o.value);
            const tone = o.flag === 'red'
              ? 'border-red-300 text-red-800'
              : o.flag === 'amber' ? 'border-amber-300 text-amber-800' : 'border-gray-200 text-gray-700';
            const activeTone = o.flag === 'red'
              ? 'bg-red-600 text-white border-red-600'
              : o.flag === 'amber' ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-indigo-600 text-white border-indigo-600';
            return (
              <button
                key={o.value}
                type="button"
                title={o.hint}
                onClick={() => (field.kind === 'multiselect' ? toggleMulti(o.value) : onChange(o.value))}
                className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                  on ? activeTone : `bg-white hover:bg-gray-50 ${tone}`
                }`}
              >
                {on && <Check className="w-3 h-3 inline mr-1" />}
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {field.kind === 'boolean' && (
        <div className="flex gap-1.5 mt-1">
          {[['yes', true], ['no', false]].map(([label, val]) => (
            <button
              key={String(label)}
              type="button"
              onClick={() => onChange(val as boolean)}
              className={`px-4 py-1.5 rounded-lg border text-xs capitalize ${
                value === val
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {field.kind === 'number' && (
        <div className="flex items-center gap-2 mt-1 max-w-xs">
          <input
            type="number"
            value={value == null ? '' : String(value)}
            min={field.min} max={field.max}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          {field.unit && <span className="text-sm text-gray-500 shrink-0">{field.unit}</span>}
        </div>
      )}

      {field.kind === 'scale' && (
        <div className="mt-1 max-w-sm">
          <input
            type="range"
            min={field.min ?? 0} max={field.max ?? 10} step={1}
            value={value == null ? (field.min ?? 0) : Number(value)}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full accent-indigo-600"
            aria-label={field.label}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{field.min ?? 0}</span>
            <span className={`font-semibold ${value == null ? 'text-gray-300' : 'text-indigo-700'}`}>
              {value == null ? 'not recorded' : String(value)}
            </span>
            <span>{field.max ?? 10}</span>
          </div>
        </div>
      )}

      {field.kind === 'date' && (
        <input
          type="date"
          value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value || null)}
          className="mt-1 border rounded-lg px-3 py-2 text-sm"
        />
      )}

      {field.kind === 'text' && (
        <textarea
          value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
        />
      )}

      {field.allowOther && selected.length > 0 && (
        <input
          value={otherText ?? ''}
          onChange={e => onOther(e.target.value)}
          placeholder="Anything the options above do not capture"
          className="w-full mt-1.5 border rounded-lg px-3 py-1.5 text-xs"
        />
      )}
    </div>
  );
};

export default EncounterFieldInput;
