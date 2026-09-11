/**
 * A grouped picker that falls back to free text.
 *
 * Structured values are what make a wound registry countable, but a list can
 * never be complete — and if recording something uncommon is harder than
 * recording something common, it gets forced into the nearest wrong option and
 * the data ends up worse than free text would have been. So every list carries
 * `Other`, which reveals a text field, and the typed value is stored exactly as
 * written.
 *
 * A native `<select>` with `<optgroup>` is used deliberately rather than a
 * custom dropdown: on a ward phone it opens the platform's own picker, which
 * scrolls and searches better than anything reimplemented here, and it works
 * with a keyboard, a screen reader and a gloved finger without further effort.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { OTHER_OPTION, isListedOption, type OptionGroup } from '../../data/anatomy';

export interface GroupedSelectProps {
  value: string;
  onChange: (value: string) => void;
  groups: OptionGroup[];
  placeholder?: string;
  /** Placeholder for the free-text field revealed by `Other`. */
  otherPlaceholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function GroupedSelect({
  value,
  onChange,
  groups,
  placeholder = 'Select…',
  otherPlaceholder = 'Describe',
  id,
  required,
  disabled,
}: GroupedSelectProps) {
  // A stored value that is not in the list is something a clinician typed, so
  // it reopens as free text rather than being silently reset to nothing.
  const listed = useMemo(() => isListedOption(value, groups), [value, groups]);
  const [isOther, setIsOther] = useState(Boolean(value) && !listed);

  useEffect(() => {
    if (value && !listed) setIsOther(true);
  }, [value, listed]);

  const handleSelect = (next: string) => {
    if (next === OTHER_OPTION) {
      setIsOther(true);
      // Cleared, so the previous selection is not left standing as if it were
      // the free-text answer.
      onChange('');
      return;
    }
    setIsOther(false);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <select
        id={id}
        required={required}
        disabled={disabled}
        value={isOther ? OTHER_OPTION : value || ''}
        onChange={e => handleSelect(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-50"
      >
        <option value="" disabled>{placeholder}</option>
        {groups.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER_OPTION}>Other — not listed</option>
      </select>

      {isOther && (
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
