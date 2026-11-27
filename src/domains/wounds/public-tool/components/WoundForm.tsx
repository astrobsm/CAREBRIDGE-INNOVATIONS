import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import GroupedSelect from '../../../../components/common/GroupedSelect';
import { ANATOMICAL_SITES, WOUND_ETIOLOGIES } from '../../../../data/anatomy';
import { getWoundStore } from '../toolDb';
import { looksLikeFullName, ValidationError } from '../store';
import { requestPersistence } from '../deviceStorage';
import type { ToolWound } from '../types';
import { Button, Field, inputClass } from './ui';

/** GroupedSelect is compact for desktop forms; make it thumb-sized here. */
const bigSelect = '[&_select]:min-h-[48px] [&_select]:text-base [&_select]:rounded-xl [&_input]:min-h-[48px] [&_input]:text-base [&_input]:rounded-xl';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function WoundForm({
  existing, onSaved, onCancel,
}: { existing?: ToolWound | null; onSaved: (w: ToolWound) => void; onCancel: () => void }) {
  const [patientLabel, setLabel] = useState(existing?.patientLabel ?? '');
  const [site, setSite] = useState(existing?.site ?? '');
  const [aetiology, setAetiology] = useState(existing?.aetiology ?? '');
  const [dateFirstSeen, setDate] = useState(existing?.dateFirstSeen ?? today());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setLabel(existing.patientLabel); setSite(existing.site);
      setAetiology(existing.aetiology ?? ''); setDate(existing.dateFirstSeen);
    }
  }, [existing]);

  const fullName = looksLikeFullName(patientLabel);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const input = { patientLabel, site, aetiology, dateFirstSeen };
      const store = getWoundStore();
      const wound = existing ? await store.updateWound(existing.id, input) : await store.createWound(input);
      // First save is a good moment to ask the browser to keep the data.
      void requestPersistence();
      onSaved(wound);
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Could not save on this phone. Check storage space.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{existing ? 'Edit wound' : 'New wound'}</h2>

      <Field
        label="Patient label"
        hint="Initials or a bed number, e.g. “AO bed 12”. Not a full name."
      >
        <input
          className={inputClass}
          value={patientLabel}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="e.g. AO bed 12"
          onChange={e => setLabel(e.target.value)}
        />
      </Field>
      {fullName && (
        <p className="flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          This looks like a full name. Please use initials or a bed number instead.
        </p>
      )}

      <Field label="Wound site">
        <div className={bigSelect}>
          <GroupedSelect
          value={site}
          onChange={setSite}
          groups={ANATOMICAL_SITES}
          placeholder="Choose the site…"
          otherPlaceholder="Describe the site"
        />
        </div>
      </Field>

      <Field label="Aetiology (cause)">
        <div className={bigSelect}>
          <GroupedSelect
          value={aetiology}
          onChange={setAetiology}
          groups={WOUND_ETIOLOGIES}
          placeholder="Choose the cause…"
          otherPlaceholder="Describe the cause"
        />
        </div>
      </Field>

      <Field label="Date first seen">
        <input type="date" className={inputClass} value={dateFirstSeen} max={today()} onChange={e => setDate(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{existing ? 'Save' : 'Add wound'}</Button>
      </div>
    </div>
  );
}
