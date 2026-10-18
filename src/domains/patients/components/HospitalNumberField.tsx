/**
 * The hospital (folder) number, checked as it is typed.
 *
 * As soon as a number is entered it is looked up - on this device and, when
 * online, in the cloud - ignoring case, spaces and punctuation, within the
 * hospital the patient is being registered at. An existing registration is
 * shown with a link to it (or, in quick add, "Use this patient"), and the
 * form is told so it can block saving. Blank is allowed: an auto-number is
 * issued on save.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from 'lucide-react';
import { normalizeHospitalNumber } from '../../../utils/hospitalNumber';
import { checkHospitalNumber, type PatientMatch } from '../services/patientDedupeService';

export type NumberCheck =
  | { state: 'empty' }
  | { state: 'checking' }
  | { state: 'clear'; cloudUnchecked: boolean }
  | { state: 'duplicate'; matches: PatientMatch[] };

/** Whether a check result allows the registration to be saved. */
export const numberCheckBlocks = (c: NumberCheck) => c.state === 'duplicate' || c.state === 'checking';

export function HospitalNumberField({
  value,
  onChange,
  hospitalId,
  onCheck,
  onUseExisting,
  label = 'Hospital Number',
  hint = 'Leave blank to auto-generate',
  labelClassName = 'form-label',
  inputClassName = 'form-input',
}: {
  value: string;
  onChange: (v: string) => void;
  /** The hospital the patient is being registered at: numbers are unique per hospital. */
  hospitalId?: string;
  onCheck?: (c: NumberCheck) => void;
  /** Quick add: carry on with the existing patient instead of opening their record. */
  onUseExisting?: (m: PatientMatch) => void;
  label?: string;
  hint?: string;
  labelClassName?: string;
  inputClassName?: string;
}) {
  const [check, setCheck] = useState<NumberCheck>({ state: 'empty' });
  const seq = useRef(0);
  const onCheckRef = useRef(onCheck);
  onCheckRef.current = onCheck;

  useEffect(() => {
    const report = (c: NumberCheck) => { setCheck(c); onCheckRef.current?.(c); };
    const normalized = normalizeHospitalNumber(value);
    if (!normalized) { report({ state: 'empty' }); return; }
    const mine = ++seq.current;
    report({ state: 'checking' });
    const t = setTimeout(async () => {
      const result = await checkHospitalNumber(normalized, hospitalId);
      if (mine !== seq.current) return; // a newer number was typed meanwhile
      report(result.matches.length
        ? { state: 'duplicate', matches: result.matches }
        : { state: 'clear', cloudUnchecked: result.cloudUnchecked });
    }, 400);
    return () => clearTimeout(t);
  }, [value, hospitalId]);

  const tone = check.state === 'duplicate' ? 'border-red-400 focus:ring-red-400'
    : check.state === 'clear' ? 'border-green-500' : '';
  const shown = normalizeHospitalNumber(value);

  return (
    <div>
      <label htmlFor="reg-hospital-number" className={labelClassName}>{label}</label>
      <input
        id="reg-hospital-number"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Shown in its written form once the person moves on.
        onBlur={() => { if (shown && shown !== value) onChange(shown); }}
        className={`${inputClassName} uppercase ${tone}`}
        placeholder={hint}
        aria-describedby="reg-hospital-number-status"
        aria-invalid={check.state === 'duplicate'}
      />
      <div id="reg-hospital-number-status" className="mt-1 text-xs" role="status" aria-live="polite">
        {check.state === 'empty' && <span className="text-gray-500">{hint}</span>}
        {check.state === 'checking' && (
          <span className="flex items-center gap-1.5 text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking {shown}...</span>
        )}
        {check.state === 'clear' && (
          <span className={`flex items-center gap-1.5 ${check.cloudUnchecked ? 'text-amber-700' : 'text-green-700'}`}>
            {check.cloudUnchecked ? <WifiOff className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {shown} is not registered{check.cloudUnchecked ? ' on this device (offline - checked again when it syncs)' : ''}.
          </span>
        )}
        {check.state === 'duplicate' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-900 text-sm">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {shown} is already registered
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {check.matches.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{m.name || 'Unnamed patient'}</strong> - {m.hospitalNumber}
                    {m.dateOfBirth ? ` - born ${m.dateOfBirth}` : ''}
                  </span>
                  {onUseExisting ? (
                    <button type="button" onClick={() => onUseExisting(m)} className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs hover:bg-red-800">
                      Use this patient
                    </button>
                  ) : (
                    <Link to={`/patients/${m.id}`} className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs hover:bg-red-800">
                      Open existing record
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs">Registration is blocked to prevent a duplicate. If the number was typed wrongly, correct it above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
