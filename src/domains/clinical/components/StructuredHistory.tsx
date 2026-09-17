/**
 * The structured history: pick a complaint, answer the template, get a note.
 *
 * DESIGNED FOR A CLINIC LIST, NOT A FORM
 * Every field costs a minute that the next patient is waiting for, so: the
 * complaint is searchable rather than a long scroll, conditional fields stay
 * hidden until they apply, options are buttons rather than dropdowns wherever
 * there are few enough to tap, and nothing is mandatory. A clinician who is
 * interrupted keeps what they have.
 *
 * The generated note is shown live. That is the part that earns trust: a
 * clinician can see exactly what their taps produce before committing, and
 * stops worrying that structure means a worse letter.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertOctagon, AlertTriangle, Check, ChevronDown, ExternalLink,
  FileText, Search, Stethoscope,
} from 'lucide-react';
import {
  COMPLAINT_GROUPS, OTHER_COMPLAINT, complaintLabel, searchComplaints,
} from '../data/complaints';
import type {
  EncounterAnswers, EncounterField, EncounterTemplate,
} from '../data/encounterModel';
import {
  readTemplate, templateOptions, isVisible, TEMPLATE_VERSION,
} from '../services/templateEngine';

export interface StructuredHistoryValue {
  complaintId: string;
  complaintOther?: string;
  templateId: string;
  answers: EncounterAnswers;
  otherText: Record<string, string>;
}

interface Props {
  value: StructuredHistoryValue | null;
  onChange: (value: StructuredHistoryValue) => void;
  /**
   * Called whenever the generated prose changes, so the page can write it into
   * the existing free-text fields.
   */
  onNarrative?: (n: { chiefComplaint: string; history: string; examination: string }) => void;
}

const EMPTY: StructuredHistoryValue = {
  complaintId: '', templateId: 'generic', answers: {}, otherText: {},
};

const StructuredHistory: React.FC<Props> = ({ value, onChange, onNarrative }) => {
  const v = value ?? EMPTY;
  const [search, setSearch] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showNote, setShowNote] = useState(true);

  const reading = useMemo(() => {
    if (!v.complaintId) return null;
    return readTemplate(v.templateId, v.complaintId, v.answers, {
      complaintOther: v.complaintOther,
      otherText: v.otherText,
    });
  }, [v]);

  // Hand the generated prose up whenever it changes.
  React.useEffect(() => {
    if (reading && onNarrative) onNarrative(reading.narrative);
  }, [reading, onNarrative]);

  const update = (patch: Partial<StructuredHistoryValue>) => onChange({ ...v, ...patch });

  const setAnswer = (fieldId: string, answer: EncounterAnswers[string]) =>
    update({ answers: { ...v.answers, [fieldId]: answer } });

  const pickComplaint = (id: string) => {
    // Changing the complaint changes the template, and answers keyed to the old
    // template's fields would be meaningless against the new one.
    const best = templateOptions(id)[0];
    onChange({
      complaintId: id,
      templateId: best.id,
      answers: {},
      otherText: {},
      complaintOther: id === OTHER_COMPLAINT ? v.complaintOther : undefined,
    });
    setSearch('');
  };

  // ── Complaint not yet chosen ──────────────────────────────────────────────
  if (!v.complaintId) {
    const results = search ? searchComplaints(search) : [];
    return (
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">What is the patient here for?</h3>
        <p className="text-xs text-gray-500 mb-3">
          Choosing the complaint selects the history worth taking for it.
        </p>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search — or pick from the list below"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {search ? (
          <ul className="space-y-1 max-h-72 overflow-y-auto">
            {results.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => pickComplaint(r.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex justify-between"
                >
                  <span className="text-sm text-gray-800">{r.label}</span>
                  <span className="text-xs text-gray-400">{r.group}</span>
                </button>
              </li>
            ))}
            {!results.length && (
              <li className="px-3 py-3 text-sm text-gray-400">
                Nothing matches. Use “Other” below and describe it.
              </li>
            )}
          </ul>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {COMPLAINT_GROUPS.map(g => (
              <div key={g.id}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {g.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.complaints.map(c => (
                    <button
                      key={c.id}
                      onClick={() => pickComplaint(c.id)}
                      title={c.hint}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => pickComplaint(OTHER_COMPLAINT)}
          className="mt-3 text-xs text-indigo-600 hover:underline"
        >
          Something else — describe it in words
        </button>
      </div>
    );
  }

  // ── Complaint chosen ──────────────────────────────────────────────────────
  const template = reading!.template;
  const { flags, completeness: done, narrative, handoffs } = reading!;
  const red = flags.filter(f => f.level === 'red');
  const amber = flags.filter(f => f.level === 'amber');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-gray-500">Presenting complaint</div>
            <div className="text-base font-semibold text-gray-900">
              {v.complaintId === OTHER_COMPLAINT
                ? (v.complaintOther || 'Other')
                : complaintLabel(v.complaintId)}
            </div>
            <button
              onClick={() => onChange({ ...EMPTY })}
              className="text-xs text-indigo-600 hover:underline mt-0.5"
            >
              Change
            </button>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">History</div>
            <div className="text-sm font-medium text-gray-800">{template.name}</div>
            <button
              onClick={() => setShowTemplatePicker(s => !s)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Use a different one
            </button>
          </div>
        </div>

        {v.complaintId === OTHER_COMPLAINT && (
          <input
            value={v.complaintOther ?? ''}
            onChange={e => update({ complaintOther: e.target.value })}
            placeholder="Describe the presenting complaint"
            className="w-full mt-2 border rounded-lg px-3 py-2 text-sm"
          />
        )}

        {showTemplatePicker && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {templateOptions(v.complaintId).map(t => (
              <button
                key={t.id}
                onClick={() => { update({ templateId: t.id, answers: {} }); setShowTemplatePicker(false); }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                  t.id === template.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">{template.summary}</p>
        {template.basis && (
          <p className="text-xs text-gray-400 mt-0.5">Follows: {template.basis}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${done.percent}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 tabular-nums">
            {done.answered}/{done.total} key fields
          </span>
        </div>
      </div>

      {/* Flags — red first, and never collapsed */}
      {red.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 space-y-2">
          {red.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {f.fieldLabel}: {f.answerLabel}
                </p>
                <p className="text-sm text-red-800">{f.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {amber.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
          {amber.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                <span className="font-medium">{f.fieldLabel}: {f.answerLabel}.</span> {f.reason}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {template.sections.map(section => (
        <div key={section.id} className="bg-white rounded-xl border p-4">
          <h4 className="text-sm font-semibold text-gray-800">{section.title}</h4>
          {section.intent && (
            <p className="text-xs text-gray-500 mt-0.5 mb-3">{section.intent}</p>
          )}
          <div className="space-y-4">
            {section.fields.filter(f => isVisible(f, v.answers)).map(field => (
              <Field
                key={field.id}
                field={field}
                value={v.answers[field.id]}
                otherText={v.otherText[field.id]}
                onChange={a => setAnswer(field.id, a)}
                onOther={t => update({ otherText: { ...v.otherText, [field.id]: t } })}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Handoffs */}
      {handoffs.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
          <p className="text-xs font-medium text-sky-900 mb-1.5">
            Measure it properly in the module that owns it
          </p>
          {handoffs.map((h, i) => (
            <a
              key={i} href={`#${h.route}`}
              className="flex items-center gap-1.5 text-sm text-sky-800 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {h.label}
              {h.when && <span className="text-xs text-sky-600">— {h.when}</span>}
            </a>
          ))}
        </div>
      )}

      {/* The generated note */}
      <div className="bg-white rounded-xl border">
        <button
          onClick={() => setShowNote(s => !s)}
          className="w-full flex items-center justify-between gap-2 p-4 text-left"
        >
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" /> The note this produces
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNote ? 'rotate-180' : ''}`} />
        </button>
        {showNote && (
          <div className="px-4 pb-4 space-y-3">
            <Preview label="Chief complaint" text={narrative.chiefComplaint} />
            <Preview label="History of present illness" text={narrative.history} />
            <Preview label="Examination" text={narrative.examination} />
            <p className="text-xs text-gray-400">
              Written into the encounter’s own fields, so the letter, the PDF and the summary read
              exactly as they always have. Template {template.id} v{TEMPLATE_VERSION}.
            </p>
          </div>
        )}
      </div>

      {done.missing.length > 0 && (
        <div className="bg-gray-50 border rounded-xl p-3">
          <p className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" /> Still worth asking
          </p>
          <p className="text-xs text-gray-500">{done.missing.join(' · ')}</p>
          <p className="text-xs text-gray-400 mt-1">
            None of this blocks saving — an interrupted consultation keeps what it has.
          </p>
        </div>
      )}
    </div>
  );
};

const Preview: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div>
    <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-2.5 whitespace-pre-wrap min-h-[2rem]">
      {text || <span className="text-gray-400">Nothing recorded yet.</span>}
    </div>
  </div>
);

// ── One field ───────────────────────────────────────────────────────────────

const Field: React.FC<{
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

export default StructuredHistory;
